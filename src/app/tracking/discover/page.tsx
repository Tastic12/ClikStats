'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabase'
import {
  useDiscoverVideos,
  fetchDiscoverSettings,
  saveDiscoverSettings,
  syncDiscoverTrending,
  type DiscoverSettings,
} from '../../../../lib/hooks'
import { useShortsPreference } from '../../../../lib/preferences'
import {
  YOUTUBE_VIDEO_CATEGORIES,
  DISCOVER_REGIONS,
  DEFAULT_DISCOVER_CATEGORY_IDS,
  categoryLabel,
} from '../../../../lib/youtube-discover'
import { DashboardShell } from '../../../components/DashboardShell'
import { TrackingLayout } from '../../../components/TrackingLayout'
import { youtubeWatchUrl } from '@/lib/youtube'
import { formatCount } from '@/lib/format'

function similarLink(videoId: string, title: string) {
  const params = new URLSearchParams({ similar: videoId, title })
  return `/tracking/thumbnails?${params.toString()}`
}

export default function DiscoverPage() {
  const router = useRouter()
  const { hideShorts } = useShortsPreference()
  const [user, setUser] = useState<User | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [settings, setSettings] = useState<DiscoverSettings>({
    region_code: 'GB',
    category_ids: [...DEFAULT_DISCOVER_CATEGORY_IDS],
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const { videos, isLoading, mutate } = useDiscoverVideos(categoryFilter)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  useEffect(() => {
    if (!user) return
    fetchDiscoverSettings()
      .then(setSettings)
      .catch(() => {})
  }, [user])

  const visibleVideos = useMemo(() => {
    const list = videos ?? []
    return hideShorts ? list.filter((v) => v.is_short !== true) : list
  }, [videos, hideShorts])

  const toggleCategory = (id: number) => {
    setSettings((prev) => {
      const has = prev.category_ids.includes(id)
      const next = has
        ? prev.category_ids.filter((c) => c !== id)
        : [...prev.category_ids, id]
      return { ...prev, category_ids: next.length ? next : [...DEFAULT_DISCOVER_CATEGORY_IDS] }
    })
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setStatusMsg('')
    try {
      await saveDiscoverSettings(settings)
      setStatusMsg('Preferences saved.')
      setSettingsOpen(false)
      await mutate()
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setStatusMsg('')
    try {
      const r = await syncDiscoverTrending()
      await mutate()
      setStatusMsg(
        r.errors?.length
          ? `Saved ${r.saved} videos (${r.errors.length} category errors).`
          : `Fetched ${r.fetched} trending videos (${r.api_calls} API calls).`
      )
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Sync failed.')
    } finally {
      setSyncing(false)
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
        <div className="space-y-6 w-full">
          <section className="pb-6 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              What is Discover?
            </h2>
            <p className="text-xs text-[var(--muted)] max-w-3xl">
              Daily <strong>YouTube trending</strong> videos in the categories you care about.
              Browse what&apos;s performing right now beyond the channels you track — and those
              thumbnails are included in <strong>Thumbnail search</strong> automatically once
              indexed.
            </p>
          </section>

          <section className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="cs-input min-h-11 px-3 py-2 text-sm hover:bg-[var(--card)]"
            >
              {settingsOpen ? 'Hide preferences' : 'Preferences'}
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="cs-btn-primary min-h-11 px-4 py-2 text-sm disabled:opacity-50"
            >
              {syncing ? 'Fetching trending…' : 'Refresh trending now'}
            </button>
            {statusMsg && (
              <p className="text-xs text-[var(--muted-2)] w-full sm:w-auto">{statusMsg}</p>
            )}
          </section>

          {settingsOpen && (
            <section className="rounded-lg bg-[var(--elevated)]/40 ring-1 ring-[var(--border)] p-4 space-y-4">
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">Region</label>
                <select
                  value={settings.region_code}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, region_code: e.target.value }))
                  }
                  className="cs-input px-3 py-2 text-sm min-h-11"
                >
                  {DISCOVER_REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] mb-2">Categories to fetch & browse</p>
                <div className="flex flex-wrap gap-2">
                  {YOUTUBE_VIDEO_CATEGORIES.map((cat) => {
                    const active = settings.category_ids.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`min-h-11 rounded-full px-3 py-2 text-xs font-medium ring-1 transition-colors ${
                          active
                            ? 'bg-[var(--accent)] text-white ring-[var(--accent)]'
                            : 'bg-[var(--card)] text-[var(--muted)] ring-[var(--border)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="cs-btn-primary min-h-11 px-4 py-2 text-sm disabled:opacity-50"
              >
                {savingSettings ? 'Saving…' : 'Save preferences'}
              </button>
            </section>
          )}

          <section>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`shrink-0 min-h-11 rounded-full px-3 py-2 text-xs font-medium ring-1 ${
                  categoryFilter === null
                    ? 'bg-[var(--accent)] text-white ring-[var(--accent)]'
                    : 'bg-[var(--elevated)] text-[var(--muted)] ring-[var(--border)]'
                }`}
              >
                All categories
              </button>
              {settings.category_ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategoryFilter(id)}
                  className={`shrink-0 min-h-11 rounded-full px-3 py-2 text-xs font-medium ring-1 whitespace-nowrap ${
                    categoryFilter === id
                      ? 'bg-[var(--accent)] text-white ring-[var(--accent)]'
                      : 'bg-[var(--elevated)] text-[var(--muted)] ring-[var(--border)]'
                  }`}
                >
                  {categoryLabel(id)}
                </button>
              ))}
            </div>
          </section>

          {isLoading ? (
            <p className="text-center text-[var(--muted)] py-12">Loading trending videos…</p>
          ) : !visibleVideos.length ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-[var(--muted)]">No trending videos yet for your preferences.</p>
              <p className="text-xs text-[var(--muted-2)] max-w-md mx-auto">
                Click <strong>Refresh trending now</strong> to pull today&apos;s chart from YouTube.
                A nightly cron can keep this updated automatically (see ROADMAP).
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--muted)]">
                {visibleVideos.length} trending video{visibleVideos.length === 1 ? '' : 's'}
                {hideShorts && (videos?.length ?? 0) > visibleVideos.length && (
                  <span className="text-[var(--muted-2)]">
                    {' '}
                    · {(videos?.length ?? 0) - visibleVideos.length} Short
                    {(videos?.length ?? 0) - visibleVideos.length === 1 ? '' : 's'} hidden
                  </span>
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleVideos.map((v) => (
                  <DiscoverVideoCard key={v.id} video={v} />
                ))}
              </div>
            </>
          )}
        </div>
      </TrackingLayout>
    </DashboardShell>
  )
}

function DiscoverVideoCard({
  video,
}: {
  video: {
    video_id: string
    title: string
    thumbnail_url: string
    channel_name?: string | null
    category_id: number
    view_count?: number
  }
}) {
  const href = youtubeWatchUrl(video.video_id)

  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-[var(--elevated)]/50 ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-all">
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        <div className="aspect-video bg-[var(--elevated)] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          <span className="absolute top-1 left-1 rounded bg-violet-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            Trending
          </span>
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white max-w-[90%] truncate">
            {categoryLabel(video.category_id)}
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-[var(--foreground)] line-clamp-2">{video.title}</p>
          {video.channel_name && (
            <p className="text-xs text-[var(--muted)] mt-1 truncate">{video.channel_name}</p>
          )}
          {video.view_count != null && (
            <p className="text-[10px] text-[var(--muted-2)] mt-1.5">
              {formatCount(video.view_count)} views
            </p>
          )}
        </div>
      </a>
      <div className="px-3 pb-3 -mt-1">
        <a
          href={similarLink(video.video_id, video.title)}
          className="flex items-center justify-center min-h-11 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)] rounded px-2 py-2 bg-[var(--card)]/40 hover:bg-[var(--card)] ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-colors"
        >
          Find similar thumbnails
        </a>
      </div>
    </div>
  )
}
