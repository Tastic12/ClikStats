'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../../lib/supabase'
import {
  useCompetitorChannels,
  useCompetitorChannelVideos,
  initCompetitorChannel,
} from '../../../../../lib/hooks'
import { DashboardShell } from '../../../../components/DashboardShell'
import { TrackingLayout } from '../../../../components/TrackingLayout'
import { ItemTabs } from '../../../../components/ItemTabs'
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { channels, isLoading, mutate } = useCompetitorChannels()
  const { videos: channelVideos, isLoading: videosLoading } = useCompetitorChannelVideos(
    selectedId || undefined
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  const filtered = applyMetricFilters(channels || [], filters)
  const best = filtered.length
    ? [...filtered].sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0))[0]
    : null

  const selected = filtered.find((c) => c.id === selectedId) || filtered[0] || null

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
      await initCompetitorChannel(url)
      setUrl('')
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel')
    } finally {
      setLoading(false)
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
        <div className="space-y-6">
          <div className="cs-card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">
              Add competitor channel
            </h2>
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

          {isLoading ? (
            <p className="text-center text-[var(--muted)] py-8">Loading competitors…</p>
          ) : !filtered.length ? (
            <p className="text-center text-[var(--muted)] py-8">No channels match your filters.</p>
          ) : (
            <>
              {best && (
                <div className="cs-card border-[var(--success)] p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--success)]">
                    Leading channel
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {best.thumbnail_url && (
                      <img
                        src={best.thumbnail_url}
                        alt=""
                        className="h-12 w-12 rounded-full ring-2 ring-[var(--success)]"
                      />
                    )}
                    <div>
                      <p className="text-lg font-bold text-[var(--foreground)]">{best.channel_name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatCount(best.subscriber_count || 0)} subscribers ·{' '}
                        {formatCount(best.view_count || 0)} views ·{' '}
                        {formatCount(best.video_count || 0)} videos
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ItemTabs
                items={filtered.map((c) => ({
                  id: c.id,
                  label: c.channel_name,
                  thumbnailUrl: c.thumbnail_url,
                }))}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
              />

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
