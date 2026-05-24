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
import {
  MetricFilters,
  defaultMetricFilters,
  applyMetricFilters,
  type MetricFiltersState,
} from '../../../../components/MetricFilters'
import { formatCount } from '@/lib/format'
import { youtubeWatchUrl } from '@/lib/youtube'
import { TopVideosChart } from '../../../../components/Charts'

export default function CompetitorChannelsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<MetricFiltersState>(defaultMetricFilters)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { channels, isLoading, mutate } = useCompetitorChannels()
  const { videos: expandedVideos } = useCompetitorChannelVideos(expandedId || undefined)

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading…</p>
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
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Add competitor channel</h2>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/@competitor"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Add channel'}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <MetricFilters filters={filters} onChange={setFilters} showSubscribers />

          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading competitors…</p>
          ) : !filtered.length ? (
            <p className="text-center text-gray-500 py-8">No competitor channels match your filters.</p>
          ) : (
            <>
              {best && (
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase text-green-800">Leading channel</p>
                  <p className="text-lg font-bold text-green-900">{best.channel_name}</p>
                  <p className="text-sm text-green-800">
                    {formatCount(best.subscriber_count || 0)} subscribers ·{' '}
                    {formatCount(best.view_count || 0)} total views
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {filtered.map((ch) => (
                  <div key={ch.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === ch.id ? null : ch.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50"
                    >
                      {ch.thumbnail_url && (
                        <img src={ch.thumbnail_url} alt="" className="h-12 w-12 rounded-full" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{ch.channel_name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCount(ch.subscriber_count || 0)} subs ·{' '}
                          {formatCount(ch.view_count || 0)} views
                        </p>
                      </div>
                      <span className="text-sm text-blue-600">
                        {expandedId === ch.id ? 'Hide' : 'Top 5 videos'}
                      </span>
                    </button>
                    {expandedId === ch.id && expandedVideos && expandedVideos.length > 0 && (
                      <div className="border-t border-gray-100 p-4">
                        <TopVideosChart
                          videos={expandedVideos.map((v) => ({
                            title: v.title,
                            view_count: v.view_count,
                          }))}
                        />
                        <ul className="mt-4 space-y-2">
                          {expandedVideos.map((v, i) => (
                            <li key={v.id}>
                              <a
                                href={youtubeWatchUrl(v.video_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {i + 1}. {v.title} ({formatCount(v.view_count || 0)} views) ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </TrackingLayout>
    </DashboardShell>
  )
}
