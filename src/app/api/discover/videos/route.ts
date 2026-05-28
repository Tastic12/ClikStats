import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_DISCOVER_CATEGORY_IDS } from '../../../../../lib/youtube-discover'

export async function GET(request: Request) {
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

    const url = new URL(request.url)
    const categoryFilter = url.searchParams.get('category_id')
    const longFormOnly = url.searchParams.get('long_form_only') === '1'
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 12), 200)

    const { data: settings } = await admin
      .from('user_discover_settings')
      .select('region_code, category_ids')
      .eq('user_id', user.id)
      .maybeSingle()

    const regionCode = settings?.region_code ?? 'GB'
    const categoryIds = settings?.category_ids ?? [...DEFAULT_DISCOVER_CATEGORY_IDS]

    let query = admin
      .from('discovered_videos')
      .select(
        'id, video_id, title, thumbnail_url, thumbnail_width, thumbnail_height, channel_id, channel_name, category_id, region_code, published_at, view_count, like_count, is_short, last_seen_at'
      )
      .eq('region_code', regionCode)
      .in('category_id', categoryIds)
      .order('view_count', { ascending: false })
      .limit(500)

    if (categoryFilter) {
      query = query.eq('category_id', Number(categoryFilter))
    }
    if (longFormOnly) {
      query = query.eq('is_short', false)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Same video can appear in multiple category rows — keep highest view count.
    const byVideo = new Map<string, NonNullable<typeof data>[number]>()
    for (const row of data ?? []) {
      const existing = byVideo.get(row.video_id)
      if (!existing || (row.view_count ?? 0) > (existing.view_count ?? 0)) {
        byVideo.set(row.video_id, row)
      }
    }

    const deduped = [...byVideo.values()]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, limit)

    const totalRows = data?.length ?? 0

    return NextResponse.json({
      videos: deduped,
      region_code: regionCode,
      category_ids: categoryIds,
      stats: {
        rows_in_db: totalRows,
        unique_videos: byVideo.size,
        showing: deduped.length,
        shorts_in_pool: (data ?? []).filter((r) => r.is_short === true).length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
