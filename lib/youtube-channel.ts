import { pickThumbnailFromYoutube } from './thumbnail-meta'

/** Parse a YouTube channel URL into a lookup key for the Data API. */
export function parseChannelInput(input: string): {
  kind: 'id' | 'handle' | 'username' | 'legacy'
  value: string
} | null {
  const trimmed = input.trim()

  const patterns: Array<{ kind: 'id' | 'handle' | 'username' | 'legacy'; regex: RegExp }> = [
    { kind: 'id', regex: /youtube\.com\/channel\/(UC[\w-]+)/i },
    { kind: 'handle', regex: /youtube\.com\/@([\w.-]+)/i },
    { kind: 'legacy', regex: /youtube\.com\/c\/([\w.-]+)/i },
    { kind: 'username', regex: /youtube\.com\/user\/([\w.-]+)/i },
  ]

  for (const { kind, regex } of patterns) {
    const match = trimmed.match(regex)
    if (match) return { kind, value: match[1] }
  }

  if (/^UC[\w-]{20,}$/i.test(trimmed)) {
    return { kind: 'id', value: trimmed }
  }

  if (trimmed.startsWith('@')) {
    return { kind: 'handle', value: trimmed.slice(1) }
  }

  return null
}

type YouTubeChannelItem = {
  id: string
  snippet: {
    title: string
    description: string
    thumbnails: { high?: { url: string }; medium?: { url: string } }
  }
  statistics: {
    subscriberCount: string
    videoCount: string
    viewCount: string
  }
}

export async function fetchYouTubeChannel(
  input: string,
  apiKey: string
): Promise<{ channel: YouTubeChannelItem; youtubeChannelId: string; channelUrl: string }> {
  const parsed = parseChannelInput(input)
  if (!parsed) {
    throw new Error(
      'Invalid channel URL. Use a /channel/UC…, /@handle, /c/, or /user/ link.'
    )
  }

  let apiUrl: string
  switch (parsed.kind) {
    case 'id':
      apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(parsed.value)}&key=${apiKey}`
      break
    case 'handle':
      apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`
      break
    case 'username':
      apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${encodeURIComponent(parsed.value)}&key=${apiKey}`
      break
    case 'legacy':
      apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`
      break
  }

  const res = await fetch(apiUrl)
  const data = await res.json()

  if (!res.ok) {
    const message = data?.error?.message || 'YouTube API request failed'
    throw new Error(message)
  }

  const channel = data?.items?.[0] as YouTubeChannelItem | undefined
  if (!channel) {
    throw new Error('Channel not found. Check the URL and try again.')
  }

  const youtubeChannelId = channel.id
  const channelUrl =
    parsed.kind === 'handle'
      ? `https://www.youtube.com/@${parsed.value}`
      : `https://www.youtube.com/channel/${youtubeChannelId}`

  return { channel, youtubeChannelId, channelUrl }
}

export type ChannelVideoRecord = {
  video_id: string
  title: string
  description: string
  thumbnail_url?: string
  thumbnail_width?: number | null
  thumbnail_height?: number | null
  published_at: string
  duration?: string
  view_count: number
  like_count: number
  comment_count: number
}

async function getUploadsPlaylistId(youtubeChannelId: string, apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(youtubeChannelId)}&key=${apiKey}`
  )
  const data = await res.json()
  if (!res.ok) return null
  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null
}

type VideoDetailItem = {
  id: string
  contentDetails?: { duration?: string }
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
  snippet?: {
    title?: string
    description?: string
    publishedAt?: string
    thumbnails?: {
      high?: { url: string; width?: number; height?: number }
      medium?: { url: string; width?: number; height?: number }
      standard?: { url: string; width?: number; height?: number }
      maxres?: { url: string; width?: number; height?: number }
    }
  }
}

async function fetchVideoDetailsByIds(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, VideoDetailItem>> {
  const map = new Map<string, VideoDetailItem>()
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50).join(',')
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${chunk}&key=${apiKey}`
    )
    const data = await res.json()
    if (!res.ok) continue
    for (const item of (data.items || []) as VideoDetailItem[]) {
      map.set(item.id, item)
    }
  }
  return map
}

/** Fetch all (or up to maxVideos) uploads from a channel via the uploads playlist. */
export async function fetchChannelVideos(
  youtubeChannelId: string,
  apiKey: string,
  maxVideos = 500
): Promise<ChannelVideoRecord[]> {
  const uploadsPlaylistId = await getUploadsPlaylistId(youtubeChannelId, apiKey)

  if (uploadsPlaylistId) {
    type PlaylistItem = {
      snippet: {
        resourceId: { videoId: string }
        title: string
        description?: string
        publishedAt: string
        thumbnails?: {
      high?: { url: string; width?: number; height?: number }
      medium?: { url: string; width?: number; height?: number }
      standard?: { url: string; width?: number; height?: number }
      maxres?: { url: string; width?: number; height?: number }
    }
      }
    }

    const playlistItems: PlaylistItem[] = []
    let pageToken: string | undefined

    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('playlistId', uploadsPlaylistId)
      url.searchParams.set('maxResults', '50')
      url.searchParams.set('key', apiKey)
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const res = await fetch(url.toString())
      const data = await res.json()
      if (!res.ok || !data?.items?.length) break

      playlistItems.push(...data.items)
      pageToken = data.nextPageToken as string | undefined
    } while (pageToken && playlistItems.length < maxVideos)

    const capped = playlistItems.slice(0, maxVideos)
    const videoIds = capped
      .map((item) => item.snippet.resourceId.videoId)
      .filter(Boolean)

    if (!videoIds.length) return []

    const detailsMap = await fetchVideoDetailsByIds(videoIds, apiKey)

    return capped.map((item) => {
      const videoId = item.snippet.resourceId.videoId
      const details = detailsMap.get(videoId)
      const picked = pickThumbnailFromYoutube(
        item.snippet.thumbnails ?? details?.snippet?.thumbnails
      )
      return {
        video_id: videoId,
        title: item.snippet.title,
        description: item.snippet.description || details?.snippet?.description || '',
        thumbnail_url: picked.url,
        thumbnail_width: picked.width,
        thumbnail_height: picked.height,
        published_at: item.snippet.publishedAt,
        duration: details?.contentDetails?.duration,
        view_count: details?.statistics?.viewCount
          ? parseInt(details.statistics.viewCount, 10)
          : 0,
        like_count: details?.statistics?.likeCount
          ? parseInt(details.statistics.likeCount, 10)
          : 0,
        comment_count: details?.statistics?.commentCount
          ? parseInt(details.statistics.commentCount, 10)
          : 0,
      }
    })
  }

  return fetchChannelVideosViaSearch(youtubeChannelId, apiKey, maxVideos)
}

