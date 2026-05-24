'use client'

export type MetricFiltersState = {
  search: string
  dateFrom: string
  dateTo: string
  minViews: string
  minLikes: string
  minSubscribers: string
}

export const defaultMetricFilters: MetricFiltersState = {
  search: '',
  dateFrom: '',
  dateTo: '',
  minViews: '',
  minLikes: '',
  minSubscribers: '',
}

type MetricFiltersProps = {
  filters: MetricFiltersState
  onChange: (filters: MetricFiltersState) => void
  showSubscribers?: boolean
}

export function MetricFilters({ filters, onChange, showSubscribers }: MetricFiltersProps) {
  const set = (key: keyof MetricFiltersState, value: string) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Search & filters</h3>
      <input
        type="search"
        placeholder="Search by name or title…"
        value={filters.search}
        onChange={(e) => set('search', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Published from</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Published to</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">Min views</label>
          <input
            type="number"
            min={0}
            value={filters.minViews}
            onChange={(e) => set('minViews', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Min likes</label>
          <input
            type="number"
            min={0}
            value={filters.minLikes}
            onChange={(e) => set('minLikes', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        {showSubscribers && (
          <div>
            <label className="text-xs text-gray-500">Min subscribers</label>
            <input
              type="number"
              min={0}
              value={filters.minSubscribers}
              onChange={(e) => set('minSubscribers', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function applyMetricFilters<
  T extends {
    title?: string
    channel_name?: string
    published_at?: string
    view_count?: number
    like_count?: number
    subscriber_count?: number
  },
>(items: T[], filters: MetricFiltersState): T[] {
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
    if (filters.minViews && (item.view_count || 0) < Number(filters.minViews)) return false
    if (filters.minLikes && (item.like_count || 0) < Number(filters.minLikes)) return false
    if (filters.minSubscribers && (item.subscriber_count || 0) < Number(filters.minSubscribers)) {
      return false
    }
    return true
  })
}
