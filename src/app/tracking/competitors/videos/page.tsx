'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../../lib/supabase'
import {
  useCompetitorVideos,
  useCompetitorVideoGroups,
  initCompetitorVideo,
  updateCompetitorVideoGroup,
} from '../../../../../lib/hooks'
import { DashboardShell } from '../../../../components/DashboardShell'
import { CategoryTabs, ALL_CATEGORIES_ID } from '../../../../components/CategoryTabs'
import { ItemTabs } from '../../../../components/ItemTabs'
import { CompetitorVideosCompare } from '../../../../components/CompetitorVideosCompare'
import { CompetitorCategorySelect } from '../../../../components/CompetitorCategorySelect'
import { TrackingToolbar } from '../../../../components/TrackingToolbar'
import { VideoThumbnailLink } from '../../../../components/VideoThumbnailLink'
import type { ViewMode } from '../../../../components/ViewModeToggle'
import {
  defaultMetricFilters,
  applyMetricFilters,
  type MetricFiltersState,
} from '../../../../components/MetricFilters'
import { MetricCard } from '../../../../components/Charts'

export default function CompetitorVideosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<MetricFiltersState>(defaultMetricFilters)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [categoryId, setCategoryId] = useState<string | null>(ALL_CATEGORIES_ID)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)

  const { videos, isLoading, mutate } = useCompetitorVideos()
  const { groups, createGroup } = useCompetitorVideoGroups()

  const inCategory = useMemo(() => {
    const list = videos || []
    if (categoryId === ALL_CATEGORIES_ID) return list
    if (categoryId === null) return list.filter((v) => !v.group_id)
    return list.filter((v) => v.group_id === categoryId)
  }, [videos, categoryId])

  const filtered = applyMetricFilters(inCategory, appliedFilters).sort(
    (a, b) => (b.view_count || 0) - (a.view_count || 0)
  )

  const selected = filtered.find((v) => v.id === selectedId) || filtered[0] || null

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  useEffect(() => {
    if (filtered.length && !selectedId) setSelectedId(filtered[0].id)
    if (selectedId && !filtered.find((v) => v.id === selectedId)) {
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
      const result = await initCompetitorVideo(url, groupForAdd)
      setUrl('')
      mutate()
      setSuccessMsg(result.message || 'Video saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveCategory = async (videoRowId: string, groupId: string | null) => {
    setMovingId(videoRowId)
    setError('')
    try {
      await updateCompetitorVideoGroup(videoRowId, groupId)
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move video')
    } finally {
      setMovingId(null)
    }
  }

  const categoryOptions = (groups || []).map((g) => ({ id: g.id, name: g.name }))

  const handleCreateCategory = async (name: string) => {
    const g = await createGroup(name)
    setCategoryId(g.id)
  }

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
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              Add video to {activeCategoryName}
            </h2>
            <p className="text-xs text-[var(--muted)] mb-3">
              Group videos by campaign or topic (launches, tutorials, shorts, etc.).
            </p>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="cs-input flex-1 px-3 py-2 text-sm"
              />
              <button type="submit" disabled={loading} className="cs-btn-primary px-4 py-2 text-sm">
                {loading ? 'Adding…' : 'Add video'}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
            {successMsg && (
              <p className="mt-2 text-sm text-[var(--success)]">{successMsg}</p>
            )}
          </section>

          {isLoading ? (
            <p className="text-center text-[var(--muted)] py-8">Loading videos…</p>
          ) : !filtered.length ? (
            <p className="text-center text-[var(--muted)] py-8">
              No videos in this category match your filters.
            </p>
          ) : (
            <div className="w-full">
              <TrackingToolbar
                title={`${filtered.length} video${filtered.length === 1 ? '' : 's'}`}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                appliedFilters={appliedFilters}
                onApplyFilters={setAppliedFilters}
                showComments
                filterHint="Filters apply to each tracked video’s current views, likes, and comments. Click Apply filters when done."
                filterLabels={{
                  views: 'Video views',
                  likes: 'Video likes',
                  comments: 'Video comments',
                }}
              />

              <div className="w-full pt-6 space-y-8">
                {(videos?.length ?? 0) > 0 && (
                  <section className="rounded-lg ring-1 ring-[var(--border)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--elevated)]/40">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        Organise videos
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Move tracked videos from Unsorted into a category.
                      </p>
                    </div>
                    <ul className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                      {(videos || []).map((v) => (
                        <li
                          key={v.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3"
                        >
                          <span className="text-sm truncate flex-1 min-w-0">{v.title}</span>
                          <CompetitorCategorySelect
                            value={v.group_id}
                            categories={categoryOptions}
                            disabled={movingId === v.id}
                            onChange={(gid) => handleMoveCategory(v.id, gid)}
                            className="sm:w-44"
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {filtered.length > 1 && (
                  <CompetitorVideosCompare videos={filtered} viewMode={viewMode} />
                )}

                <div className="border-t border-[var(--border)] pt-6">
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">
                    {filtered.length === 1 ? 'Video details' : 'Focus on one video'}
                  </h3>
                  <ItemTabs
                    items={filtered.map((v) => ({
                      id: v.id,
                      label: v.title.length > 28 ? v.title.slice(0, 28) + '…' : v.title,
                      thumbnailUrl: v.thumbnail_url,
                    }))}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelectedId}
                  />
                </div>

                {selected && (
                  <div className="border-t border-[var(--border)] pt-6">
                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
                          : 'flex flex-col gap-4'
                      }
                    >
                      <VideoThumbnailLink
                        videoId={selected.youtube_video_id}
                        title={selected.title}
                        thumbnailUrl={selected.thumbnail_url}
                        subtitle={
                          selected.channel_name
                            ? `${selected.channel_name} · ${selected.published_at ? new Date(selected.published_at).toLocaleDateString() : ''}`
                            : undefined
                        }
                        views={selected.view_count}
                        likes={selected.like_count}
                        comments={selected.comment_count}
                        layout={viewMode === 'grid' ? 'card' : 'row'}
                      />
                      <div className="space-y-3">
                        {selected.channel_name && (
                          <p className="text-sm text-[var(--muted)]">{selected.channel_name}</p>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <MetricCard title="Views" value={selected.view_count || 0} format="views" />
                          <MetricCard title="Likes" value={selected.like_count || 0} format="number" />
                          <MetricCard
                            title="Comments"
                            value={selected.comment_count || 0}
                            format="number"
                          />
                        </div>
                      </div>
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