async function fetchChannelVideosViaSearch(
  youtubeChannelId: string,
  apiKey: string,
  maxVideos: number
): Promise<ChannelVideoRecord[]> {
  const searchItems: Array<{ id: { videoId: string }; snippet: Record<string, unknown> }> = []
  let pageToken: string | undefined

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('channelId', youtubeChannelId)
    url.searchParams.set('type', 'video')
    url.searchParams.set('order', 'date')
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('key', apiKey)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const searchRes = await fetch(url.toString())
    const searchData = await searchRes.json()
    if (!searchRes.ok || !searchData?.items?.length) break

    searchItems.push(...searchData.items)
    pageToken = searchData.nextPageToken as string | undefined
  } while (pageToken && searchItems.length < maxVideos)

  const capped = searchItems.slice(0, maxVideos)
  if (!capped.length) return []

  const videoIds = capped.map((v) => v.id.videoId)
  const detailsMap = await fetchVideoDetailsByIds(videoIds, apiKey)
  const detailItems = videoIds
    .map((id) => detailsMap.get(id))
    .filter((d): d is VideoDetailItem => !!d)

  return mapSearchResultsToVideos(capped, detailItems)
}

export async function fetchChannelTopVideos(
  youtubeChannelId: string,
  apiKey: string,
  maxResults = 5
): Promise<ChannelVideoRecord[]> {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeChannelId}&type=video&order=viewCount&maxResults=${maxResults}&key=${apiKey}`
  const searchRes = await fetch(searchUrl)
  const searchData = await searchRes.json()
  if (!searchRes.ok || !searchData?.items?.length) return []

  const videoIds = searchData.items.map((v: { id: { videoId: string } }) => v.id.videoId).join(',')
  const detailsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`
  )
  const detailsData = await detailsRes.json()
  return mapSearchResultsToVideos(searchData.items, detailsData.items)
}

function mapSearchResultsToVideos(
  searchItems: Array<{ id: { videoId: string }; snippet: Record<string, unknown> }>,
  detailItems: Array<{
    id: string
    contentDetails?: { duration?: string }
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
    snippet?: { thumbnails?: { high?: { url: string }; medium?: { url: string } } }
  }>
) {
  return searchItems.map((video: { id: { videoId: string }; snippet: Record<string, unknown> }) => {
    const details = detailItems?.find((d) => d.id === video.id.videoId)
    const picked = pickThumbnailFromYoutube(
      (video.snippet.thumbnails as Parameters<typeof pickThumbnailFromYoutube>[0]) ??
        details?.snippet?.thumbnails
    )
    return {
      video_id: video.id.videoId,
      title: video.snippet.title as string,
      description: (video.snippet.description as string) || '',
      thumbnail_url: picked.url,
      thumbnail_width: picked.width,
      thumbnail_height: picked.height,
      published_at: video.snippet.publishedAt as string,
      duration: details?.contentDetails?.duration as string | undefined,
      view_count: details?.statistics?.viewCount ? parseInt(details.statistics.viewCount, 10) : 0,
      like_count: details?.statistics?.likeCount ? parseInt(details.statistics.likeCount, 10) : 0,
      comment_count: details?.statistics?.commentCount
        ? parseInt(details.statistics.commentCount, 10)
        : 0,
    }
  })
}

export function parseVideoInput(input: string): string | null {
  const trimmed = input.trim()
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/i,
    /youtu\.be\/([\w-]+)/i,
    /youtube\.com\/embed\/([\w-]+)/i,
    /youtube\.com\/shorts\/([\w-]+)/i,
  ]
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) return match[1]
  }
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  return null
}

export async function fetchYouTubeVideo(videoId: string, apiKey: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'YouTube API request failed')
  const item = data?.items?.[0]
  if (!item) throw new Error('Video not found')

  const thumbs = item.snippet.thumbnails as {
    high?: { url: string; width?: number; height?: number }
    medium?: { url: string; width?: number; height?: number }
  }
  const high = thumbs?.high
  const medium = thumbs?.medium
  const thumb = high || medium
  return {
    youtube_video_id: item.id as string,
    title: item.snippet.title as string,
    channel_name: item.snippet.channelTitle as string,
    thumbnail_url: thumb?.url,
    thumbnail_width: thumb?.width ?? null,
    thumbnail_height: thumb?.height ?? null,
    published_at: item.snippet.publishedAt as string,
    duration: item.contentDetails?.duration as string | undefined,
    view_count: parseInt(item.statistics.viewCount, 10) || 0,
    like_count: parseInt(item.statistics.likeCount, 10) || 0,
    comment_count: parseInt(item.statistics.commentCount, 10) || 0,
  }
}
