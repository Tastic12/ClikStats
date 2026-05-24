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
import { VideoThumbnailLink } from '../../components/VideoThumbnailLink'
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <p className="text-[var(--muted)]">Loading…</p>
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Your connected channel at a glance.</p>
        </div>

        {channelsLoading ? (
          <p className="text-[var(--muted)] py-12 text-center">Loading…</p>
        ) : !channel ? (
          <div className="cs-card border-dashed p-8">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Connect your YouTube channel</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              One channel per account. Paste your channel URL to start tracking.
            </p>
            <div className="mt-6 max-w-lg">
              <AddChannelForm
                onSuccess={() => {
                  mutateChannels()
                  mutateVideos()
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="cs-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {channel.thumbnail_url && (
                  <img
                    src={channel.thumbnail_url}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--accent)]"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                    Your channel
                  </p>
                  <h2 className="text-xl font-bold text-[var(--foreground)] truncate">
                    {channel.channel_name}
                  </h2>
                  <a
                    href={channel.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--accent)] hover:underline truncate block"
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
              <MetricCard title="Videos" value={channel.video_count || 0} format="number" />
            </div>

            {latestVideo && (
              <div className="cs-card p-6">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Latest upload</h3>
                <VideoThumbnailLink
                  videoId={latestVideo.video_id}
                  title={latestVideo.title}
                  thumbnailUrl={latestVideo.thumbnail_url}
                  subtitle={`Published ${new Date(latestVideo.published_at).toLocaleDateString()}`}
                  views={latestVideo.view_count}
                  likes={latestVideo.like_count}
                  comments={latestVideo.comment_count}
                  layout="row"
                />
              </div>
            )}

            <div className="cs-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Top 5 videos</h3>
                <Link
                  href="/tracking/my-videos"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Video analytics →
                </Link>
              </div>
              {videosLoading ? (
                <p className="text-sm text-[var(--muted)] py-8 text-center">Loading videos…</p>
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
