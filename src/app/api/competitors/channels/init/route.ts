import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchChannelTopVideos, fetchYouTubeChannel } from '../../../../../../lib/youtube-channel'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const body = await request.json()
    const channelInput = (body.channel_url as string) || (body.channelUrl as string)
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

    const topVideos = await fetchChannelTopVideos(youtubeChannelId, youtubeApiKey, 5)
    if (topVideos.length) {
      await admin.from('competitor_channel_videos').insert(
        topVideos.map((v) => ({
          user_id: user.id,
          competitor_channel_id: record.id,
          video_id: v.video_id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          published_at: v.published_at,
          view_count: v.view_count,
          like_count: v.like_count,
          comment_count: v.comment_count,
        }))
      )
    }

    return NextResponse.json({ success: true, channel: record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
