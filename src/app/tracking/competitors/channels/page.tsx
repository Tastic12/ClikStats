'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../../lib/supabase'
import {
  useCompetitorChannels,
  useCompetitorChannelGroups,
  useCompetitorChannelVideos,
  useCompetitorChannelVideosBatch,
  initCompetitorChannel,
} from '../../../../../lib/hooks'
import { DashboardShell } from '../../../../components/DashboardShell'
import { TrackingLayout } from '../../../../components/TrackingLayout'
import { CategoryTabs, ALL_CATEGORIES_ID } from '../../../../components/CategoryTabs'
import { ItemTabs } from '../../../../components/ItemTabs'
import { CompetitorCompare } from '../../../../components/CompetitorCompare'
import { VideoThumbnailLink } from '../../../../components/VideoThumbnailLink'
import {
  MetricFilters,
  defaultMetricFilters,
  applyMetricFilters,
  type MetricFiltersState,
} from '../../../../components/MetricFilters'
import { formatCount } from '@/lib/format'
import { TopVideosChart } from '../../../../components/Charts'

export default function CompetitorChannelsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<MetricFiltersState>(defaultMetricFilters)
  const [categoryId, setCategoryId] = useState<string | null>(ALL_CATEGORIES_ID)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { channels, isLoading, mutate } = useCompetitorChannels()
  const { groups, createGroup } = useCompetitorChannelGroups()

  const inCategory = useMemo(() => {
    const list = channels || []
    if (categoryId === ALL_CATEGORIES_ID) return list
    if (categoryId === null) return list.filter((c) => !c.group_id)
    return list.filter((c) => c.group_id === categoryId)
  }, [channels, categoryId])

  const filtered = applyMetricFilters(inCategory, filters)
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
    try {
      const groupForAdd =
        categoryId && categoryId !== ALL_CATEGORIES_ID ? categoryId : null
      await initCompetitorChannel(url, groupForAdd)
      setUrl('')
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel')
    } finally {
      setLoading(false)
    }
  }

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
      <TrackingLayout>
        <div className="space-y-6">
          <CategoryTabs
            categories={(groups || []).map((g) => ({ id: g.id, name: g.name }))}
            selectedId={categoryId}
            onSelect={setCategoryId}
            onCreate={handleCreateCategory}
          />

          <div className="cs-card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              Add channel to {activeCategoryName}
            </h2>
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
          </div>

          <MetricFilters
            filters={filters}
            onChange={setFilters}
            showSubscribers
            showVideoCount
          />

          {isLoading || batchLoading ? (
            <p className="text-center text-[var(--muted)] py-8">Loading competitors…</p>
          ) : !filtered.length ? (
            <p className="text-center text-[var(--muted)] py-8">
              No channels in this category match your filters. Add a channel or try another category.
            </p>
          ) : (
            <>
              {filtered.length > 1 && (
                <CompetitorCompare
                  channels={filtered}
                  videosByChannel={videosByChannel}
                />
              )}

              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  {filtered.length === 1 ? 'Channel' : 'Focus on one channel'}
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
                <div className="cs-card p-6 space-y-6">
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
                          className="h-24 w-24 rounded-full object-cover ring-2 ring-[var(--accent)] hover:opacity-90"
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
                        View channel on YouTube ↗
                      </a>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted-2)]">
                        <span>{formatCount(selected.subscriber_count || 0)} subscribers</span>
                        <span>{formatCount(selected.view_count || 0)} total views</span>
                        <span>{formatCount(selected.video_count || 0)} videos</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                      Top 5 videos
                    </h4>
                    {videosLoading ? (
                      <p className="text-[var(--muted)] text-sm">Loading videos…</p>
                    ) : channelVideos && channelVideos.length > 0 ? (
                      <>
                        <div className="mb-6">
                          <TopVideosChart
                            videos={channelVideos.map((v) => ({
                              title: v.title,
                              view_count: v.view_count,
                            }))}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {channelVideos.map((v, i) => (
                            <VideoThumbnailLink
                              key={v.id}
                              videoId={v.video_id}
                              title={v.title}
                              thumbnailUrl={v.thumbnail_url}
                              views={v.view_count}
                              likes={v.like_count}
                              comments={v.comment_count}
                              rank={i + 1}
                              layout="card"
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">No videos loaded for this channel.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </TrackingLayout>
    </DashboardShell>
  )
}
