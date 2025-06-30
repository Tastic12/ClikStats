'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { useChannels, useChannelMetrics, useVideos } from '../../../lib/hooks'
import { ChannelMetricsChart, TopVideosChart, ChannelDistributionChart, MetricCard } from '../../components/Charts'
import type { Channel, Video } from '../../../lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

  const { channels, isLoading: channelsLoading } = useChannels()
  const { metrics: channelMetrics, isLoading: metricsLoading } = useChannelMetrics(selectedChannel?.id)
  const { videos, isLoading: videosLoading } = useVideos(selectedChannel?.id)

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) {
        router.push('/auth')
        return
      }
      setUser(session.user)
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0])
    }
  }, [channels, selectedChannel])

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  }

  const totalSubscribers = channels?.reduce((sum: number, channel: Channel) => sum + (channel.subscriber_count || 0), 0) || 0
  const totalViews = channels?.reduce((sum: number, channel: Channel) => sum + (channel.view_count || 0), 0) || 0
  const totalVideos = channels?.reduce((sum: number, channel: Channel) => sum + (channel.video_count || 0), 0) || 0

  const latestMetrics = channelMetrics?.[0]
  const previousMetrics = channelMetrics?.[1]
  
  const subscriberChange = latestMetrics && previousMetrics 
    ? latestMetrics.subscriber_count - previousMetrics.subscriber_count 
    : 0

  const viewChange = latestMetrics && previousMetrics 
    ? latestMetrics.view_count - previousMetrics.view_count 
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                YouTube Analytics Pro
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 font-medium">
                Dashboard
              </Link>
              <Link href="/tracking" className="text-gray-700 hover:text-gray-900">
                Tracking
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {(!channels || channels.length === 0) && (
              <Link 
                href="/onboarding"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Add Channel
              </Link>
            )}
          </div>
        </div>

        {channelsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-600">Loading channels...</div>
          </div>
        ) : !channels || channels.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No channels</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first YouTube channel.</p>
            <div className="mt-6">
              <Link 
                href="/onboarding"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Channel
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Total Subscribers"
                value={totalSubscribers}
                format="subscribers"
              />
              <MetricCard
                title="Total Views"
                value={totalViews}
                format="views"
              />
              <MetricCard
                title="Total Videos"
                value={totalVideos}
                format="number"
              />
            </div>

            {/* Channel Selector */}
            {channels.length > 1 && (
              <div className="mb-6">
                <label htmlFor="channel-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Channel
                </label>
                <select
                  id="channel-select"
                  value={selectedChannel?.id || ''}
                  onChange={(e) => {
                    const channel = channels.find(c => c.id === e.target.value)
                    setSelectedChannel(channel || null)
                  }}
                  className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.channel_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedChannel && (
              <>
                {/* Selected Channel Overview */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                  <div className="flex items-center mb-4">
                    {selectedChannel.thumbnail_url && (
                      <img 
                        src={selectedChannel.thumbnail_url} 
                        alt={selectedChannel.channel_name}
                        className="w-16 h-16 rounded-full mr-4"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedChannel.channel_name}</h2>
                      <p className="text-gray-600">{selectedChannel.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                      title="Subscribers"
                      value={selectedChannel.subscriber_count || 0}
                      change={subscriberChange}
                      format="subscribers"
                    />
                    <MetricCard
                      title="Total Views"
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
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Subscriber Growth */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Subscriber Growth</h3>
                    {metricsLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-gray-600">Loading metrics...</div>
                      </div>
                    ) : channelMetrics && channelMetrics.length > 0 ? (
                      <ChannelMetricsChart metrics={channelMetrics} metricType="subscriber_count" />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No metric data available
                      </div>
                    )}
                  </div>

                  {/* View Count Growth */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">View Count Growth</h3>
                    {metricsLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-gray-600">Loading metrics...</div>
                      </div>
                    ) : channelMetrics && channelMetrics.length > 0 ? (
                      <ChannelMetricsChart metrics={channelMetrics} metricType="view_count" />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No metric data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Videos */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Top Videos</h3>
                  {videosLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-gray-600">Loading videos...</div>
                    </div>
                  ) : videos && videos.length > 0 ? (
                    <TopVideosChart videos={videos} />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No videos available
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Channel Distribution (if multiple channels) */}
            {channels.length > 1 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Distribution</h3>
                <ChannelDistributionChart channels={channels} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 