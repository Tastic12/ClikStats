import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertDiscoveredVideos } from '../../../../../lib/discover-db'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import {
  DEFAULT_DISCOVER_CATEGORY_IDS,
  fetchTrendingBatch,
} from '../../../../../lib/youtube-discover'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!supabaseUrl || !serviceRoleKey || !youtubeApiKey) {
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

    const rl = await checkRateLimit(user.id, 'discover-sync')
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { data: settings } = await admin
      .from('user_discover_settings')
      .select('region_code, category_ids')
      .eq('user_id', user.id)
      .maybeSingle()

    const regionCode = settings?.region_code ?? 'GB'
    const categoryIds = settings?.category_ids ?? [...DEFAULT_DISCOVER_CATEGORY_IDS]

    const { records, apiCalls, errors } = await fetchTrendingBatch(
      youtubeApiKey,
      regionCode,
      categoryIds
    )

    const saved = await upsertDiscoveredVideos(admin, records)

    return NextResponse.json({
      success: true,
      saved,
      fetched: records.length,
      api_calls: apiCalls,
      region_code: regionCode,
      category_ids: categoryIds,
      errors: errors.length ? errors : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
