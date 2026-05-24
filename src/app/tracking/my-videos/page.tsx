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
import {
  VideoMetricsChart,
  VideoPerformanceOverviewChart,
  MetricCard,
} from '../../../components/Charts'
import { DashboardShell } from '../../../components/DashboardShell'
import { TrackingLayout } from '../../../components/TrackingLayout'
import { VideoThumbnailLink } from '../../../components/VideoThumbnailLink'

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

  const chartMetrics = selectedVideo && buildVideoChartMetrics(selectedVideo, videoMetrics)
  const hasHistory = (videoMetrics?.length ?? 0) >= 2

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
            first.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-4 xl:col-span-3 space-y-4">
              <input
                type="search"
                placeholder="Search your videos…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cs-input w-full px-3 py-2 text-sm"
              />
              <div className="divide-y divide-[var(--border)] max-h-[36rem] overflow-y-auto">
                {videosLoading ? (
                  <p className="p-4 text-sm text-[var(--muted)]">Loading…</p>
                ) : (
                  filteredVideos?.map((video) => (
                    <div
                      key={video.id}
                      className={`flex items-stretch gap-1 p-1 ${
                        selectedVideo?.id === video.id ? 'bg-[var(--elevated)] ring-1 ring-[var(--accent)] rounded-lg' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <VideoThumbnailLink
                          videoId={video.video_id}
                          title={video.title}
                          thumbnailUrl={video.thumbnail_url}
                          views={video.view_count}
                          likes={video.like_count}
                          layout="row"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedVideo(video)}
                        className="shrink-0 self-center px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--card)] rounded"
                      >
                        Stats
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-8 xl:col-span-9">
              {selectedVideo ? (
                <div className="space-y-8">
                  <div className="pb-6 border-b border-[var(--border)]">
                    <VideoThumbnailLink
                      videoId={selectedVideo.video_id}
                      title={selectedVideo.title}
                      thumbnailUrl={selectedVideo.thumbnail_url}
                      views={selectedVideo.view_count}
                      likes={selectedVideo.like_count}
                      comments={selectedVideo.comment_count}
                      layout="row"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-8 pb-6 border-b border-[var(--border)]">
                    <MetricCard title="Views" value={selectedVideo.view_count || 0} format="views" />
                    <MetricCard title="Likes" value={selectedVideo.like_count || 0} format="number" />
                    <MetricCard
                      title="Comments"
                      value={selectedVideo.comment_count || 0}
                      format="number"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                      Performance over time
                    </h3>
                    {!hasHistory && (
                      <p className="text-xs text-[var(--muted)] px-0 py-2 mb-4">
                        Snapshot from publish to now. Daily syncs will build full history.
                      </p>
                    )}
                    {metricsLoading ? (
                      <p className="text-[var(--muted)] py-12 text-center">Loading charts…</p>
                    ) : chartMetrics ? (
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-sm font-medium text-[var(--muted)] mb-2">
                            Overview
                          </h4>
                          <VideoPerformanceOverviewChart metrics={chartMetrics} />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Views</h4>
                          <VideoMetricsChart metrics={chartMetrics} metricType="view_count" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Likes</h4>
                          <VideoMetricsChart metrics={chartMetrics} metricType="like_count" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[var(--muted)] mb-2">
                            Comments
                          </h4>
                          <VideoMetricsChart metrics={chartMetrics} metricType="comment_count" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-[var(--muted)] text-center py-12">Select a video to view analytics.</p>
              )}
            </div>
          </div>
        )}
      </TrackingLayout>
    </DashboardShell>
  )
}
