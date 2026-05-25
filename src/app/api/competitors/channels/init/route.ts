import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchChannelVideos, fetchYouTubeChannel } from '../../../../../../lib/youtube-channel'
import { checkRateLimit } from '../../../../../../lib/rate-limit'

// How many recent uploads to fetch per competitor. Big enough to give a stable
// median, small enough to keep YouTube API quota usage low (~3 units).
const COMPETITOR_BASELINE_WINDOW = 30

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const body = await request.json()
    const channelInput = (body.channel_url as string) || (body.channelUrl as string)
    const groupId = (body.group_id as string) || null
    if (!channelInput?.trim()) {
      return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })
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

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimit(user.id, 'competitors-init')
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { channel, youtubeChannelId, channelUrl } = await fetchYouTubeChannel(
      channelInput.trim(),
      youtubeApiKey
    )

    const { data: record, error } = await admin
      .from('competitor_channels')
      .upsert(
        {
          user_id: user.id,
          youtube_channel_id: youtubeChannelId,
          channel_name: channel.snippet.title,
          channel_url: channelUrl,
          description: channel.snippet.description,
          thumbnail_url:
            channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
          subscriber_count: parseInt(channel.statistics.subscriberCount, 10) || 0,
          video_count: parseInt(channel.statistics.videoCount, 10) || 0,
          view_count: parseInt(channel.statistics.viewCount, 10) || 0,
          ...(groupId ? { group_id: groupId } : {}),
        },
        { onConflict: 'user_id,youtube_channel_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save competitor channel' }, { status: 500 })
    }

    await admin
      .from('competitor_channel_videos')
      .delete()
      .eq('competitor_channel_id', record.id)

    // Fetch recent uploads so we have a real distribution to baseline against.
    // The "top videos" display now simply picks the top N by view_count from
    // these recent uploads — far more actionable than all-time hits from years
    // ago, and ~30x cheaper on YouTube API quota than search.list.
    const recentVideos = await fetchChannelVideos(
      youtubeChannelId,
      youtubeApiKey,
      COMPETITOR_BASELINE_WINDOW
    )

    if (recentVideos.length) {
      await admin.from('competitor_channel_videos').insert(
        recentVideos.map((v) => ({
          user_id: user.id,
          competitor_channel_id: record.id,
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

      const { error: scoreError } = await admin.rpc(
        'recompute_competitor_outlier_scores',
        { channel_uuid: record.id }
      )
      if (scoreError) {
        console.error('recompute_competitor_outlier_scores failed:', scoreError)
      }
    }

    return NextResponse.json({ success: true, channel: record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
