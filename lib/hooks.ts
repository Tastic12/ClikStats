import useSWR from 'swr'
import { supabase } from './supabase'
import type {
  Channel,
  Video,
  ChannelMetric,
  VideoMetric,
  User,
  CompetitorChannel,
  CompetitorChannelGroup,
  CompetitorChannelVideo,
  CompetitorVideo,
  CompetitorVideoGroup,
} from './supabase'
import { parseChannelInput } from './youtube-channel'

export function useUserProfile() {
  const { data, error, mutate } = useSWR<User | null>('user-profile', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error
    return data
  })

  const updateDisplayName = async (displayName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const trimmed = displayName.trim()
    if (!trimmed) throw new Error('Profile name cannot be empty')

    const { data, error } = await supabase
      .from('users')
      .update({ display_name: trimmed })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    await mutate(data, false)
    return data
  }

  return {
    profile: data,
    isLoading: !error && data === undefined,
    isError: error,
    updateDisplayName,
    mutate,
  }
}

export function getTopVideos(videos: Video[] | undefined, limit = 5) {
  if (!videos?.length) return []
  return [...videos]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, limit)
}

export function getLatestVideo(videos: Video[] | undefined) {
  if (!videos?.length) return null
  return [...videos].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  )[0]
}

/** Build chart series when historical video_metrics are sparse */
export function buildVideoChartMetrics(
  video: Video,
  historical?: VideoMetric[]
): VideoMetric[] {
  if (historical && historical.length >= 2) {
    return [...historical].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
  }
  const now = new Date().toISOString()
  const published = video.published_at || now
  return [
    {
      id: 'snap-start',
      video_id: video.id,
      view_count: Math.max(0, Math.floor((video.view_count || 0) * 0.85)),
      like_count: Math.max(0, Math.floor((video.like_count || 0) * 0.85)),
      comment_count: Math.max(0, Math.floor((video.comment_count || 0) * 0.85)),
      recorded_at: published,
    },
    {
      id: 'snap-now',
      video_id: video.id,
      view_count: video.view_count || 0,
      like_count: video.like_count || 0,
      comment_count: video.comment_count || 0,
      recorded_at: now,
    },
  ]
}

// Hook for fetching user's channels
export function useChannels() {
  const { data, error, mutate } = useSWR<Channel[]>('channels', async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
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

export function useOwnedChannel() {
  const { channels, isLoading, isError, mutate } = useChannels()
  return {
    channel: channels?.[0] ?? null,
    isLoading,
    isError,
    mutate,
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

/** Connect a YouTube channel via the Next.js API (uses Vercel env keys). */
export async function initChannel(channelUrl: string) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Not authenticated. Please sign in again.')
  }

  let response: Response
  try {
    response = await fetch('/api/channels/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ channel_url: channelUrl.trim() }),
    })
  } catch {
    throw new Error(
      'Could not reach the server. Check your connection and try again.'
    )
  }

  const text = await response.text()
  let result: { error?: string; success?: boolean }
  try {
    result = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(
      response.status === 404
        ? 'Channel API not found. Redeploy the latest app version.'
        : `Server error (${response.status}). Try again shortly.`
    )
  }

  if (!response.ok) {
    throw new Error(result.error || 'Failed to connect channel')
  }

  return result
}

/** @deprecated Use initChannel() — edge functions optional */
export async function callEdgeFunction(functionName: string, payload: Record<string, unknown>) {
  if (functionName === 'init-channel') {
    const url =
      (payload.channel_url as string) ||
      (payload.channelUrl as string) ||
      ''
    return initChannel(url)
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl) throw new Error('Supabase URL not configured')

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey ?? '',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Edge function call failed')
  return result
}

// Utility function to extract YouTube channel ID from URL (legacy helper)
export function extractChannelId(url: string): string | null {
  const parsed = parseChannelInput(url)
  return parsed?.value ?? null
}

export { parseChannelInput, parseVideoInput } from './youtube-channel'

export function useCompetitorChannels() {
  const { data, error, mutate } = useSWR<CompetitorChannel[]>('competitor-channels', async () => {
    const { data, error } = await supabase
      .from('competitor_channels')
      .select('*')
      .order('subscriber_count', { ascending: false })
    if (error) throw error
    return data || []
  })
  return { channels: data, isLoading: !error && !data, isError: error, mutate }
}

export function useCompetitorChannelGroups() {
  const { data, error, mutate } = useSWR<CompetitorChannelGroup[]>(
    'competitor-channel-groups',
    async () => {
      const { data, error } = await supabase
        .from('competitor_channel_groups')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    }
  )

  const createGroup = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('competitor_channel_groups')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single()
    if (error) throw error
    await mutate()
    return data
  }

  return { groups: data, isLoading: !error && !data, isError: error, mutate, createGroup }
}

