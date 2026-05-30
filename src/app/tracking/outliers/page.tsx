'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { mutate as globalMutate } from 'swr'
import { supabase } from '../../../../lib/supabase'
import {
  useOwnedChannel,
  useUnifiedOutlierFeed,
  recomputeOutlierScores,
  recomputeNicheOutlierScores,
  refreshCompetitorChannels,
  setNicheGroupId,
  useCompetitorChannelGroups,
} from '../../../../lib/hooks'
import { filterOutlierItems, sortOutlierItems, type OutlierSource } from '../../../../lib/outliers'
import { useShortsPreference } from '../../../../lib/preferences'
import { DashboardShell } from '../../../components/DashboardShell'
import { TrackingLayout } from '../../../components/TrackingLayout'
import { VideoThumbnailLink } from '../../../components/VideoThumbnailLink'
import { ViewModeToggle, type ViewMode } from '../../../components/ViewModeToggle'
import { OutlierBadge, formatOutlierScore } from '../../../components/OutlierBadge'

function similarLink(videoId: string, title: string | null | undefined) {
  const params = new URLSearchParams({ similar: videoId })
  if (title) params.set('title', title)
  return `/tracking/thumbnails?${params.toString()}`
}

type KindFilter = 'all' | 'long' | 'short'
type SortMode = 'score' | 'velocity' | 'niche'
type SourceFilter = 'all' | OutlierSource

const SCORE_THRESHOLDS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'All scored' },
  { value: 1.5, label: '1.5× and above' },
  { value: 3, label: '3× and above (outlier)' },
  { value: 5, label: '5× and above (breakout)' },
  { value: 10, label: '10× and above (viral)' },
]

const SOURCE_LABELS: Record<OutlierSource, string> = {
  own: 'Your channel',
  competitor_channel: 'Competitor channel',
  competitor_video: 'Tracked video',
}

