'use client'

import Link from 'next/link'
import { formatCount } from '@/lib/format'
import { OutlierBadge } from './OutlierBadge'
import type { UnifiedOutlierItem } from '../../lib/outliers'

export function TopOutliersWidget({
  items,
  isLoading,
}: {
  items: UnifiedOutlierItem[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl ring-1 ring-[var(--border)] p-4">
        <p className="text-sm text-[var(--muted)]">Loading performers…</p>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-xl ring-1 ring-[var(--border)] p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Performing now</h3>
        <p className="text-xs text-[var(--muted)]">
          No outlier scores yet. Add competitors and refresh, or sync your channel.
        </p>
        <Link href="/tracking/outliers" className="text-xs text-[var(--accent)] hover:underline">
          View outliers →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl ring-1 ring-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--elevated)]/40">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Performing now</h3>
          <p className="text-[10px] text-[var(--muted)]">Top outliers across your tracking</p>
        </div>
        <Link href="/tracking/outliers" className="text-xs text-[var(--accent)] hover:underline shrink-0">
          See all
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {items.map((v) => (
          <li key={v.id}>
            <a
              href={`https://www.youtube.com/watch?v=${v.youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--elevated)]/30"
            >
              {v.thumbnailUrl && (
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded object-cover bg-[var(--elevated)]"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--foreground)] line-clamp-1">{v.title}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">
                  {v.sourceLabel} · {formatCount(v.viewCount)} views
                </p>
              </div>
              {v.outlierScore != null && <OutlierBadge score={v.outlierScore} size="sm" />}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
