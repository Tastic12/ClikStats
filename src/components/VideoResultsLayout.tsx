'use client'

import type { ViewMode } from './ViewModeToggle'
import { VideoThumbnailLink } from './VideoThumbnailLink'

export type VideoResultItem = {
  id: string
  videoId: string
  title: string
  thumbnailUrl?: string | null
  subtitle?: string
  views?: number
  likes?: number
  comments?: number
}

type VideoResultsLayoutProps = {
  videos: VideoResultItem[]
  viewMode: ViewMode
  compact?: boolean
  maxItems?: number
}

export function VideoResultsLayout({
  videos,
  viewMode,
  compact = false,
  maxItems,
}: VideoResultsLayoutProps) {
  const items = maxItems ? videos.slice(0, maxItems) : videos

  if (!items.length) {
    return <p className="text-xs text-[var(--muted)]">No videos to show.</p>
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-1">
        {items.map((v, i) => (
          <VideoThumbnailLink
            key={v.id}
            videoId={v.videoId}
            title={v.title}
            thumbnailUrl={v.thumbnailUrl}
            subtitle={v.subtitle}
            views={v.views}
            likes={v.likes}
            comments={v.comments}
            rank={i + 1}
            layout="row"
            size={compact ? 'compact' : 'default'}
          />
        ))}
      </div>
    )
  }

  const gridClass = compact
    ? 'grid grid-cols-2 gap-2'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'

  return (
    <div className={gridClass}>
      {items.map((v, i) => (
        <VideoThumbnailLink
          key={v.id}
          videoId={v.videoId}
          title={v.title}
          thumbnailUrl={v.thumbnailUrl}
          subtitle={v.subtitle}
          views={v.views}
          likes={v.likes}
          comments={v.comments}
          rank={i + 1}
          layout="card"
          size={compact ? 'compact' : 'default'}
        />
      ))}
    </div>
  )
}