export default function OutliersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [kind, setKind] = useState<KindFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [minScore, setMinScore] = useState<number>(1.5)
  const [sortBy, setSortBy] = useState<SortMode>('score')
  const [nicheGroupId, setNicheGroupIdLocal] = useState<string>('')
  const [recomputing, setRecomputing] = useState(false)
  const [recomputeMsg, setRecomputeMsg] = useState('')

  const { channel } = useOwnedChannel()
  const { items, isLoading } = useUnifiedOutlierFeed()
  const { groups } = useCompetitorChannelGroups()
  const { hideShorts } = useShortsPreference()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  const filtered = useMemo(() => {
    const list = filterOutlierItems(items, {
      minScore,
      kind,
      hideShorts,
      source: sourceFilter,
    })
    return sortOutlierItems(list, sortBy)
  }, [items, kind, minScore, hideShorts, sortBy, sourceFilter])

  const scoredCount = items.filter((v) => v.outlierScore != null).length
  const best = items.reduce((m, v) => Math.max(m, v.outlierScore ?? 0), 0)

  const handleRecompute = async () => {
    setRecomputing(true)
    setRecomputeMsg('')
    try {
      if (channel) await recomputeOutlierScores(channel.id)
      await refreshCompetitorChannels()
      await recomputeNicheOutlierScores()
      await globalMutate('all-competitor-channel-videos')
      await globalMutate('competitor-videos')
      setRecomputeMsg('Scores refreshed for your channel and all competitors.')
    } catch (err) {
      setRecomputeMsg(err instanceof Error ? err.message : 'Recompute failed.')
    } finally {
      setRecomputing(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  return (
    <DashboardShell
      email={user.email}
      onSignOut={async () => {
        await supabase.auth.signOut()
        router.push('/')
      }}
    >
      <TrackingLayout
        title="Performing now"
        description="Outlier scores across your channel, competitor channels, and tracked videos — sorted by how far each upload beats its baseline."
      >
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="cs-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Videos scored</p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{scoredCount}</p>
          </div>
          <div className="cs-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Outliers (≥3×)</p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {items.filter((v) => (v.outlierScore ?? 0) >= 3).length}
            </p>
          </div>
          <div className="cs-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Top score</p>
            <p className="text-2xl font-semibold text-[var(--foreground)] flex items-center gap-2">
              {best > 0 ? formatOutlierScore(best) : '—'}
              {best > 0 && <OutlierBadge score={best} size="md" />}
            </p>
          </div>
        </section>

        <section className="flex flex-wrap items-end gap-3 pb-4 border-b border-[var(--border)]">
          <FilterSelect label="Minimum score" value={String(minScore)} onChange={(v) => setMinScore(Number(v))}>
            {SCORE_THRESHOLDS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Source"
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as SourceFilter)}
          >
            <option value="all">All sources</option>
            <option value="own">Your channel</option>
            <option value="competitor_channel">Competitor channels</option>
            <option value="competitor_video">Tracked videos</option>
          </FilterSelect>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Video kind</label>
            <div className="inline-flex rounded-md ring-1 ring-[var(--border)] overflow-hidden text-xs">
              {([
                { id: 'all', label: 'All' },
                { id: 'long', label: 'Long-form' },
                { id: 'short', label: 'Shorts' },
              ] as Array<{ id: KindFilter; label: string }>).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setKind(opt.id)}
                  className={`px-3 py-1.5 font-medium ${
                    kind === opt.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <FilterSelect label="Sort by" value={sortBy} onChange={(v) => setSortBy(v as SortMode)}>
            <option value="score">Outlier score</option>
            <option value="velocity">Velocity (your uploads)</option>
            <option value="niche">Niche vs competitors</option>
          </FilterSelect>

          <FilterSelect
            label="Niche category"
            value={nicheGroupId}
            onChange={async (v) => {
              setNicheGroupIdLocal(v)
              await setNicheGroupId(v || null)
              await recomputeNicheOutlierScores()
            }}
          >
            <option value="">All competitors</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </FilterSelect>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Layout</label>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          <div className="ml-auto flex flex-col gap-1 items-end">
            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing}
              className="inline-flex items-center min-h-11 px-3 py-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--elevated)] rounded-md disabled:opacity-50"
            >
              {recomputing ? 'Refreshing…' : 'Refresh all scores'}
            </button>
            {recomputeMsg && <p className="text-[10px] text-[var(--muted-2)]">{recomputeMsg}</p>}
          </div>
        </section>

        {isLoading ? (
          <p className="text-center text-[var(--muted)] py-8">Loading…</p>
        ) : scoredCount === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-[var(--muted)]">No outlier scores yet.</p>
            <p className="text-xs text-[var(--muted-2)] max-w-md mx-auto">
              Add competitor channels, refresh them, and optionally connect your own channel under
              My channel → Videos & sync.
            </p>
          </div>
        ) : !filtered.length ? (
          <p className="text-center text-[var(--muted)] py-8">
            No videos match these filters. Try lowering the minimum score.
          </p>
        ) : (
          <div className="w-full">
            <p className="text-xs text-[var(--muted)] mb-3">
              Showing {filtered.length} video{filtered.length === 1 ? '' : 's'}.
            </p>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((v, i) => (
                  <OutlierResultCard key={v.id} item={v} rank={i + 1} layout="card" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((v, i) => (
                  <OutlierResultCard key={v.id} item={v} rank={i + 1} layout="row" />
                ))}
              </div>
            )}
          </div>
        )}
      </TrackingLayout>
    </DashboardShell>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void | Promise<void>
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <select
        value={value}
        onChange={(e) => void onChange(e.target.value)}
        className="cs-input px-2 py-1.5 text-sm"
      >
        {children}
      </select>
    </div>
  )
}

function OutlierResultCard({
  item,
  rank,
  layout,
}: {
  item: import('../../../../lib/outliers').UnifiedOutlierItem
  rank: number
  layout: 'row' | 'card'
}) {
  return (
    <div className={layout === 'row' ? 'py-3 flex flex-col sm:flex-row sm:items-stretch gap-2' : 'flex flex-col'}>
      <div className="flex-1 min-w-0">
        <VideoThumbnailLink
          videoId={item.youtubeVideoId}
          title={item.title}
          thumbnailUrl={item.thumbnailUrl}
          subtitle={`${SOURCE_LABELS[item.source]} · ${item.sourceLabel}`}
          views={item.viewCount}
          likes={item.likeCount}
          comments={item.commentCount}
          rank={rank}
          outlierScore={item.outlierScore}
          layout={layout}
        />
        {(item.outlierVelocityScore != null || item.nicheOutlierScore != null) && (
          <p className="text-[10px] text-[var(--muted-2)] px-1 mt-1">
            {item.outlierVelocityScore != null && (
              <>Velocity {formatOutlierScore(item.outlierVelocityScore)}×</>
            )}
            {item.outlierVelocityScore != null && item.nicheOutlierScore != null && ' · '}
            {item.nicheOutlierScore != null && (
              <>Niche {formatOutlierScore(item.nicheOutlierScore)}×</>
            )}
          </p>
        )}
      </div>
      <a
        href={similarLink(item.youtubeVideoId, item.title)}
        className={`text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)] rounded px-3 py-2 bg-[var(--elevated)]/40 ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-colors flex items-center justify-center min-h-11 ${
          layout === 'row' ? 'sm:self-center shrink-0' : 'mt-1.5'
        }`}
      >
        Find similar thumbnails
      </a>
    </div>
  )
}
