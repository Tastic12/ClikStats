import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchChannelVideos,
  fetchYouTubeChannel,
  type ChannelVideoRecord,
} from '../../../../../lib/youtube-channel'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const body = await request.json()
    const channelInput =
      (body.channel_url as string) ||
      (body.channelUrl as string) ||
      (body.channel_id as string) ||
      (body.channelId as string)

    if (!channelInput?.trim()) {
      return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const youtubeApiKey = process.env.YOUTUBE_API_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    if (!youtubeApiKey) {
      return NextResponse.json({ error: 'YouTube API key not configured on server' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure profile row exists (signup may not have created it)
    await admin.from('users').upsert(
      { id: user.id, email: user.email! },
      { onConflict: 'id', ignoreDuplicates: false }
    )

    const { channel, youtubeChannelId, channelUrl } = await fetchYouTubeChannel(
      channelInput.trim(),
      youtubeApiKey
    )

    const { data: channelRecord, error: channelError } = await admin
      .from('channels')
      .upsert(
        {
          user_id: user.id,
          channel_id: youtubeChannelId,
          channel_name: channel.snippet.title,
          channel_url: channelUrl,
          description: channel.snippet.description,
          thumbnail_url:
            channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
          subscriber_count: parseInt(channel.statistics.subscriberCount, 10) || 0,
          video_count: parseInt(channel.statistics.videoCount, 10) || 0,
          view_count: parseInt(channel.statistics.viewCount, 10) || 0,
        },
        { onConflict: 'channel_id' }
      )
      .select()
      .single()

    if (channelError) {
      console.error('channel upsert error', channelError)
      if (channelError.code === '23505') {
        return NextResponse.json(
          { error: 'This channel is already tracked by another account.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to save channel' }, { status: 500 })
    }

    await admin.from('channel_metrics').insert({
      channel_id: channelRecord.id,
      subscriber_count: parseInt(channel.statistics.subscriberCount, 10) || 0,
      video_count: parseInt(channel.statistics.videoCount, 10) || 0,
      view_count: parseInt(channel.statistics.viewCount, 10) || 0,
    })

    const videoRecords = await fetchChannelVideos(youtubeChannelId, youtubeApiKey)
    if (videoRecords.length > 0) {
      const { data: insertedVideos } = await admin
        .from('videos')
        .upsert(
          videoRecords.map((v: ChannelVideoRecord) => ({
            user_id: user.id,
            channel_id: channelRecord.id,
            ...v,
          })),
          { onConflict: 'video_id' }
        )
        .select()

      if (insertedVideos?.length) {
        await admin.from('video_metrics').insert(
          insertedVideos.map((video) => ({
            video_id: video.id,
            view_count: video.view_count,
            like_count: video.like_count,
            comment_count: video.comment_count,
          }))
        )
      }
    }

    return NextResponse.json({
      success: true,
      channel: channelRecord,
      message: 'Channel connected successfully',
    })
  } catch (error) {
    console.error('init channel error', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
