'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../../lib/supabase'
import { useCompetitorVideos, initCompetitorVideo } from '../../../../../lib/hooks'
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
import { MetricCard } from '../../../../components/Charts'

export default function CompetitorVideosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<MetricFiltersState>(defaultMetricFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { videos, isLoading, mutate } = useCompetitorVideos()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  const filtered = applyMetricFilters(videos || [], filters).sort(
    (a, b) => (b.view_count || 0) - (a.view_count || 0)
  )

  const selected = filtered.find((v) => v.id === selectedId) || filtered[0] || null

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
    try {
      await initCompetitorVideo(url)
      setUrl('')
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video')
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
              Track competitor video
            </h2>
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
          </div>

          <MetricFilters filters={filters} onChange={setFilters} />

          {isLoading ? (
            <p className="text-center text-[var(--muted)] py-8">Loading videos…</p>
          ) : !filtered.length ? (
            <p className="text-center text-[var(--muted)] py-8">No videos match your filters.</p>
          ) : (
            <>
              <ItemTabs
                items={filtered.map((v) => ({
                  id: v.id,
                  label: v.title.length > 28 ? v.title.slice(0, 28) + '…' : v.title,
                  thumbnailUrl: v.thumbnail_url,
                }))}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
              />

              {selected && (
                <div className="cs-card p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      layout="card"
                    />
                    <div className="space-y-4">
                      {selected.channel_name && (
                        <p className="text-sm text-[var(--muted)]">{selected.channel_name}</p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((video, index) => (
                  <VideoThumbnailLink
                    key={video.id}
                    videoId={video.youtube_video_id}
                    title={video.title}
                    thumbnailUrl={video.thumbnail_url}
                    subtitle={video.channel_name}
                    views={video.view_count}
                    likes={video.like_count}
                    comments={video.comment_count}
                    rank={index + 1}
                    layout="card"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </TrackingLayout>
    </DashboardShell>
  )
}
