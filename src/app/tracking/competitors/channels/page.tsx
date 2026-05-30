'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { mutate as globalMutate } from 'swr'
import { supabase } from '../../../../../lib/supabase'
import {
  useCompetitorChannels,
  useCompetitorChannelGroups,
  useCompetitorChannelVideos,
  useCompetitorChannelVideosBatch,
  initCompetitorChannel,
  refreshCompetitorChannels,
  bulkImportCompetitors,
  updateCompetitorChannelGroup,
} from '../../../../../lib/hooks'
import { useShortsPreference } from '../../../../../lib/preferences'
import { DashboardShell } from '../../../../components/DashboardShell'
import { CategoryTabs, ALL_CATEGORIES_ID } from '../../../../components/CategoryTabs'
import { ItemTabs } from '../../../../components/ItemTabs'
import { CompetitorCompare } from '../../../../components/CompetitorCompare'
import { CompetitorCategorySelect } from '../../../../components/CompetitorCategorySelect'
import { TrackingToolbar } from '../../../../components/TrackingToolbar'
import { VideoResultsLayout } from '../../../../components/VideoResultsLayout'
import type { ViewMode } from '../../../../components/ViewModeToggle'
import {
  defaultMetricFilters,
  applyMetricFilters,
  type MetricFiltersState,
} from '../../../../components/MetricFilters'
import { formatCount } from '@/lib/format'

