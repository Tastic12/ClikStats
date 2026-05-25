import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embedText, embeddingToPgvectorText } from '../../../../../lib/embeddings'

export const maxDuration = 30

type SearchResultRow = {
  youtube_video_id: string
  thumbnail_url: string
  similarity: number
  title: string | null
  view_count: number | null
  published_at: string | null
  outlier_score: number | null
  is_short: boolean | null
  source: 'own' | 'competitor' | 'unknown'
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

    const body = await request.json().catch(() => ({}))
    const query = (body?.query as string | undefined)?.trim()
    const matchCount = Math.min(Math.max(Number(body?.match_count) || 24, 4), 60)

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const vec = await embedText(query)
    const { data, error } = await admin.rpc('search_thumbnails', {
      user_uuid: user.id,
      query_embedding: embeddingToPgvectorText(vec),
      match_count: matchCount,
    })

    if (error) {
      return NextResponse.json(
        { error: `Search failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      query,
      results: (data || []) as SearchResultRow[],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
