'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import {
  useOwnedChannel,
  useChannelMetrics,
  useVideos,
  getTopVideos,
  getLatestVideo,
} from '../../../lib/hooks'
import { MetricCard } from '../../components/Charts'
import { DashboardShell } from '../../components/DashboardShell'
import { AddChannelForm } from '../../components/AddChannelForm'
import { TopVideosList } from '../../components/TopVideosList'
import { formatCount } from '@/lib/format'
import { youtubeWatchUrl } from '@/lib/youtube'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)

  const { channel, isLoading: channelsLoading, mutate: mutateChannels } = useOwnedChannel()
  const { metrics: channelMetrics } = useChannelMetrics(channel?.id)
  const { videos, isLoading: videosLoading, mutate: mutateVideos } = useVideos(channel?.id)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.push('/auth')
      else setUser(session.user)
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleChannelAdded = () => {
    mutateChannels()
    mutateVideos()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  const topVideos = getTopVideos(videos, 5)
  const latestVideo = getLatestVideo(videos)
  const latestMetrics = channelMetrics?.[0]
  const previousMetrics = channelMetrics?.[1]
  const subscriberChange =
    latestMetrics && previousMetrics
      ? latestMetrics.subscriber_count - previousMetrics.subscriber_count
      : 0
  const viewChange =
    latestMetrics && previousMetrics
      ? latestMetrics.view_count - previousMetrics.view_count
      : 0

  return (
    <DashboardShell email={user.email} onSignOut={handleSignOut}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Your connected channel at a glance.
          </p>
        </div>

        {channelsLoading ? (
          <p className="text-gray-600 py-12 text-center">Loading…</p>
        ) : !channel ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8">
            <h2 className="text-lg font-semibold text-gray-900">Connect your YouTube channel</h2>
            <p className="mt-2 text-sm text-gray-600">
              One channel per account. Paste your channel URL to start tracking.
            </p>
            <div className="mt-6 max-w-lg">
              <AddChannelForm onSuccess={handleChannelAdded} />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {channel.thumbnail_url && (
                  <img
                    src={channel.thumbnail_url}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Your channel
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 truncate">{channel.channel_name}</h2>
                  <a
                    href={channel.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate block"
                  >
                    {channel.channel_url}
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Subscribers"
                value={channel.subscriber_count || 0}
                change={subscriberChange}
                format="subscribers"
              />
              <MetricCard
                title="Total views"
                value={channel.view_count || 0}
                change={viewChange}
                format="views"
              />
              <MetricCard
                title="Videos"
                value={channel.video_count || 0}
                format="number"
              />
            </div>

            {latestVideo && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest upload</h3>
                <a
                  href={youtubeWatchUrl(latestVideo.video_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row gap-4 group"
                >
                  {latestVideo.thumbnail_url && (
                    <img
                      src={latestVideo.thumbnail_url}
                      alt=""
                      className="w-full sm:w-48 aspect-video object-cover rounded-lg bg-gray-100"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-600">
                      {latestVideo.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Published {new Date(latestVideo.published_at).toLocaleDateString()} · Watch on
                      YouTube ↗
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span>
                        <strong>{formatCount(latestVideo.view_count || 0)}</strong> views
                      </span>
                      <span>
                        <strong>{formatCount(latestVideo.like_count || 0)}</strong> likes
                      </span>
                      <span>
                        <strong>{formatCount(latestVideo.comment_count || 0)}</strong> comments
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top 5 videos</h3>
                <Link
                  href="/tracking/my-videos"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Video analytics →
                </Link>
              </div>
              {videosLoading ? (
                <p className="text-sm text-gray-500 py-8 text-center">Loading videos…</p>
              ) : (
                <TopVideosList videos={topVideos} />
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
