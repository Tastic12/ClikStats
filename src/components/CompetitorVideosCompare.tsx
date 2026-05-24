'use client'

import type { CompetitorVideo } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import type { ViewMode } from './ViewModeToggle'
import { VideoResultsLayout } from './VideoResultsLayout'
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

  const chartData = compareSet.map((v) => ({
    name: v.title.length > 10 ? v.title.slice(0, 10) + '…' : v.title,
    Views: v.view_count || 0,
    Likes: v.like_count || 0,
    Comments: v.comment_count || 0,
  }))

  const videoItems = compareSet.slice(0, 5).map((v) => ({
    id: v.id,
    videoId: v.youtube_video_id,
    title: v.title,
    thumbnailUrl: v.thumbnail_url,
    subtitle: v.channel_name,
    views: v.view_count,
    likes: v.like_count,
    comments: v.comment_count,
  }))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--success)]/50 bg-[var(--elevated)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase text-[var(--success)]">Top performer</p>
        <div className="mt-1 flex items-center gap-2">
          {leader.thumbnail_url && (
            <img
              src={leader.thumbnail_url}
              alt=""
              className="h-10 w-16 shrink-0 rounded object-cover ring-1 ring-[var(--success)]"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)] line-clamp-1">{leader.title}</p>
            <p className="text-xs text-[var(--muted)]">
              {formatCount(leader.view_count || 0)} views · {formatCount(leader.like_count || 0)} likes
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--muted)] mb-2">Metrics comparison</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCompact} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{
                background: '#121212',
                border: '1px solid #333',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Bar dataKey="Views" fill="#4361ee" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="Likes" fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="Comments" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--muted)] mb-2">Compared videos</p>
        <VideoResultsLayout videos={videoItems} viewMode={viewMode} compact={viewMode === 'grid'} />
      </div>
    </div>
  )
}
