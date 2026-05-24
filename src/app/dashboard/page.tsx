'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import type { Channel } from '../../../lib/supabase'
import {
  useChannels,
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

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

  const { channels, isLoading: channelsLoading, mutate: mutateChannels } = useChannels()
  const { metrics: channelMetrics, isLoading: metricsLoading } = useChannelMetrics(
    selectedChannel?.id
  )
  const { videos, isLoading: videosLoading, mutate: mutateVideos } = useVideos(
    selectedChannel?.id
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        router.push('/auth')
        return
      }
      setUser(u)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.push('/auth')
      else setUser(session.user)
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0])
    }
  }, [channels, selectedChannel])

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
            Track subscribers, views, and how your latest videos are performing.
          </p>
        </div>

        {channelsLoading ? (
          <p className="text-gray-600 py-12 text-center">Loading your channels…</p>
        ) : !channels?.length ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8">
            <h2 className="text-lg font-semibold text-gray-900">Connect your YouTube channel</h2>
            <p className="mt-2 text-sm text-gray-600">
              Paste your channel URL to start tracking subscribers, views, and video performance.
            </p>
            <div className="mt-6 max-w-lg">
              <AddChannelForm onSuccess={handleChannelAdded} />
            </div>
          </div>
        ) : (
          <>
            {channels.length > 1 && (
              <div>
                <label htmlFor="channel-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Active channel
                </label>
                <select
                  id="channel-select"
                  value={selectedChannel?.id || ''}
                  onChange={(e) => {
                    const ch = channels.find((c) => c.id === e.target.value)
                    setSelectedChannel(ch || null)
                  }}
                  className="max-w-md w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.channel_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedChannel && (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {selectedChannel.thumbnail_url && (
                      <img
                        src={selectedChannel.thumbnail_url}
                        alt=""
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                        Connected channel
                      </p>
                      <h2 className="text-xl font-bold text-gray-900 truncate">
                        {selectedChannel.channel_name}
                      </h2>
                      <a
                        href={selectedChannel.channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate block"
                      >
                        {selectedChannel.channel_url}
                      </a>
                    </div>
                    <Link
                      href="/onboarding"
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
                    >
                      + Add another
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MetricCard
                    title="Subscribers"
                    value={selectedChannel.subscriber_count || 0}
                    change={subscriberChange}
                    format="subscribers"
                  />
                  <MetricCard
                    title="Total views"
                    value={selectedChannel.view_count || 0}
                    change={viewChange}
                    format="views"
                  />
                  <MetricCard
                    title="Videos"
                    value={selectedChannel.video_count || 0}
                    format="number"
                  />
                </div>

                {latestVideo && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest upload</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {latestVideo.thumbnail_url && (
                        <img
                          src={latestVideo.thumbnail_url}
                          alt=""
                          className="w-full sm:w-48 aspect-video object-cover rounded-lg bg-gray-100"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{latestVideo.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Published {new Date(latestVideo.published_at).toLocaleDateString()}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <span className="text-gray-700">
                            <strong>{formatCount(latestVideo.view_count || 0)}</strong> views
                          </span>
                          <span className="text-gray-700">
                            <strong>{formatCount(latestVideo.like_count || 0)}</strong> likes
                          </span>
                          <span className="text-gray-700">
                            <strong>{formatCount(latestVideo.comment_count || 0)}</strong> comments
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Top 5 videos</h3>
                    <Link href="/tracking" className="text-sm font-medium text-blue-600 hover:underline">
                      View all →
                    </Link>
                  </div>
                  {videosLoading ? (
                    <p className="text-sm text-gray-500 py-8 text-center">Loading videos…</p>
                  ) : (
                    <TopVideosList videos={topVideos} />
                  )}
                </div>

                {!metricsLoading && channelMetrics && channelMetrics.length > 1 && (
                  <p className="text-xs text-gray-500 text-center">
                    Historical charts available on the Videos page. Daily updates run via Supabase cron.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
