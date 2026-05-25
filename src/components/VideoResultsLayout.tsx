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
  outlierScore?: number | null
}

type VideoResultsLayoutProps = {
  videos: VideoResultItem[]
  viewMode: ViewMode
  compact?: boolean
  maxItems?: number
  /** One video per row — used in side-by-side channel columns */
  columnStack?: boolean
}

export function VideoResultsLayout({
  videos,
  viewMode,
  compact = false,
  maxItems,
  columnStack = false,
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
            outlierScore={v.outlierScore}
            layout="row"
            size={compact ? 'compact' : 'default'}
          />
        ))}
      </div>
    )
  }

  if (columnStack) {
    return (
      <div className="flex flex-col gap-3 w-full min-w-0">
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
            outlierScore={v.outlierScore}
            layout="card"
            size="default"
            className="w-full"
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
          outlierScore={v.outlierScore}
          layout="card"
          size={compact ? 'compact' : 'default'}
        />
      ))}
    </div>
  )
}