export function useCompetitorVideoGroups() {
  const { data, error, mutate } = useSWR<CompetitorVideoGroup[]>(
    'competitor-video-groups',
    async () => {
      const { data, error } = await supabase
        .from('competitor_video_groups')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    }
  )

  const createGroup = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('competitor_video_groups')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single()
    if (error) throw error
    await mutate()
    return data
  }

  return { groups: data, isLoading: !error && !data, isError: error, mutate, createGroup }
}

export function useCompetitorChannelVideos(competitorChannelId?: string) {
  const { data, error, mutate } = useSWR<CompetitorChannelVideo[]>(
    competitorChannelId ? ['competitor-channel-videos', competitorChannelId] : null,
    async () => {
      if (!competitorChannelId) return []
      const { data, error } = await supabase
        .from('competitor_channel_videos')
        .select('*')
        .eq('competitor_channel_id', competitorChannelId)
        .order('view_count', { ascending: false })
      if (error) throw error
      return data || []
    }
  )
  return { videos: data, isLoading: !error && !data, isError: error, mutate }
}

export function useCompetitorChannelVideosBatch(channelIds: string[]) {
  const key =
    channelIds.length > 0
      ? ['competitor-channel-videos-batch', ...[...channelIds].sort()]
      : null

  const { data, error, isLoading } = useSWR<CompetitorChannelVideo[]>(key, async () => {
    if (!channelIds.length) return []
    const { data, error } = await supabase
      .from('competitor_channel_videos')
      .select('*')
      .in('competitor_channel_id', channelIds)
      .order('view_count', { ascending: false })
    if (error) throw error
    return data || []
  })

  const byChannel: Record<string, CompetitorChannelVideo[]> = {}
  for (const id of channelIds) {
    byChannel[id] = []
  }
  for (const v of data || []) {
    if (!byChannel[v.competitor_channel_id]) byChannel[v.competitor_channel_id] = []
    byChannel[v.competitor_channel_id].push(v)
  }

  return { videos: data, videosByChannel: byChannel, isLoading: !!key && isLoading, isError: error }
}

export function useCompetitorVideos() {
  const { data, error, mutate } = useSWR<CompetitorVideo[]>('competitor-videos', async () => {
    const { data, error } = await supabase
      .from('competitor_videos')
      .select('*')
      .order('view_count', { ascending: false })
    if (error) throw error
    return data || []
  })
  return { videos: data, isLoading: !error && !data, isError: error, mutate }
}

async function postAuthedApi(path: string, body: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let result: { error?: string }
  try {
    result = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Server error (${response.status})`)
  }
  if (!response.ok) throw new Error(result.error || 'Request failed')
  return result
}

export function initCompetitorChannel(channelUrl: string, groupId?: string | null) {
  const body: Record<string, string> = { channel_url: channelUrl.trim() }
  if (groupId) body.group_id = groupId
  return postAuthedApi('/api/competitors/channels/init', body)
}

export function initCompetitorVideo(videoUrl: string, groupId?: string | null) {
  const body: Record<string, string> = { video_url: videoUrl.trim() }
  if (groupId) body.group_id = groupId
  return postAuthedApi('/api/competitors/videos/init', body)
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