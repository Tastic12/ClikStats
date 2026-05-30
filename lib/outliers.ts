import type { Video, CompetitorChannelVideo, CompetitorVideo, CompetitorChannel } from './supabase'

export type OutlierSource = 'own' | 'competitor_channel' | 'competitor_video'

export type UnifiedOutlierItem = {
  id: string
  youtubeVideoId: string
  title: string
  thumbnailUrl?: string | null
  viewCount: number
  likeCount?: number
  commentCount?: number
  publishedAt?: string | null
  outlierScore: number | null
  outlierVelocityScore?: number | null
  nicheOutlierScore?: number | null
  isShort?: boolean | null
  source: OutlierSource
  sourceLabel: string
}

export function mergeOutlierItems(input: {
  ownVideos?: Video[]
  competitorChannelVideos?: CompetitorChannelVideo[]
  competitorChannels?: CompetitorChannel[]
  standaloneVideos?: CompetitorVideo[]
}): UnifiedOutlierItem[] {
  const channelNameById = new Map(
    (input.competitorChannels ?? []).map((c) => [c.id, c.channel_name])
  )

  const items: UnifiedOutlierItem[] = []

  for (const v of input.ownVideos ?? []) {
    items.push({
      id: `own-${v.id}`,
      youtubeVideoId: v.video_id,
      title: v.title,
      thumbnailUrl: v.thumbnail_url,
      viewCount: v.view_count || 0,
      likeCount: v.like_count,
      commentCount: v.comment_count,
      publishedAt: v.published_at,
      outlierScore: v.outlier_score ?? null,
      outlierVelocityScore: v.outlier_velocity_score ?? null,
      nicheOutlierScore: v.niche_outlier_score ?? null,
      isShort: v.is_short,
      source: 'own',
      sourceLabel: 'Your channel',
    })
  }

  for (const v of input.competitorChannelVideos ?? []) {
    items.push({
      id: `ccv-${v.id}`,
      youtubeVideoId: v.video_id,
      title: v.title,
      thumbnailUrl: v.thumbnail_url,
      viewCount: v.view_count || 0,
      likeCount: v.like_count,
      commentCount: v.comment_count,
      publishedAt: v.published_at,
      outlierScore: v.outlier_score ?? null,
      nicheOutlierScore: v.niche_outlier_score ?? null,
      isShort: v.is_short,
      source: 'competitor_channel',
      sourceLabel: channelNameById.get(v.competitor_channel_id) || 'Competitor',
    })
  }

  for (const v of input.standaloneVideos ?? []) {
    items.push({
      id: `cv-${v.id}`,
      youtubeVideoId: v.youtube_video_id,
      title: v.title,
      thumbnailUrl: v.thumbnail_url,
      viewCount: v.view_count || 0,
      likeCount: v.like_count,
      commentCount: v.comment_count,
      publishedAt: v.published_at,
      outlierScore: v.outlier_score ?? null,
      nicheOutlierScore: v.niche_outlier_score ?? null,
      isShort: v.is_short,
      source: 'competitor_video',
      sourceLabel: v.channel_name || 'Tracked video',
    })
  }

  return items
}

export function sortOutlierItems(
  items: UnifiedOutlierItem[],
  sortBy: 'score' | 'velocity' | 'niche'
): UnifiedOutlierItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'velocity') {
      return (b.outlierVelocityScore ?? 0) - (a.outlierVelocityScore ?? 0)
    }
    if (sortBy === 'niche') {
      return (b.nicheOutlierScore ?? 0) - (a.nicheOutlierScore ?? 0)
    }
    return (b.outlierScore ?? 0) - (a.outlierScore ?? 0)
  })
}

export function filterOutlierItems(
  items: UnifiedOutlierItem[],
  opts: {
    minScore: number
    kind: 'all' | 'long' | 'short'
    hideShorts: boolean
    source?: OutlierSource | 'all'
  }
): UnifiedOutlierItem[] {
  return items
    .filter((v) => v.outlierScore != null && v.outlierScore >= opts.minScore)
    .filter((v) => {
      if (opts.source && opts.source !== 'all' && v.source !== opts.source) return false
      if (opts.kind === 'short') return v.isShort === true
      if (opts.kind === 'long') return v.isShort !== true
      return opts.hideShorts ? v.isShort !== true : true
    })
}

export function topOutliers(items: UnifiedOutlierItem[], limit = 5): UnifiedOutlierItem[] {
  return sortOutlierItems(
    items.filter((v) => v.outlierScore != null && v.outlierScore >= 1.5),
    'score'
  ).slice(0, limit)
}
