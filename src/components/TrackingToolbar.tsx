'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { ViewModeToggle, type ViewMode } from './ViewModeToggle'
import { MetricFilters, type MetricFiltersState, hasActiveFilters } from './MetricFilters'

type TrackingToolbarProps = {
  title: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  filters: MetricFiltersState
  onFiltersChange: (filters: MetricFiltersState) => void
  showSubscribers?: boolean
  showVideoCount?: boolean
  showComments?: boolean
  showViewToggle?: boolean
  children?: ReactNode
}

export function TrackingToolbar({
  title,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  showSubscribers,
  showVideoCount,
  showComments,
  showViewToggle = true,
  children,
}: TrackingToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const active = hasActiveFilters(filters)

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
                  <MetricFilters
                    embedded
                    filters={filters}
                    onChange={onFiltersChange}
                    showSubscribers={showSubscribers}
                    showVideoCount={showVideoCount}
                    showComments={showComments}
                  />
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
