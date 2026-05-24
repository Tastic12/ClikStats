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
  size?: 'default' | 'compact'
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
  size = 'default',
  className = '',
}: VideoThumbnailLinkProps) {
  const href = youtubeWatchUrl(videoId)
  const compact = size === 'compact'

  if (layout === 'card') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group overflow-hidden rounded-lg bg-[var(--elevated)]/50 hover:bg-[var(--elevated)] ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-all block ${className}`}
      >
        <div className={`${compact ? 'aspect-[16/10]' : 'aspect-video'} bg-[var(--elevated)] relative`}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">
              No thumbnail
            </div>
          )}
          {rank !== undefined && (
            <span
              className={`absolute top-1 left-1 bg-black/70 text-white font-bold rounded ${
                compact ? 'text-[10px] px-1 py-0' : 'text-xs px-2 py-0.5'
              }`}
            >
              #{rank}
            </span>
          )}
        </div>
        <div className={compact ? 'p-2' : 'p-3'}>
          <p
            className={`font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] ${
              compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
            }`}
          >
            {title}
          </p>
          {subtitle && !compact && <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p>}
          <div
            className={`flex flex-wrap gap-1.5 text-[var(--muted-2)] ${
              compact ? 'mt-1 text-[10px]' : 'mt-2 text-xs'
            }`}
          >
            {views !== undefined && <span>{formatCount(views)} views</span>}
            {likes !== undefined && <span>{formatCount(likes)} likes</span>}
            {comments !== undefined && !compact && <span>{formatCount(comments)} comments</span>}
          </div>
          {!compact && (
            <p className="text-xs text-[var(--accent)] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Watch on YouTube ↗
            </p>
          )}
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex gap-2 rounded-lg hover:bg-[var(--elevated)] transition-colors ${
        compact ? 'p-1' : 'p-2 gap-3'
      } ${className}`}
    >
      {rank !== undefined && (
        <span
          className={`flex-shrink-0 font-semibold text-[var(--muted)] ${
            compact ? 'w-4 text-xs pt-0.5' : 'w-5 text-sm pt-1'
          }`}
        >
          {rank}
        </span>
      )}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className={`object-cover rounded-md flex-shrink-0 bg-[var(--elevated)] ${
            compact ? 'w-16 h-9' : 'w-28 h-16'
          }`}
        />
      ) : (
        <div
          className={`rounded-md bg-[var(--elevated)] flex-shrink-0 ${
            compact ? 'w-16 h-9' : 'w-28 h-16'
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] ${
            compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
          }`}
        >
          {title}
        </p>
        {subtitle && !compact && <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>}
        <div
          className={`flex flex-wrap gap-2 text-[var(--muted-2)] ${
            compact ? 'mt-0.5 text-[10px]' : 'mt-1 text-xs'
          }`}
        >
          {views !== undefined && <span>{formatCount(views)} views</span>}
          {likes !== undefined && <span>{formatCount(likes)} likes</span>}
        </div>
      </div>
    </a>
  )
}
