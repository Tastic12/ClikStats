import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchChannelVideos, fetchYouTubeChannel } from '../../../../../../lib/youtube-channel'
import { checkRateLimit } from '../../../../../../lib/rate-limit'

// Matches the window used by the init route so refreshed channels score
// against the same kind of baseline.
const COMPETITOR_BASELINE_WINDOW = 30

// Larger competitor lists could blow past Vercel's hobby tier 10s function
// limit. Bump this if you hit a timeout.
export const maxDuration = 60

type RefreshSummary = {
  channelId: string
  channelName: string
  status: 'ok' | 'error'
  videos?: number
  error?: string
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!supabaseUrl || !serviceRoleKey || !youtubeApiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimit(user.id, 'competitors-refresh')
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    // Optional ?channel_id=... filter for refreshing a single competitor.
    const body = await request.json().catch(() => ({}))
    const singleChannelId = (body?.channel_id as string) || null

    let channelsQuery = admin
      .from('competitor_channels')
      .select('id, youtube_channel_id, channel_name')
      .eq('user_id', user.id)
    if (singleChannelId) {
      channelsQuery = channelsQuery.eq('id', singleChannelId)
    }

    const { data: channels, error: channelsError } = await channelsQuery
    if (channelsError) {
      return NextResponse.json({ error: 'Failed to load competitor channels' }, { status: 500 })
    }
    if (!channels?.length) {
      return NextResponse.json({ success: true, refreshed: 0, results: [] })
    }

    const results: RefreshSummary[] = []

    for (const ch of channels) {
      try {
        // Pull fresh channel stats so subs/views/video_count stay accurate.
        const fresh = await fetchYouTubeChannel(ch.youtube_channel_id, youtubeApiKey)
        await admin
          .from('competitor_channels')
          .update({
            channel_name: fresh.channel.snippet.title,
            description: fresh.channel.snippet.description,
            thumbnail_url:
              fresh.channel.snippet.thumbnails.high?.url ||
              fresh.channel.snippet.thumbnails.medium?.url,
            subscriber_count: parseInt(fresh.channel.statistics.subscriberCount, 10) || 0,
            video_count: parseInt(fresh.channel.statistics.videoCount, 10) || 0,
            view_count: parseInt(fresh.channel.statistics.viewCount, 10) || 0,
          })
          .eq('id', ch.id)

        const recent = await fetchChannelVideos(
          ch.youtube_channel_id,
          youtubeApiKey,
          COMPETITOR_BASELINE_WINDOW
        )

        await admin
          .from('competitor_channel_videos')
          .delete()
          .eq('competitor_channel_id', ch.id)

        if (recent.length) {
          await admin.from('competitor_channel_videos').insert(
            recent.map((v) => ({
              user_id: user.id,
              competitor_channel_id: ch.id,
              video_id: v.video_id,
              title: v.title,
              thumbnail_url: v.thumbnail_url,
              published_at: v.published_at,
              duration: v.duration,
              view_count: v.view_count,
              like_count: v.like_count,
              comment_count: v.comment_count,
            }))
          )

          await admin.rpc('recompute_competitor_outlier_scores', {
            channel_uuid: ch.id,
          })
        }

        results.push({
          channelId: ch.id,
          channelName: ch.channel_name,
          status: 'ok',
          videos: recent.length,
        })
      } catch (err) {
        results.push({
          channelId: ch.id,
          channelName: ch.channel_name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const ok = results.filter((r) => r.status === 'ok').length
    return NextResponse.json({
      success: true,
      refreshed: ok,
      total: results.length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
