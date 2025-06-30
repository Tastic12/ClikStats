import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      description: string
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
      }
    }
    statistics: {
      subscriberCount: string
      videoCount: string
      viewCount: string
    }
  }>
}

interface YouTubeVideoResponse {
  items: Array<{
    id: {
      videoId: string
    }
    snippet: {
      title: string
      description: string
      publishedAt: string
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
      }
    }
  }>
}

interface YouTubeVideoDetailsResponse {
  items: Array<{
    id: string
    contentDetails: {
      duration: string
    }
    statistics: {
      viewCount: string
      likeCount: string
      commentCount: string
    }
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { channel_id } = await req.json()
    if (!channel_id) {
      return new Response(
        JSON.stringify({ error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch channel information from YouTube API
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channel_id}&key=${youtubeApiKey}`
    )
    const channelData: YouTubeChannelResponse = await channelResponse.json()

    if (!channelData.items || channelData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Channel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const channel = channelData.items[0]
    const channelUrl = `https://www.youtube.com/channel/${channel_id}`

    // Insert or update channel in database
    const { data: channelRecord, error: channelError } = await supabaseClient
      .from('channels')
      .upsert({
        user_id: user.id,
        channel_id: channel_id,
        channel_name: channel.snippet.title,
        channel_url: channelUrl,
        description: channel.snippet.description,
        thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
        subscriber_count: parseInt(channel.statistics.subscriberCount),
        video_count: parseInt(channel.statistics.videoCount),
        view_count: parseInt(channel.statistics.viewCount),
      })
      .select()
      .single()

    if (channelError) {
      console.error('Error inserting channel:', channelError)
      return new Response(
        JSON.stringify({ error: 'Failed to save channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert initial channel metrics
    const { error: metricsError } = await supabaseClient
      .from('channel_metrics')
      .insert({
        channel_id: channelRecord.id,
        subscriber_count: parseInt(channel.statistics.subscriberCount),
        video_count: parseInt(channel.statistics.videoCount),
        view_count: parseInt(channel.statistics.viewCount),
      })

    if (metricsError) {
      console.error('Error inserting channel metrics:', metricsError)
    }

    // Fetch latest 10 videos from the channel
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel_id}&type=video&order=date&maxResults=10&key=${youtubeApiKey}`
    )
    const videosData: YouTubeVideoResponse = await videosResponse.json()

    if (videosData.items && videosData.items.length > 0) {
      const videoIds = videosData.items.map(video => video.id.videoId).join(',')
      
      // Fetch video details (statistics and duration)
      const videoDetailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${youtubeApiKey}`
      )
      const videoDetailsData: YouTubeVideoDetailsResponse = await videoDetailsResponse.json()

      // Prepare video records for insertion
      const videoRecords = videosData.items.map((video, index) => {
        const details = videoDetailsData.items.find(detail => detail.id === video.id.videoId)
        return {
          user_id: user.id,
          channel_id: channelRecord.id,
          video_id: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
          published_at: video.snippet.publishedAt,
          duration: details?.contentDetails.duration,
          view_count: details?.statistics.viewCount ? parseInt(details.statistics.viewCount) : 0,
          like_count: details?.statistics.likeCount ? parseInt(details.statistics.likeCount) : 0,
          comment_count: details?.statistics.commentCount ? parseInt(details.statistics.commentCount) : 0,
        }
      })

      // Insert videos
      const { data: insertedVideos, error: videosError } = await supabaseClient
        .from('videos')
        .upsert(videoRecords)
        .select()

      if (videosError) {
        console.error('Error inserting videos:', videosError)
      } else if (insertedVideos) {
        // Insert initial video metrics
        const videoMetrics = insertedVideos.map(video => ({
          video_id: video.id,
          view_count: video.view_count,
          like_count: video.like_count,
          comment_count: video.comment_count,
        }))

        const { error: videoMetricsError } = await supabaseClient
          .from('video_metrics')
          .insert(videoMetrics)

        if (videoMetricsError) {
          console.error('Error inserting video metrics:', videoMetricsError)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        channel: channelRecord,
        message: 'Channel initialized successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in init-channel function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 