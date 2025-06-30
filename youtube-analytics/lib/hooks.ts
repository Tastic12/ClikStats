import useSWR from 'swr'
import { supabase } from './supabase'
import type { Channel, Video, ChannelMetric, VideoMetric } from './supabase'

// Hook for fetching user's channels
export function useChannels() {
  const { data, error, mutate } = useSWR<Channel[]>('channels', async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  })
  
  return {
    channels: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

// Hook for fetching channel metrics
export function useChannelMetrics(channelId?: string) {
  const { data, error } = useSWR<ChannelMetric[]>(
    channelId ? ['channel_metrics', channelId] : null,
    async () => {
      if (!channelId) return []
      const { data, error } = await supabase
        .from('channel_metrics')
        .select('*')
        .eq('channel_id', channelId)
        .order('recorded_at', { ascending: false })
        .limit(30) // Last 30 data points
      
      if (error) throw error
      return data || []
    }
  )
  
  return {
    metrics: data,
    isLoading: !error && !data,
    isError: error
  }
}

// Hook for fetching user's videos
export function useVideos(channelId?: string) {
  const { data, error, mutate } = useSWR<Video[]>(
    channelId ? ['videos', 'channel', channelId] : 'videos',
    async () => {
      let query = supabase.from('videos').select('*')
      
      if (channelId) {
        query = query.eq('channel_id', channelId)
      }
      
      const { data, error } = await query.order('published_at', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  )
  
  return {
    videos: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

// Hook for fetching video metrics
export function useVideoMetrics(videoId?: string) {
  const { data, error } = useSWR<VideoMetric[]>(
    videoId ? ['video_metrics', videoId] : null,
    async () => {
      if (!videoId) return []
      const { data, error } = await supabase
        .from('video_metrics')
        .select('*')
        .eq('video_id', videoId)
        .order('recorded_at', { ascending: false })
        .limit(30) // Last 30 data points
      
      if (error) throw error
      return data || []
    }
  )
  
  return {
    metrics: data,
    isLoading: !error && !data,
    isError: error
  }
}

// Hook for dashboard summary data
export function useDashboardData() {
  const { channels } = useChannels()
  const { videos } = useVideos()
  
  // Get top performing videos (by view count)
  const topVideos = videos?.slice().sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
  
  // Calculate total metrics across all channels
  const totalMetrics = channels?.reduce((acc, channel) => ({
    subscribers: acc.subscribers + (channel.subscriber_count || 0),
    views: acc.views + (channel.view_count || 0),
    videos: acc.videos + (channel.video_count || 0)
  }), { subscribers: 0, views: 0, videos: 0 })
  
  return {
    channels,
    videos,
    topVideos,
    totalMetrics,
    isLoading: !channels || !videos
  }
}

// Utility function to call edge functions
export async function callEdgeFunction(functionName: string, payload: any) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Edge function call failed')
  }
  
  return result
}

// Utility function to extract YouTube channel ID from URL
export function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

// Utility function to extract YouTube video ID from URL
export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
} 