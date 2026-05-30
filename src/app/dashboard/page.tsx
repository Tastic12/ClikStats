'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import {
  useOwnedChannel,
  useChannelMetrics,
  useUnifiedOutlierFeed,
  useCompetitorChannels,
} from '../../../lib/hooks'
import { topOutliers } from '../../../lib/outliers'
import { MetricCard } from '../../components/Charts'
import { DashboardShell } from '../../components/DashboardShell'
import { AddChannelForm } from '../../components/AddChannelForm'
import { TopOutliersWidget } from '../../components/TopOutliersWidget'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)

  const { channel, isLoading: channelsLoading, mutate: mutateChannels } = useOwnedChannel()
  const { metrics: channelMetrics } = useChannelMetrics(channel?.id)
  const { channels: competitors } = useCompetitorChannels()
  const { items: outlierItems, isLoading: outliersLoading } = useUnifiedOutlierFeed()

  const topPerformers = useMemo(() => topOutliers(outlierItems, 5), [outlierItems])

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

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
      <div className="w-full max-w-none space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Competitive intelligence at a glance — your channel is shown in the header above.
          </p>
        </header>

        {channelsLoading ? (
          <p className="text-[var(--muted)] py-12 text-center">Loading…</p>
        ) : !channel ? (
          <section className="max-w-xl rounded-xl ring-1 ring-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Connect your YouTube channel
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Optional baseline for your own outliers and thumbnails. Competitor tracking works
              without it.
            </p>
            <div className="mt-6">
              <AddChannelForm onSuccess={() => mutateChannels()} />
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl ring-1 ring-[var(--border)] p-4 bg-[var(--elevated)]/20">
                  <MetricCard
                    title="Subscribers"
                    value={channel.subscriber_count || 0}
                    change={subscriberChange}
                    format="subscribers"
                  />
                </div>
                <div className="rounded-xl ring-1 ring-[var(--border)] p-4 bg-[var(--elevated)]/20">
                  <MetricCard
                    title="Total views"
                    value={channel.view_count || 0}
                    change={viewChange}
                    format="views"
                  />
                </div>
                <div className="rounded-xl ring-1 ring-[var(--border)] p-4 bg-[var(--elevated)]/20">
                  <MetricCard title="Videos" value={channel.video_count || 0} format="number" />
                </div>
              </section>

              <section className="rounded-xl ring-1 ring-[var(--border)] p-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Quick links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <QuickLink
                    href="/tracking/competitors/channels"
                    title="Competitor channels"
                    detail={`${competitors?.length ?? 0} tracked`}
                  />
                  <QuickLink
                    href="/tracking/outliers"
                    title="Performing now"
                    detail="Outliers across all sources"
                  />
                  <QuickLink href="/tracking/discover" title="Discover trending" detail="Niche research" />
                  <QuickLink
                    href="/tracking/thumbnails"
                    title="Thumbnail search"
                    detail="Visual search your index"
                  />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <TopOutliersWidget items={topPerformers} isLoading={outliersLoading} />

              <section className="rounded-xl ring-1 ring-[var(--border)] p-4 text-xs text-[var(--muted)]">
                <p>
                  Use the header to <strong className="text-[var(--foreground)]">change channel</strong>{' '}
                  when needed. Competitor folders and outlier scores live under{' '}
                  <strong className="text-[var(--foreground)]">Competitors</strong> in the sidebar.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function QuickLink({
  href,
  title,
  detail,
}: {
  href: string
  title: string
  detail: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-3 ring-1 ring-[var(--border)] hover:ring-[var(--accent)] bg-[var(--card)]/30 hover:bg-[var(--elevated)]/40 transition-colors"
    >
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="text-[10px] text-[var(--muted)] mt-0.5">{detail}</p>
    </Link>
  )
}
