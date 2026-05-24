'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ViewModeToggle, type ViewMode } from './ViewModeToggle'
import {
  MetricFilters,
  defaultMetricFilters,
  type MetricFiltersState,
  hasActiveFilters,
  type MetricFiltersLabels,
} from './MetricFilters'

type TrackingToolbarProps = {
  title: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  appliedFilters: MetricFiltersState
  onApplyFilters: (filters: MetricFiltersState) => void
  showSubscribers?: boolean
  showVideoCount?: boolean
  showComments?: boolean
  showLikes?: boolean
  showViewToggle?: boolean
  filterLabels?: MetricFiltersLabels
  filterHint?: string
  children?: ReactNode
}

export function TrackingToolbar({
  title,
  viewMode,
  onViewModeChange,
  appliedFilters,
  onApplyFilters,
  showSubscribers,
  showVideoCount,
  showComments,
  showLikes = true,
  showViewToggle = true,
  filterLabels,
  filterHint,
  children,
}: TrackingToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<MetricFiltersState>(appliedFilters)
  const active = hasActiveFilters(appliedFilters)
  const draftDirty =
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters)

  useEffect(() => {
    if (filtersOpen) {
      setDraftFilters(appliedFilters)
    }
  }, [filtersOpen, appliedFilters])

  const handleApply = () => {
    onApplyFilters(draftFilters)
    setFiltersOpen(false)
  }

  const handleClear = () => {
    onApplyFilters(defaultMetricFilters)
    setDraftFilters(defaultMetricFilters)
    setFiltersOpen(false)
  }

  return (
    <div className="border-b border-[var(--border)] px-4 py-3 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <div className="flex items-center gap-2">
          {showViewToggle && <ViewModeToggle value={viewMode} onChange={onViewModeChange} />}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filtersOpen || active
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--elevated)] text-[var(--foreground)] hover:border-[var(--accent)]'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h18M7 8h10M10 12h4M12 16h0"
                />
              </svg>
              Filters
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-label="Filters active" />
              )}
            </button>
            {filtersOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default bg-black/40 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                />
                <div
                  className="fixed inset-x-4 top-20 z-40 max-h-[calc(100vh-6rem)] overflow-y-auto cs-scrollbar rounded-xl cs-surface p-5 shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:max-h-[min(85vh,36rem)] sm:w-[22rem] md:w-[26rem]"
                  role="dialog"
                  aria-label="Search and filters"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                      e.preventDefault()
                      handleApply()
                    }
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      Search & filters
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                    >
                      Close
                    </button>
                  </div>
                  {filterHint && (
                    <p className="text-xs text-[var(--muted)] mb-4 -mt-2">{filterHint}</p>
                  )}
                  <MetricFilters
                    embedded
                    filters={draftFilters}
                    onChange={setDraftFilters}
                    showSubscribers={showSubscribers}
                    showVideoCount={showVideoCount}
                    showComments={showComments}
                    showLikes={showLikes}
                    labels={filterLabels}
                  />
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                    <button
                      type="button"
                      onClick={handleApply}
                      className="cs-btn-primary flex-1 min-w-[8rem] px-4 py-2.5 text-sm"
                    >
                      Apply filters
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2.5 text-sm rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]"
                    >
                      Clear
                    </button>
                  </div>
                  {draftDirty && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Changes are not applied until you click Apply filters.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
