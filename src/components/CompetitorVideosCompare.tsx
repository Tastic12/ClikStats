'use client'

import { useState } from 'react'
import type { CompetitorVideo } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import type { ViewMode } from './ViewModeToggle'
import { VideoThumbnailLink } from './VideoThumbnailLink'

type CompetitorVideosCompareProps = {
  videos: CompetitorVideo[]
  viewMode: ViewMode
}

export function CompetitorVideosCompare({ videos, viewMode }: CompetitorVideosCompareProps) {
  const [sideBySide, setSideBySide] = useState(true)

  if (videos.length < 2) return null

  const leader = [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0]
  const compareSet = videos.slice(0, 8)

  return (
    <div className="w-full space-y-6">
      <div className="border-l-2 border-[var(--success)] pl-4 py-1">
        <p className="text-xs font-semibold uppercase text-[var(--success)]">Top performer</p>
        <div className="mt-2 flex items-center gap-3">
          {leader.thumbnail_url && (
            <img
              src={leader.thumbnail_url}
              alt=""
              className="h-12 w-20 shrink-0 rounded object-cover ring-2 ring-[var(--success)]"
            />
          )}
          <div className="min-w-0">
            <p className="text-base font-bold text-[var(--foreground)] line-clamp-2">{leader.title}</p>
            <p className="text-sm text-[var(--muted)]">
              {formatCount(leader.view_count || 0)} views · {formatCount(leader.like_count || 0)}{' '}
              likes
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--elevated)]/50 text-left">
              <th className="px-3 py-2 text-xs font-medium text-[var(--muted)]">Video</th>
              <th className="px-3 py-2 text-xs font-medium text-[var(--muted)] text-right">Views</th>
              <th className="px-3 py-2 text-xs font-medium text-[var(--muted)] text-right">Likes</th>
              <th className="px-3 py-2 text-xs font-medium text-[var(--muted)] text-right">
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {compareSet.map((v, i) => (
              <tr key={v.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2.5 max-w-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {i === 0 && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--success)]">
                        #1
                      </span>
                    )}
                    <span className="truncate text-[var(--foreground)]">{v.title}</span>
                  </div>
                  {v.channel_name && (
                    <p className="text-[10px] text-[var(--muted-2)] truncate mt-0.5">
                      {v.channel_name}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(v.view_count || 0)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-2)]">
                  {formatCount(v.like_count || 0)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-2)]">
                  {formatCount(v.comment_count || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-[var(--foreground)]">Compared videos</p>
          <button
            type="button"
            onClick={() => setSideBySide((v) => !v)}
            className="text-xs text-[var(--accent)] hover:underline min-h-11 px-2"
          >
            {sideBySide ? 'Show list view' : 'Compare side by side'}
          </button>
        </div>

        {sideBySide ? (
          <div className="w-full overflow-x-auto">
            <div
              className="grid w-full gap-3 xl:gap-4"
              style={{
                gridTemplateColumns: `repeat(${compareSet.length}, minmax(0, 1fr))`,
                minWidth: compareSet.length > 5 ? `${compareSet.length * 11}rem` : undefined,
              }}
            >
              {compareSet.map((video, index) => (
                <div key={video.id} className="min-w-0 overflow-hidden">
                  {viewMode === 'list' ? (
                    <div className="p-2">
                      <VideoThumbnailLink
                        videoId={video.youtube_video_id}
                        title={video.title}
                        thumbnailUrl={video.thumbnail_url}
                        subtitle={video.channel_name}
                        views={video.view_count}
                        likes={video.like_count}
                        comments={video.comment_count}
                        rank={index + 1}
                        layout="row"
                      />
                    </div>
                  ) : (
                    <VideoThumbnailLink
                      videoId={video.youtube_video_id}
                      title={video.title}
                      thumbnailUrl={video.thumbnail_url}
                      subtitle={video.channel_name}
                      views={video.view_count}
                      likes={video.like_count}
                      comments={video.comment_count}
                      rank={index + 1}
                      layout="card"
                      className="border-0 rounded-none h-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {compareSet.map((video, index) => (
              <VideoThumbnailLink
                key={video.id}
                videoId={video.youtube_video_id}
                title={video.title}
                thumbnailUrl={video.thumbnail_url}
                subtitle={video.channel_name}
                views={video.view_count}
                likes={video.like_count}
                comments={video.comment_count}
                rank={index + 1}
                layout="row"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
