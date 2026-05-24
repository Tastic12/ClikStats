import type { VideoMetric } from '../../lib/supabase'

export function sortByRecordedAt<T extends { recorded_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )
}

export function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function toChartSeries<T extends { recorded_at: string }>(
  metrics: T[],
  getValue: (metric: T) => number
) {
  return sortByRecordedAt(metrics).map((metric) => ({
    timestamp: new Date(metric.recorded_at).getTime(),
    date: formatChartDate(metric.recorded_at),
    value: getValue(metric),
  }))
}

export function toMultiMetricChartSeries(metrics: VideoMetric[]) {
  return sortByRecordedAt(metrics).map((metric) => ({
    timestamp: new Date(metric.recorded_at).getTime(),
    date: formatChartDate(metric.recorded_at),
    Views: metric.view_count ?? 0,
    Likes: metric.like_count ?? 0,
    Comments: metric.comment_count ?? 0,
  }))
}
