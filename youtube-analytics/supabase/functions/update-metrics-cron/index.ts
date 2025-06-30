import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string
    statistics: {
      subscriberCount: string
      videoCount: string
      viewCount: string
    }
  }>
}

interface YouTubeVideoDetailsResponse {
  items: Array<{
    id: string
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
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all channels to update
    const { data: channels, error: channelsError } = await supabaseClient
      .from('channels')
      .select('id, channel_id')

    if (channelsError) {
      console.error('Error fetching channels:', channelsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch channels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updatedChannels = 0
    let updatedVideos = 0

    // Update channel metrics
    for (const channel of channels || []) {
      try {
        // Fetch updated channel statistics
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel.channel_id}&key=${youtubeApiKey}`
        )
        const channelData: YouTubeChannelResponse = await channelResponse.json()

        if (channelData.items && channelData.items.length > 0) {
          const stats = channelData.items[0].statistics

          // Update channel record
          const { error: updateError } = await supabaseClient
            .from('channels')
            .update({
              subscriber_count: parseInt(stats.subscriberCount),
              video_count: parseInt(stats.videoCount),
              view_count: parseInt(stats.viewCount),
            })
            .eq('id', channel.id)

          if (updateError) {
            console.error(`Error updating channel ${channel.id}:`, updateError)
            continue
          }

          // Insert new channel metrics record
          const { error: metricsError } = await supabaseClient
            .from('channel_metrics')
            .insert({
              channel_id: channel.id,
              subscriber_count: parseInt(stats.subscriberCount),
              video_count: parseInt(stats.videoCount),
              view_count: parseInt(stats.viewCount),
            })

          if (metricsError) {
            console.error(`Error inserting channel metrics for ${channel.id}:`, metricsError)
          } else {
            updatedChannels++
          }
        }
      } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error)
      }
    }

    // Get all videos to update (limit to recent videos to avoid API quota issues)
    const { data: videos, error: videosError } = await supabaseClient
      .from('videos')
      .select('id, video_id')
      .order('created_at', { ascending: false })
      .limit(100) // Limit to recent 100 videos per run

    if (videosError) {
      console.error('Error fetching videos:', videosError)
    } else if (videos && videos.length > 0) {
      // Batch video IDs for API call (YouTube API allows up to 50 IDs per request)
      const batchSize = 50
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize)
        const videoIds = batch.map(video => video.video_id).join(',')

        try {
          // Fetch updated video statistics
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${youtubeApiKey}`
          )
          const videoData: YouTubeVideoDetailsResponse = await videoResponse.json()

          if (videoData.items && videoData.items.length > 0) {
            for (const videoStats of videoData.items) {
              const video = batch.find(v => v.video_id === videoStats.id)
              if (!video) continue

              // Update video record
              const { error: updateError } = await supabaseClient
                .from('videos')
                .update({
                  view_count: parseInt(videoStats.statistics.viewCount || '0'),
                  like_count: parseInt(videoStats.statistics.likeCount || '0'),
                  comment_count: parseInt(videoStats.statistics.commentCount || '0'),
                })
                .eq('id', video.id)

              if (updateError) {
                console.error(`Error updating video ${video.id}:`, updateError)
                continue
              }

              // Insert new video metrics record
              const { error: metricsError } = await supabaseClient
                .from('video_metrics')
                .insert({
                  video_id: video.id,
                  view_count: parseInt(videoStats.statistics.viewCount || '0'),
                  like_count: parseInt(videoStats.statistics.likeCount || '0'),
                  comment_count: parseInt(videoStats.statistics.commentCount || '0'),
                })

              if (metricsError) {
                console.error(`Error inserting video metrics for ${video.id}:`, metricsError)
              } else {
                updatedVideos++
              }
            }
          }
        } catch (error) {
          console.error(`Error processing video batch:`, error)
        }

        // Add delay between batches to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Metrics updated successfully',
        updatedChannels,
        updatedVideos,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in update-metrics-cron function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 