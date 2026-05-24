'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { VideoMetric } from '../../lib/supabase'
import { sortByRecordedAt, formatChartDate } from '../lib/chart-utils'

type MetricKey = 'views' | 'likes' | 'comments'

const METRICS: Array<{
  key: MetricKey
  dataKey: 'Views' | 'Likes' | 'Comments'
  label: string
  color: string
  axis: 'primary' | 'engagement'
}> = [
  { key: 'views', dataKey: 'Views', label: 'Views', color: '#4361ee', axis: 'primary' },
  { key: 'likes', dataKey: 'Likes', label: 'Likes', color: '#7c3aed', axis: 'engagement' },
  { key: 'comments', dataKey: 'Comments', label: 'Comments', color: '#06b6d4', axis: 'engagement' },
]

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

const axisStyle = { fill: '#a894c0', fontSize: 11 }
const gridStroke = 'rgba(167, 139, 250, 0.12)'

export function VideoMetricsToggleChart({ metrics }: { metrics: VideoMetric[] }) {
  const [active, setActive] = useState<Set<MetricKey>>(() => new Set(['views']))

  const data = useMemo(
    () =>
      sortByRecordedAt(metrics).map((m) => ({
        date: formatChartDate(m.recorded_at),
        Views: m.view_count ?? 0,
        Likes: m.like_count ?? 0,
        Comments: m.comment_count ?? 0,
      })),
    [metrics]
  )

  const toggle = (key: MetricKey) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size <= 1) return prev
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (!data.length) {
    return <p className="text-sm text-[var(--muted)] py-8 text-center">No chart data yet.</p>
  }

  const enabled = METRICS.filter((m) => active.has(m.key))
  const showViews = active.has('views')
  const showEngagement = active.has('likes') || active.has('comments')

  const primaryValues = showViews ? data.map((d) => d.Views) : []
  const engagementValues: number[] = []
  if (active.has('likes')) engagementValues.push(...data.map((d) => d.Likes))
  if (active.has('comments')) engagementValues.push(...data.map((d) => d.Comments))

  const useDualAxis = showViews && showEngagement

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--muted)] mr-1">Show:</span>
        {METRICS.map(({ key, label, color }) => {
          const on = active.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                on
                  ? 'border-transparent text-white'
                  : 'border-[var(--border)] bg-[var(--elevated)] text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
              style={on ? { backgroundColor: color } : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>

      {useDualAxis && (
        <p className="text-xs text-[var(--muted)]">
          Views use the left axis; likes and comments use the right so each trend stays readable.
        </p>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: showEngagement && useDualAxis ? 52 : 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          {showViews && (
            <YAxis
              yAxisId="primary"
              tickFormatter={formatCompact}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={yDomain(primaryValues)}
            />
          )}
          {showEngagement && (
            <YAxis
              yAxisId={useDualAxis ? 'engagement' : 'primary'}
              orientation={useDualAxis ? 'right' : 'left'}
              tickFormatter={formatCompact}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={yDomain(engagementValues)}
            />
          )}
          <Tooltip
            content={({ active: hover, payload, label }) => {
              if (!hover || !payload?.length) return null
              return (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl">
                  {label && <p className="text-xs text-[var(--muted)] mb-1">{label}</p>}
                  {payload.map((entry) => (
                    <p
                      key={entry.name}
                      className="text-sm font-medium"
                      style={{ color: entry.color }}
                    >
                      {entry.name}: {formatCompact(Number(entry.value))}
                    </p>
                  ))}
                </div>
              )
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#a894c0' }} />
          {enabled.map(({ dataKey, label, color }) => {
            const yAxisId =
              dataKey === 'Views' ? 'primary' : useDualAxis ? 'engagement' : 'primary'
            return (
              <Line
                key={dataKey}
                yAxisId={yAxisId}
                type="monotone"
                dataKey={dataKey}
                name={label}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
