'use client'

export type MetricFiltersState = {
  search: string
  dateFrom: string
  dateTo: string
  minViews: string
  maxViews: string
  minLikes: string
  maxLikes: string
  minSubscribers: string
  maxSubscribers: string
  minVideoCount: string
  maxVideoCount: string
}

export const defaultMetricFilters: MetricFiltersState = {
  search: '',
  dateFrom: '',
  dateTo: '',
  minViews: '',
  maxViews: '',
  minLikes: '',
  maxLikes: '',
  minSubscribers: '',
  maxSubscribers: '',
  minVideoCount: '',
  maxVideoCount: '',
}

type MetricFiltersProps = {
  filters: MetricFiltersState
  onChange: (filters: MetricFiltersState) => void
  showSubscribers?: boolean
  showVideoCount?: boolean
}

function RangePair({
  label,
  minKey,
  maxKey,
  filters,
  onChange,
}: {
  label: string
  minKey: 'minViews' | 'maxViews' | 'minLikes' | 'maxLikes' | 'minSubscribers' | 'maxSubscribers' | 'minVideoCount' | 'maxVideoCount'
  maxKey: typeof minKey
  filters: MetricFiltersState
  onChange: (f: MetricFiltersState) => void
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted)] font-medium">{label}</label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          placeholder="Min"
          value={filters[minKey]}
          onChange={(e) => onChange({ ...filters, [minKey]: e.target.value })}
          className="cs-input w-full px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          placeholder="Max"
          value={filters[maxKey]}
          onChange={(e) => onChange({ ...filters, [maxKey]: e.target.value })}
          className="cs-input w-full px-3 py-2 text-sm"
        />
      </div>
    </div>
  )
}

export function MetricFilters({
  filters,
  onChange,
  showSubscribers,
  showVideoCount,
}: MetricFiltersProps) {
  return (
    <div className="cs-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Search & filters</h3>
      <input
        type="search"
        placeholder="Search by name or title…"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="cs-input w-full px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--muted)]">Published from</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="cs-input mt-1 w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Published to</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="cs-input mt-1 w-full px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <RangePair label="Views" minKey="minViews" maxKey="maxViews" filters={filters} onChange={onChange} />
        <RangePair label="Likes" minKey="minLikes" maxKey="maxLikes" filters={filters} onChange={onChange} />
        {showSubscribers && (
          <RangePair
            label="Subscribers"
            minKey="minSubscribers"
            maxKey="maxSubscribers"
            filters={filters}
            onChange={onChange}
          />
        )}
        {showVideoCount && (
          <RangePair
            label="Videos on channel"
            minKey="minVideoCount"
            maxKey="maxVideoCount"
            filters={filters}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  )
}

type FilterableItem = {
  title?: string
  channel_name?: string
  published_at?: string
  view_count?: number
  like_count?: number
  subscriber_count?: number
  video_count?: number
}

function inRange(value: number, min: string, max: string) {
  if (min && value < Number(min)) return false
  if (max && value > Number(max)) return false
  return true
}

export function applyMetricFilters<T extends FilterableItem>(
  items: T[],
  filters: MetricFiltersState
): T[] {
  return items.filter((item) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${item.title || ''} ${item.channel_name || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (filters.dateFrom && item.published_at) {
      if (new Date(item.published_at) < new Date(filters.dateFrom)) return false
    }
    if (filters.dateTo && item.published_at) {
      if (new Date(item.published_at) > new Date(filters.dateTo + 'T23:59:59')) return false
    }
    if (!inRange(item.view_count || 0, filters.minViews, filters.maxViews)) return false
    if (!inRange(item.like_count || 0, filters.minLikes, filters.maxLikes)) return false
    if (!inRange(item.subscriber_count || 0, filters.minSubscribers, filters.maxSubscribers)) {
      return false
    }
    if (!inRange(item.video_count || 0, filters.minVideoCount, filters.maxVideoCount)) return false
    return true
  })
}
