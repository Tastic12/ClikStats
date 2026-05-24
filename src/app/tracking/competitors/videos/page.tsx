'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../../lib/supabase'
import { useCompetitorVideos, initCompetitorVideo } from '../../../../../lib/hooks'
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

export default function CompetitorVideosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<MetricFiltersState>(defaultMetricFilters)

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
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Track competitor video</h2>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Add video'}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <MetricFilters filters={filters} onChange={setFilters} />

          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading videos…</p>
          ) : !filtered.length ? (
            <p className="text-center text-gray-500 py-8">No videos match your filters.</p>
          ) : (
            <div className="grid gap-4">
              {filtered.map((video, index) => (
                <a
                  key={video.id}
                  href={youtubeWatchUrl(video.youtube_video_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition"
                >
                  <span className="text-lg font-bold text-gray-300 w-6">{index + 1}</span>
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      className="w-32 h-20 object-cover rounded-md bg-gray-100"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 line-clamp-2">{video.title}</p>
                    {video.channel_name && (
                      <p className="text-sm text-gray-500 mt-1">{video.channel_name}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>{formatCount(video.view_count || 0)} views</span>
                      <span>{formatCount(video.like_count || 0)} likes</span>
                      <span>{formatCount(video.comment_count || 0)} comments</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </TrackingLayout>
    </DashboardShell>
  )
}
