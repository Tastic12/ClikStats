'use client'

import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import type { ChannelMetric, VideoMetric } from '../../lib/supabase'
import type { CompetitorChannel } from '../../lib/supabase'

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl">
      {label && <p className="text-xs text-[var(--muted)] mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCompact(entry.value)}
        </p>
      ))}
    </div>
  )
}

const axisStyle = { fill: '#9ca3af', fontSize: 11 }
const gridStroke = '#2a2a2a'

interface ChannelMetricsChartProps {
  metrics: ChannelMetric[]
  metricType: 'subscriber_count' | 'view_count' | 'video_count'
}

export function ChannelMetricsChart({ metrics, metricType }: ChannelMetricsChartProps) {
  const data = [...metrics]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((metric) => ({
      date: new Date(metric.recorded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      value: metric[metricType],
    }))

  if (!data.length) {
    return <p className="text-sm text-[var(--muted)] py-8 text-center">No chart data yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="channelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4361ee" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#4361ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          name="Value"
          stroke="#4361ee"
          strokeWidth={2.5}
          fill="url(#channelGradient)"
          dot={{ fill: '#4361ee', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#7c8ff5' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface VideoMetricsChartProps {
  metrics: VideoMetric[]
  metricType: 'view_count' | 'like_count' | 'comment_count'
}

const metricLabels: Record<VideoMetricsChartProps['metricType'], string> = {
  view_count: 'Views',
  like_count: 'Likes',
  comment_count: 'Comments',
}

const metricColors: Record<VideoMetricsChartProps['metricType'], string> = {
  view_count: '#4361ee',
  like_count: '#7c3aed',
  comment_count: '#06b6d4',
}

export function VideoMetricsChart({ metrics, metricType }: VideoMetricsChartProps) {
  const data = [...metrics]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((metric) => ({
      date: new Date(metric.recorded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      value: metric[metricType],
    }))

  if (!data.length) {
    return <p className="text-sm text-[var(--muted)] py-8 text-center">No chart data yet.</p>
  }

  const color = metricColors[metricType]
  const gradId = `videoGrad-${metricType}`

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          name={metricLabels[metricType]}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Views, likes, and comments on one chart */
export function VideoPerformanceOverviewChart({ metrics }: { metrics: VideoMetric[] }) {
  const data = [...metrics]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((metric) => ({
      date: new Date(metric.recorded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      Views: metric.view_count,
      Likes: metric.like_count,
      Comments: metric.comment_count,
    }))

  if (!data.length) {
    return <p className="text-sm text-[var(--muted)] py-8 text-center">No chart data yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        <Line type="monotone" dataKey="Views" stroke="#4361ee" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="Likes" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line
          type="monotone"
          dataKey="Comments"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface TopVideosChartProps {
  videos: Array<{ title: string; view_count?: number }>
}

export function TopVideosChart({ videos }: TopVideosChartProps) {
  const data = videos.slice(0, 5).map((video, i) => ({
    name: `#${i + 1}`,
    fullTitle: video.title,
    views: video.view_count || 0,
  }))

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const row = payload[0].payload as { fullTitle: string; views: number }
            return (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl max-w-xs">
                <p className="text-xs text-[var(--foreground)] font-medium line-clamp-2">{row.fullTitle}</p>
                <p className="text-sm text-[var(--accent)] mt-1">{formatCompact(row.views)} views</p>
              </div>
            )
          }}
        />
        <Bar dataKey="views" fill="#4361ee" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ChannelSnapshotComparisonChart({ channels }: { channels: CompetitorChannel[] }) {
  const data = channels.map((ch) => ({
    name:
      ch.channel_name.length > 14 ? ch.channel_name.slice(0, 14) + '…' : ch.channel_name,
    Subscribers: ch.subscriber_count || 0,
    'Total views': ch.view_count || 0,
  }))

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={axisStyle} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        <Bar dataKey="Subscribers" fill="#4361ee" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="Total views" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface MetricCardProps {
  title: string
  value: number
  change?: number
  format?: 'number' | 'views' | 'subscribers'
}

export function MetricCard({ title, value, change, format = 'number' }: MetricCardProps) {
  const formatValue = (val: number) => {
    if (format === 'subscribers' || format === 'views') {
      return formatCompact(val)
    }
    return val.toLocaleString()
  }

  return (
    <div className="py-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{title}</h3>
      <div className="mt-1 flex items-baseline">
        <div className="text-3xl font-semibold text-[var(--foreground)]">{formatValue(value)}</div>
        {change !== undefined && change !== 0 && (
          <div
            className={`ml-2 text-sm font-semibold ${
              change >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {change >= 0 ? '+' : ''}
            {formatValue(Math.abs(change))}
          </div>
        )}
      </div>
    </div>
  )
}
