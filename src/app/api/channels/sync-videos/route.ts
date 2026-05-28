import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchChannelVideos } from '../../../../../lib/youtube-channel'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { logYoutubeApiUsage } from '../../../../../lib/admin'

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

    const rl = await checkRateLimit(user.id, 'sync-videos')
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { data: channelRecord, error: channelError } = await admin
      .from('channels')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (channelError || !channelRecord) {
      return NextResponse.json({ error: 'No connected channel found' }, { status: 404 })
    }

    const videoRecords = await fetchChannelVideos(channelRecord.channel_id, youtubeApiKey)

    if (!videoRecords.length) {
      return NextResponse.json({ success: true, synced: 0, message: 'No videos returned from YouTube' })
    }

    const playlistPages = Math.ceil(videoRecords.length / 50)
    const videoDetailCalls = Math.ceil(videoRecords.length / 50)
    await logYoutubeApiUsage(admin, {
      userId: user.id,
      endpoint: 'channels/sync-videos',
      units: 1 + playlistPages + videoDetailCalls + 1,
    })

    const { data: upserted, error: upsertError } = await admin
      .from('videos')
      .upsert(
        videoRecords.map((v) => ({
          user_id: user.id,
          channel_id: channelRecord.id,
          ...v,
        })),
        { onConflict: 'video_id' }
      )
      .select()

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to save videos' }, { status: 500 })
    }

    const { error: scoreError } = await admin.rpc('recompute_outlier_scores', {
      channel_uuid: channelRecord.id,
    })
    if (scoreError) {
      console.error('recompute_outlier_scores failed:', scoreError)
    }

    const { error: nicheError } = await admin.rpc('recompute_niche_outlier_scores', {
      user_uuid: user.id,
    })
    if (nicheError) {
      console.error('recompute_niche_outlier_scores failed:', nicheError)
    }

    const ytChannel = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelRecord.channel_id}&key=${youtubeApiKey}`
    ).then((r) => r.json())
    const stats = ytChannel?.items?.[0]?.statistics
    if (stats) {
      await admin
        .from('channels')
        .update({
          subscriber_count: parseInt(stats.subscriberCount, 10) || 0,
          video_count: parseInt(stats.videoCount, 10) || 0,
          view_count: parseInt(stats.viewCount, 10) || 0,
        })
        .eq('id', channelRecord.id)
    }

    return NextResponse.json({
      success: true,
      synced: upserted?.length ?? videoRecords.length,
      totalOnYouTube: parseInt(stats?.videoCount || '0', 10) || videoRecords.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
