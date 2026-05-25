import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embeddingToPgvectorText } from '../../../../../lib/embeddings'

export const maxDuration = 30

/**
 * "Find similar to" search. Looks up the stored embedding for the given
 * YouTube video and runs a vector search using it as the query — no need to
 * re-embed since the source is already in the index. Drops the source
 * video itself from the results so the first result isn't always itself.
 */
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
    const sourceVideoId = (body?.youtube_video_id as string | undefined)?.trim()
    const matchCount = Math.min(Math.max(Number(body?.match_count) || 24, 4), 60)

    if (!sourceVideoId) {
      return NextResponse.json({ error: 'youtube_video_id is required' }, { status: 400 })
    }

    // Pull the source thumbnail's embedding so we can use it as the query.
    const { data: source, error: sourceError } = await admin
      .from('thumbnail_embeddings')
      .select('embedding')
      .eq('youtube_video_id', sourceVideoId)
      .maybeSingle()

    if (sourceError) {
      return NextResponse.json(
        { error: `Lookup failed: ${sourceError.message}` },
        { status: 500 }
      )
    }
    if (!source?.embedding) {
      return NextResponse.json(
        { error: 'No embedding for that video yet — try indexing it first.' },
        { status: 404 }
      )
    }

    // Supabase returns the vector as either a string or a number array depending
    // on the column type the JS client infers. Normalise both shapes to the
    // pgvector "[…]" text form we pass into search_thumbnails.
    let queryText: string
    if (typeof source.embedding === 'string') {
      queryText = source.embedding.startsWith('[')
        ? source.embedding
        : `[${source.embedding}]`
    } else if (Array.isArray(source.embedding)) {
      queryText = embeddingToPgvectorText(source.embedding as number[])
    } else {
      return NextResponse.json(
        { error: 'Stored embedding has an unexpected shape.' },
        { status: 500 }
      )
    }

    // Request 1 extra so we still get matchCount after dropping the source itself.
    const { data, error } = await admin.rpc('search_thumbnails', {
      user_uuid: user.id,
      query_embedding: queryText,
      match_count: matchCount + 1,
    })

    if (error) {
      return NextResponse.json({ error: `Search failed: ${error.message}` }, { status: 500 })
    }

    const filtered = ((data || []) as Array<{ youtube_video_id: string }>).filter(
      (r) => r.youtube_video_id !== sourceVideoId
    )

    return NextResponse.json({
      success: true,
      source_video_id: sourceVideoId,
      results: filtered.slice(0, matchCount),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
