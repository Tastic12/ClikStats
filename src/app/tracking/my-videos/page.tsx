'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabase'
import type { Video } from '../../../../lib/supabase'
import {
  useOwnedChannel,
  useVideos,
  useVideoMetrics,
  buildVideoChartMetrics,
} from '../../../../lib/hooks'
import { VideoMetricsChart, MetricCard } from '../../../components/Charts'
import { DashboardShell } from '../../../components/DashboardShell'
import { TrackingLayout } from '../../../components/TrackingLayout'
import { youtubeWatchUrl } from '@/lib/youtube'

export default function MyVideosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { channel, isLoading: channelLoading } = useOwnedChannel()
  const { videos, isLoading: videosLoading } = useVideos(channel?.id)
  const { metrics: videoMetrics, isLoading: metricsLoading } = useVideoMetrics(selectedVideo?.id)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  useEffect(() => {
    if (videos?.length && !selectedVideo) setSelectedVideo(videos[0])
  }, [videos, selectedVideo])

  const filteredVideos = videos?.filter((v) =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const chartMetrics =
    selectedVideo && buildVideoChartMetrics(selectedVideo, videoMetrics)
  const hasHistory = (videoMetrics?.length ?? 0) >= 2

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
        {!channelLoading && !channel ? (
          <p className="text-sm text-gray-600">
            Connect your channel on the{' '}
            <a href="/dashboard" className="text-blue-600 hover:underline">
              dashboard
            </a>{' '}
            first.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <input
                type="search"
                placeholder="Search your videos…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="bg-white border border-gray-200 rounded-xl divide-y max-h-[32rem] overflow-y-auto">
                {videosLoading ? (
                  <p className="p-4 text-sm text-gray-500">Loading…</p>
                ) : (
                  filteredVideos?.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setSelectedVideo(video)}
                      className={`w-full text-left p-3 hover:bg-gray-50 ${
                        selectedVideo?.id === video.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(video.view_count || 0).toLocaleString()} views
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedVideo ? (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <a
                      href={youtubeWatchUrl(selectedVideo.video_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-bold text-gray-900 hover:text-blue-600"
                    >
                      {selectedVideo.title} ↗
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <MetricCard title="Views" value={selectedVideo.view_count || 0} format="views" />
                    <MetricCard title="Likes" value={selectedVideo.like_count || 0} format="number" />
                    <MetricCard
                      title="Comments"
                      value={selectedVideo.comment_count || 0}
                      format="number"
                    />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-2">Performance over time</h3>
                    {!hasHistory && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2 mb-4">
                        Showing a snapshot trend from publish to now. Daily syncs will build full
                        history.
                      </p>
                    )}
                    {metricsLoading ? (
                      <p className="text-gray-500 py-12 text-center">Loading charts…</p>
                    ) : chartMetrics ? (
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Views</h4>
                          <VideoMetricsChart metrics={chartMetrics} metricType="view_count" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Likes</h4>
                          <VideoMetricsChart metrics={chartMetrics} metricType="like_count" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">Select a video to view analytics.</p>
              )}
            </div>
          </div>
        )}
      </TrackingLayout>
    </DashboardShell>
  )
}
