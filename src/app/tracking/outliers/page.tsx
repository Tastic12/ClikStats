'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabase'
import type { Video } from '../../../../lib/supabase'
import {
  useOwnedChannel,
  useVideos,
  recomputeOutlierScores,
} from '../../../../lib/hooks'
import { DashboardShell } from '../../../components/DashboardShell'
import { TrackingLayout } from '../../../components/TrackingLayout'
import { VideoThumbnailLink } from '../../../components/VideoThumbnailLink'
import { ViewModeToggle, type ViewMode } from '../../../components/ViewModeToggle'
import { OutlierBadge, formatOutlierScore } from '../../../components/OutlierBadge'

type KindFilter = 'all' | 'long' | 'short'

const SCORE_THRESHOLDS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'All scored' },
  { value: 1.5, label: '1.5× and above' },
  { value: 3, label: '3× and above (outlier)' },
  { value: 5, label: '5× and above (breakout)' },
  { value: 10, label: '10× and above (viral)' },
]

function scoredCount(videos: Video[] | undefined) {
  return (videos ?? []).filter((v) => v.outlier_score != null).length
}

function topScore(videos: Video[] | undefined) {
  let best = 0
  for (const v of videos ?? []) {
    if (v.outlier_score != null && v.outlier_score > best) best = v.outlier_score
  }
  return best
}

export default function OutliersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [kind, setKind] = useState<KindFilter>('all')
  const [minScore, setMinScore] = useState<number>(1.5)
  const [recomputing, setRecomputing] = useState(false)
  const [recomputeMsg, setRecomputeMsg] = useState('')

  const { channel, isLoading: channelLoading } = useOwnedChannel()
  const { videos, isLoading: videosLoading, mutate: mutateVideos } = useVideos(channel?.id)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  const filtered = useMemo(() => {
    const list = videos ?? []
    return list
      .filter((v) => v.outlier_score != null && v.outlier_score >= minScore)
      .filter((v) => {
        if (kind === 'all') return true
        if (kind === 'short') return v.is_short === true
        return v.is_short !== true
      })
      .sort((a, b) => (b.outlier_score ?? 0) - (a.outlier_score ?? 0))
  }, [videos, kind, minScore])

  const totalScored = scoredCount(videos)
  const best = topScore(videos)

  const handleRecompute = async () => {
    if (!channel) return
    setRecomputing(true)
    setRecomputeMsg('')
    try {
      await recomputeOutlierScores(channel.id)
      await mutateVideos()
      setRecomputeMsg('Outlier scores refreshed.')
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
      <TrackingLayout>
        {!channelLoading && !channel ? (
          <p className="text-sm text-[var(--muted)]">
            Connect your channel on the{' '}
            <a href="/dashboard" className="text-[var(--accent)] hover:underline">
              dashboard
            </a>{' '}
            first to see outliers.
          </p>
        ) : (
          <div className="space-y-6 w-full">
            <section className="pb-6 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                What are outliers?
              </h2>
              <p className="text-xs text-[var(--muted)] max-w-3xl">
                An <strong>outlier score</strong> compares a video to your own channel&apos;s normal
                output. A <code>3×</code> score means the video got three times the median views of your
                recent 30 uploads of the same kind (Shorts and long-form are scored separately, so a
                viral Short won&apos;t skew your long-form rankings).
              </p>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="cs-card p-4">
                <p className="text-xs text-[var(--muted)] mb-1">Videos scored</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{totalScored}</p>
              </div>
              <div className="cs-card p-4">
                <p className="text-xs text-[var(--muted)] mb-1">Outliers (≥3×)</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">
                  {(videos ?? []).filter((v) => (v.outlier_score ?? 0) >= 3).length}
                </p>
              </div>
              <div className="cs-card p-4">
                <p className="text-xs text-[var(--muted)] mb-1">Your top score</p>
                <p className="text-2xl font-semibold text-[var(--foreground)] flex items-center gap-2">
                  {best > 0 ? formatOutlierScore(best) : '—'}
                  {best > 0 && <OutlierBadge score={best} size="md" />}
                </p>
              </div>
            </section>

            <section className="flex flex-wrap items-end gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted)]">Minimum score</label>
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="cs-input px-2 py-1.5 text-sm"
                >
                  {SCORE_THRESHOLDS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted)]">Layout</label>
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
              </div>

              <div className="ml-auto flex flex-col gap-1 items-end">
                <button
                  type="button"
                  onClick={handleRecompute}
                  disabled={recomputing || !channel}
                  className="text-xs font-medium text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  {recomputing ? 'Recomputing…' : 'Recompute scores'}
                </button>
                {recomputeMsg && (
                  <p className="text-[10px] text-[var(--muted-2)]">{recomputeMsg}</p>
                )}
              </div>
            </section>

            {videosLoading ? (
              <p className="text-center text-[var(--muted)] py-8">Loading videos…</p>
            ) : totalScored === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-[var(--muted)]">No outlier scores yet.</p>
                <p className="text-xs text-[var(--muted-2)] max-w-md mx-auto">
                  We need at least 5 videos of the same kind (Shorts or long-form) on your channel
                  to compute a baseline. Sync your videos from the{' '}
                  <a href="/tracking/my-videos" className="text-[var(--accent)] hover:underline">
                    My videos
                  </a>{' '}
                  tab, then come back.
                </p>
              </div>
            ) : !filtered.length ? (
              <p className="text-center text-[var(--muted)] py-8">
                No videos match these filters. Try lowering the minimum score.
              </p>
            ) : (
              <div className="w-full">
                <p className="text-xs text-[var(--muted)] mb-3">
                  Showing {filtered.length} video{filtered.length === 1 ? '' : 's'} sorted by score.
                </p>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((v, i) => (
                      <VideoThumbnailLink
                        key={v.id}
                        videoId={v.video_id}
                        title={v.title}
                        thumbnailUrl={v.thumbnail_url}
                        views={v.view_count}
                        likes={v.like_count}
                        comments={v.comment_count}
                        rank={i + 1}
                        outlierScore={v.outlier_score}
                        layout="card"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {filtered.map((v, i) => (
                      <VideoThumbnailLink
                        key={v.id}
                        videoId={v.video_id}
                        title={v.title}
                        thumbnailUrl={v.thumbnail_url}
                        views={v.view_count}
                        likes={v.like_count}
                        rank={i + 1}
                        outlierScore={v.outlier_score}
                        layout="row"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </TrackingLayout>
    </DashboardShell>
  )
}
