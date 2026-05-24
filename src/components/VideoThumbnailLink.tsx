'use client'

import { youtubeWatchUrl } from '@/lib/youtube'
import { formatCount } from '@/lib/format'

type VideoThumbnailLinkProps = {
  videoId: string
  title: string
  thumbnailUrl?: string | null
  subtitle?: string
  views?: number
  likes?: number
  comments?: number
  rank?: number
  layout?: 'row' | 'card'
  className?: string
}

export function VideoThumbnailLink({
  videoId,
  title,
  thumbnailUrl,
  subtitle,
  views,
  likes,
  comments,
  rank,
  layout = 'row',
  className = '',
}: VideoThumbnailLinkProps) {
  const href = youtubeWatchUrl(videoId)

  if (layout === 'card') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group cs-card overflow-hidden hover:border-[var(--accent)] transition-colors block ${className}`}
      >
        <div className="aspect-video bg-[var(--elevated)] relative">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-sm">
              No thumbnail
            </div>
          )}
          {rank !== undefined && (
            <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded">
              #{rank}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--accent)]">
            {title}
          </p>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted-2)]">
            {views !== undefined && <span>{formatCount(views)} views</span>}
            {likes !== undefined && <span>{formatCount(likes)} likes</span>}
            {comments !== undefined && <span>{formatCount(comments)} comments</span>}
          </div>
          <p className="text-xs text-[var(--accent)] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Watch on YouTube ↗
          </p>
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex gap-3 p-2 rounded-lg hover:bg-[var(--elevated)] transition-colors ${className}`}
    >
      {rank !== undefined && (
        <span className="flex-shrink-0 w-5 text-sm font-semibold text-[var(--muted)] pt-1">
          {rank}
        </span>
      )}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-28 h-16 object-cover rounded-md flex-shrink-0 bg-[var(--elevated)]"
        />
      ) : (
        <div className="w-28 h-16 rounded-md bg-[var(--elevated)] flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--accent)]">
          {title}
        </p>
        {subtitle && <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>}
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted-2)]">
          {views !== undefined && <span>{formatCount(views)} views</span>}
          {likes !== undefined && <span>{formatCount(likes)} likes</span>}
        </div>
      </div>
    </a>
  )
}