export default function CompetitorChannelsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<MetricFiltersState>(defaultMetricFilters)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [categoryId, setCategoryId] = useState<string | null>(ALL_CATEGORIES_ID)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)

  const { channels, isLoading, mutate } = useCompetitorChannels()
  const { groups, createGroup } = useCompetitorChannelGroups()
  const { hideShorts } = useShortsPreference()

  const inCategory = useMemo(() => {
    const list = channels || []
    if (categoryId === ALL_CATEGORIES_ID) return list
    if (categoryId === null) return list.filter((c) => !c.group_id)
    return list.filter((c) => c.group_id === categoryId)
  }, [channels, categoryId])

  const filtered = applyMetricFilters(inCategory, appliedFilters)
  const channelIds = filtered.map((c) => c.id)

  const { videosByChannel, isLoading: batchLoading } = useCompetitorChannelVideosBatch(channelIds)
  const { videos: channelVideos, isLoading: videosLoading } = useCompetitorChannelVideos(
    selectedId || undefined
  )

  const selected = filtered.find((c) => c.id === selectedId) || filtered[0] || null

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  useEffect(() => {
    if (filtered.length && !selectedId) setSelectedId(filtered[0].id)
    if (selectedId && !filtered.find((c) => c.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null)
    }
  }, [filtered, selectedId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const groupForAdd =
        categoryId && categoryId !== ALL_CATEGORIES_ID ? categoryId : null
      const result = await initCompetitorChannel(url, groupForAdd)
      setUrl('')
      mutate()
      setSuccessMsg(result.message || 'Channel saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkImport = async () => {
    const lines = bulkText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (!lines.length) {
      setBulkMsg('Paste at least one channel URL or @handle.')
      return
    }
    setBulkLoading(true)
    setBulkMsg('')
    setError('')
    try {
      const groupForAdd =
        categoryId && categoryId !== ALL_CATEGORIES_ID ? categoryId : null
      const result = await bulkImportCompetitors(lines, groupForAdd)
      setBulkText('')
      mutate()
      const parts = [`Added ${result.added} new channel${result.added === 1 ? '' : 's'}.`]
      if (result.updated > 0) {
        parts.push(`${result.updated} already tracked (stats refreshed).`)
      }
      setBulkMsg(`${parts.join(' ')} (${result.total} URLs processed.)`)
    } catch (err) {
      setBulkMsg(err instanceof Error ? err.message : 'Bulk import failed.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleCreateCategory = async (name: string) => {
    const g = await createGroup(name)
    setCategoryId(g.id)
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    setRefreshMsg('')
    try {
      const result = await refreshCompetitorChannels()
      await mutate()
      // Invalidate every cached competitor-channel-videos query so the
      // refreshed top-5 + outlier badges show up immediately.
      await globalMutate(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === 'string' &&
          key[0].startsWith('competitor-channel-videos'),
        undefined,
        { revalidate: true }
      )
      const failed = result.results.filter((r) => r.status === 'error').length
      setRefreshMsg(
        failed > 0
          ? `Refreshed ${result.refreshed} of ${result.total} channels (${failed} failed).`
          : `Refreshed all ${result.refreshed} channels with fresh data and outlier scores.`
      )
    } catch (err) {
      setRefreshMsg(err instanceof Error ? err.message : 'Refresh failed.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleMoveCategory = async (channelId: string, groupId: string | null) => {
    setMovingId(channelId)
    setError('')
    try {
      await updateCompetitorChannelGroup(channelId, groupId)
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move channel')
    } finally {
      setMovingId(null)
    }
  }

  const categoryOptions = (groups || []).map((g) => ({ id: g.id, name: g.name }))

  const activeCategoryName =
    categoryId === ALL_CATEGORIES_ID
      ? 'All categories'
      : categoryId === null
        ? 'Unsorted'
        : groups?.find((g) => g.id === categoryId)?.name || 'Category'

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
      <div className="space-y-6 w-full">
          <CategoryTabs
            categories={(groups || []).map((g) => ({ id: g.id, name: g.name }))}
            selectedId={categoryId}
            onSelect={setCategoryId}
            onCreate={handleCreateCategory}
          />

          <section className="pb-8 border-b border-[var(--border)]">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Add channel to {activeCategoryName}
              </h2>
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={refreshing || !channels?.length}
                className="inline-flex items-center min-h-11 px-3 py-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--elevated)] rounded-md disabled:opacity-50"
                title="Re-fetch recent uploads for every competitor and recompute outlier scores. Needed once for competitors added before the outlier feature shipped."
              >
                {refreshing ? 'Refreshing…' : 'Refresh all competitors'}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Group channels by niche (news, football, makeup, etc.) using categories above.
            </p>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/@competitor"
                className="cs-input flex-1 px-3 py-2 text-sm"
              />
              <button type="submit" disabled={loading} className="cs-btn-primary px-4 py-2 text-sm">
                {loading ? 'Adding…' : 'Add channel'}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
            {successMsg && (
              <p className="mt-2 text-sm text-[var(--success)]">{successMsg}</p>
            )}
            {refreshMsg && (
              <p className="mt-2 text-xs text-[var(--muted-2)]">{refreshMsg}</p>
            )}

            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                Bulk import
              </h3>
              <p className="text-xs text-[var(--muted)] mb-2">
                Paste many channel URLs or @handles (one per line). Max 50 per batch. Uses the
                selected category above.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={'https://www.youtube.com/@channel1\n@channel2\nhttps://...'}
                className="cs-input w-full px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkLoading || !bulkText.trim()}
                className="mt-2 cs-btn-primary min-h-11 px-4 py-2 text-sm disabled:opacity-50"
              >
                {bulkLoading ? 'Importing…' : 'Import channels'}
              </button>
              {bulkMsg && <p className="mt-2 text-xs text-[var(--muted-2)]">{bulkMsg}</p>}
            </div>
          </section>

          {isLoading || batchLoading ? (
            <p className="text-center text-[var(--muted)] py-8">Loading competitors…</p>
          ) : !filtered.length ? (
            <p className="text-center text-[var(--muted)] py-8">
              No channels in this category match your filters. Add a channel or try another category.
            </p>
          ) : (
            <div className="w-full">
              <TrackingToolbar
                title={`${filtered.length} channel${filtered.length === 1 ? '' : 's'}`}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                appliedFilters={appliedFilters}
                onApplyFilters={setAppliedFilters}
                showSubscribers
                showVideoCount
                showLikes={false}
                filterHint="Filters use each channel’s total stats from YouTube (subscribers, lifetime views, video count)—not individual video metrics. Click Apply filters when done."
                filterLabels={{
                  views: 'Total channel views',
                }}
              />

              <div className="w-full pt-6 space-y-8">
                {(channels?.length ?? 0) > 0 && (
                  <section className="rounded-lg ring-1 ring-[var(--border)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--elevated)]/40">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        Organise channels
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Move channels from Unsorted into a category using the dropdown.
                      </p>
                    </div>
                    <ul className="divide-y divide-[var(--border)]">
                      {(channels || []).map((ch) => (
                        <li
                          key={ch.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {ch.thumbnail_url && (
                              <img
                                src={ch.thumbnail_url}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                              />
                            )}
                            <span className="text-sm font-medium truncate">{ch.channel_name}</span>
                          </div>
                          <CompetitorCategorySelect
                            value={ch.group_id}
                            categories={categoryOptions}
                            disabled={movingId === ch.id}
                            onChange={(gid) => handleMoveCategory(ch.id, gid)}
                            className="sm:w-44"
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <CompetitorCompare
                  channels={filtered}
                  videosByChannel={videosByChannel}
                  viewMode={viewMode}
                />

                <div className="border-t border-[var(--border)] pt-6">
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">
                    {filtered.length === 1 ? 'Channel details' : 'Focus on one channel'}
                  </h3>
                  <ItemTabs
                    items={filtered.map((c) => ({
                      id: c.id,
                      label: c.channel_name,
                      thumbnailUrl: c.thumbnail_url,
                    }))}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelectedId}
                  />
                </div>

                {selected && (
                  <div className="border-t border-[var(--border)] pt-8 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {selected.thumbnail_url && (
                        <a
                          href={selected.channel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={selected.thumbnail_url}
                            alt=""
                            className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--accent)] hover:opacity-90"
                          />
                        </a>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-[var(--foreground)]">
                          {selected.channel_name}
                        </h3>
                        <a
                          href={selected.channel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          View on YouTube ↗
                        </a>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--muted-2)]">
                          <span>{formatCount(selected.subscriber_count || 0)} subscribers</span>
                          <span>{formatCount(selected.view_count || 0)} views</span>
                          <span>{formatCount(selected.video_count || 0)} videos</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {videosLoading ? (
                        <p className="text-[var(--muted)] text-sm">Loading videos…</p>
                      ) : channelVideos && channelVideos.length > 0 ? (
                        <>
                          {(() => {
                            const mapVideo = (v: typeof channelVideos[number]) => ({
                              id: v.id,
                              videoId: v.video_id,
                              title: v.title,
                              thumbnailUrl: v.thumbnail_url,
                              views: v.view_count,
                              likes: v.like_count,
                              comments: v.comment_count,
                              outlierScore: v.outlier_score,
                            })
                            const visible = hideShorts
                              ? channelVideos.filter((v) => v.is_short !== true)
                              : channelVideos
                            const topByViews = [...visible]
                              .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                              .slice(0, 5)
                              .map(mapVideo)
                            const topByOutlier = [...visible]
                              .filter((v) => v.outlier_score != null)
                              .sort(
                                (a, b) =>
                                  (b.outlier_score || 0) - (a.outlier_score || 0)
                              )
                              .slice(0, 5)
                              .map(mapVideo)
                            return (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                                    Top 5 by views
                                  </h4>
                                  <VideoResultsLayout
                                    viewMode={viewMode}
                                    videos={topByViews}
                                    maxItems={5}
                                  />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                                    Top 5 outliers
                                  </h4>
                                  {topByOutlier.length > 0 ? (
                                    <VideoResultsLayout
                                      viewMode={viewMode}
                                      videos={topByOutlier}
                                      maxItems={5}
                                    />
                                  ) : (
                                    <p className="text-xs text-[var(--muted)]">
                                      No scored videos yet — try the
                                      &ldquo;Refresh all competitors&rdquo; button so this
                                      channel has a baseline to score against.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No videos loaded for this channel.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </DashboardShell>
  )
}
