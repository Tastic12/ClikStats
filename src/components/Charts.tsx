'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import type { ChannelMetric, VideoMetric } from '../../lib/supabase'
import type { CompetitorChannel } from '../../lib/supabase'
import { formatChartDate, sortByRecordedAt, toChartSeries } from '../lib/chart-utils'

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function yDomain(values: number[]): [number, number] {
  if (!values.length) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    const pad = Math.max(max * 0.15, 1)
    return [Math.max(0, min - pad), max + pad]
  }
  const pad = (max - min) * 0.12
  return [Math.max(0, min - pad), max + pad]
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

const axisStyle = { fill: '#a894c0', fontSize: 11 }
const gridStroke = 'rgba(167, 139, 250, 0.12)'

type TimeSeriesPoint = { date: string; value: number; timestamp: number }

function buildTimeSeries(
  metrics: Array<{ recorded_at: string }>,
  getValue: (m: { recorded_at: string }) => number
): TimeSeriesPoint[] {
  return sortByRecordedAt(metrics).map((metric) => ({
    timestamp: new Date(metric.recorded_at).getTime(),
    date: formatChartDate(metric.recorded_at),
    value: getValue(metric),
  }))
}

function SingleMetricAreaChart({
  data,
  name,
  color,
  gradientId,
  height = 240,
}: {
  data: TimeSeriesPoint[]
  name: string
  color: string
  gradientId: string
  height?: number
}) {
  if (!data.length) {
    return <p className="text-sm text-[var(--muted)] py-6 text-center">No data yet.</p>
  }

  const domain = yDomain(data.map((d) => d.value))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={domain}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface ChannelMetricsChartProps {
  metrics: ChannelMetric[]
  metricType: 'subscriber_count' | 'view_count' | 'video_count'
}

const channelMetricLabels: Record<ChannelMetricsChartProps['metricType'], string> = {
  subscriber_count: 'Subscribers',
  view_count: 'Views',
  video_count: 'Videos',
}

export function ChannelMetricsChart({ metrics, metricType }: ChannelMetricsChartProps) {
  const data = toChartSeries(metrics, (m) => m[metricType] ?? 0) as TimeSeriesPoint[]
  return (
    <SingleMetricAreaChart
      data={data}
      name={channelMetricLabels[metricType]}
      color="#a78bfa"
      gradientId={`channel-${metricType}`}
      height={280}
    />
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
  const data = buildTimeSeries(metrics, (m) => (m as VideoMetric)[metricType] ?? 0)
  return (
    <SingleMetricAreaChart
      data={data}
      name={metricLabels[metricType]}
      color={metricColors[metricType]}
      gradientId={`video-${metricType}`}
    />
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

  const domain = yDomain(data.map((d) => d.views))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={formatCompact}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={domain}
        />
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
        <Bar dataKey="views" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ComparisonBarChart({
  data,
  dataKey,
  label,
  color,
  height = 220,
}: {
  data: Array<{ name: string }>
  dataKey: string
  label: string
  color: string
  height?: number
}) {
  const values = data.map((d) => Number(d[dataKey as keyof typeof d] ?? 0))
  const domain = yDomain(values)

  return (
    <div>
      <h4 className="text-xs font-medium text-[var(--muted)] mb-2">{label}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={domain}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={dataKey} name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChannelComparisonTable({ channels }: { channels: CompetitorChannel[] }) {
  if (!channels.length) return null

  const sorted = [...channels].sort(
    (a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0)
  )

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--elevated)]/50 text-left">
            <th className="px-3 py-2 text-xs font-medium text-[var(--muted)]">Channel</th>
            <th className="px-3 py-2 text-xs font-medium text-[var(--muted)] text-right">
              Subscribers
            </th>
            <th className="px-3 py-2 text-xs font-medium text-[var(--muted)] text-right">
              Total views
            </th>
            <th className="px-3 py-2 text-xs font-medium text-[var(--muted)] text-right">Videos</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ch, i) => (
            <tr key={ch.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {i === 0 && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--success)]">
                      Lead
                    </span>
                  )}
                  {ch.thumbnail_url && (
                    <img
                      src={ch.thumbnail_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <a
                    href={ch.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--foreground)] hover:text-[var(--accent)] truncate"
                  >
                    {ch.channel_name}
                  </a>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-[var(--foreground)]">
                {formatCompact(ch.subscriber_count || 0)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-2)]">
                {formatCompact(ch.view_count || 0)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-2)]">
                {formatCompact(ch.video_count || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[10px] text-[var(--muted-2)] border-t border-[var(--border)]">
        Snapshot totals from YouTube — not growth over time.
      </p>
    </div>
  )
}

/** @deprecated Use ChannelComparisonTable — bar charts were confusing in user testing */
export function ChannelSnapshotComparisonChart({ channels }: { channels: CompetitorChannel[] }) {
  return <ChannelComparisonTable channels={channels} />
}

/** Side-by-side competitor videos: one bar chart per metric with its own scale */
export function CompetitorVideosMetricsCharts({
  videos,
}: {
  videos: Array<{
    title: string
    view_count?: number
    like_count?: number
    comment_count?: number
  }>
}) {
  const data = videos.slice(0, 8).map((v) => ({
    name: v.title.length > 12 ? v.title.slice(0, 12) + '…' : v.title,
    Views: v.view_count || 0,
    Likes: v.like_count || 0,
    Comments: v.comment_count || 0,
  }))

  if (!data.length) return null

  return (
    <div className="space-y-6">
      <ComparisonBarChart data={data} dataKey="Views" label="Views" color="#4361ee" height={200} />
      <ComparisonBarChart data={data} dataKey="Likes" label="Likes" color="#7c3aed" height={200} />
      <ComparisonBarChart data={data} dataKey="Comments" label="Comments" color="#06b6d4" height={200} />
    </div>
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
