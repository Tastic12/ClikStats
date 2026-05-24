'use client'

import type { CompetitorVideo } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import type { ViewMode } from './ViewModeToggle'
import { VideoThumbnailLink } from './VideoThumbnailLink'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

type CompetitorVideosCompareProps = {
  videos: CompetitorVideo[]
  viewMode: ViewMode
}

export function CompetitorVideosCompare({ videos, viewMode }: CompetitorVideosCompareProps) {
  if (videos.length < 2) return null

  const leader = [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0]
  const compareSet = videos.slice(0, 8)
  const displaySet = compareSet.slice(0, Math.min(compareSet.length, 8))
  const columnCount = displaySet.length

  const chartData = compareSet.map((v) => ({
    name: v.title.length > 10 ? v.title.slice(0, 10) + '…' : v.title,
    Views: v.view_count || 0,
    Likes: v.like_count || 0,
    Comments: v.comment_count || 0,
  }))

  return (
    <div className="w-full space-y-6">
      <div className="rounded-lg border border-[var(--success)]/50 bg-[var(--elevated)] px-4 py-3">
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
              {formatCount(leader.view_count || 0)} views · {formatCount(leader.like_count || 0)} likes
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <p className="text-sm font-medium text-[var(--foreground)] mb-3">Metrics comparison</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              contentStyle={{
                background: '#121212',
                border: '1px solid #333',
                borderRadius: 8,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            <Bar dataKey="Views" fill="#4361ee" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Likes" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Comments" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full">
        <p className="text-sm font-medium text-[var(--foreground)] mb-3">
          Compared videos ({columnCount})
        </p>
        <div className="w-full overflow-x-auto">
          <div
            className="grid w-full gap-3 xl:gap-4"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              minWidth: columnCount > 5 ? `${columnCount * 11}rem` : undefined,
            }}
          >
            {displaySet.map((video, index) => (
              <div
                key={video.id}
                className="min-w-0 border border-[var(--border)] rounded-lg bg-[var(--elevated)]/50 overflow-hidden"
              >
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
      </div>
    </div>
  )
}
