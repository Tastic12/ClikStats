import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embedImageFromUrl, embeddingToPgvectorText } from '../../../../../lib/embeddings'

// Vercel allows up to 60s on Pro / 300s with maxDuration. We process ~25
// thumbnails per call so each request finishes well inside the budget even
// when there's a cold start.
export const maxDuration = 60
const BATCH_SIZE = 25

type EmbedResult = {
  videoId: string
  status: 'ok' | 'skipped' | 'error'
  error?: string
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pending, error: pendingError } = await admin.rpc(
      'pending_thumbnail_embeddings',
      { user_uuid: user.id, batch_size: BATCH_SIZE }
    )

    if (pendingError) {
      return NextResponse.json(
        { error: `Failed to fetch pending thumbnails: ${pendingError.message}` },
        { status: 500 }
      )
    }

    type Pending = { youtube_video_id: string; thumbnail_url: string }
    const queue = (pending || []) as Pending[]

    if (!queue.length) {
      const { data: remainingCount } = await admin.rpc(
        'pending_thumbnail_embeddings_count',
        { user_uuid: user.id }
      )
      return NextResponse.json({
        success: true,
        processed: 0,
        remaining: typeof remainingCount === 'number' ? remainingCount : 0,
        results: [],
      })
    }

    const results: EmbedResult[] = []
    const inserts: Array<{
      youtube_video_id: string
      thumbnail_url: string
      embedding: string
    }> = []

    for (const item of queue) {
      try {
        const vec = await embedImageFromUrl(item.thumbnail_url)
        if (vec.length !== 512) {
          throw new Error(`Unexpected embedding length: ${vec.length}`)
        }
        inserts.push({
          youtube_video_id: item.youtube_video_id,
          thumbnail_url: item.thumbnail_url,
          embedding: embeddingToPgvectorText(vec),
        })
        results.push({ videoId: item.youtube_video_id, status: 'ok' })
      } catch (err) {
        results.push({
          videoId: item.youtube_video_id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    if (inserts.length) {
      const { error: insertError } = await admin
        .from('thumbnail_embeddings')
        .upsert(inserts, { onConflict: 'youtube_video_id' })
      if (insertError) {
        return NextResponse.json(
          { error: `Failed to save embeddings: ${insertError.message}`, results },
          { status: 500 }
        )
      }
    }

    const { data: remainingCount } = await admin.rpc(
      'pending_thumbnail_embeddings_count',
      { user_uuid: user.id }
    )

    return NextResponse.json({
      success: true,
      processed: inserts.length,
      remaining: typeof remainingCount === 'number' ? remainingCount : 0,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
