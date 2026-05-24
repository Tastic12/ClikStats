'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { useChannels, useVideos, useVideoMetrics } from '../../../lib/hooks'
import { VideoMetricsChart, MetricCard } from '../../components/Charts'
import type { Channel, Video } from '../../../lib/supabase'

export default function TrackingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [sortBy, setSortBy] = useState<'published_at' | 'view_count' | 'like_count'>('published_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')

  const { channels, isLoading: channelsLoading } = useChannels()
  const { videos, isLoading: videosLoading } = useVideos(selectedChannel?.id)
  const { metrics: videoMetrics, isLoading: metricsLoading } = useVideoMetrics(selectedVideo?.id)

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // Filter and sort videos
  const filteredAndSortedVideos = videos
    ?.filter(video => 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    ?.sort((a, b) => {
      const aValue = a[sortBy] || 0
      const bValue = b[sortBy] || 0
      
      if (sortBy === 'published_at') {
        const aDate = new Date(aValue as string).getTime()
        const bDate = new Date(bValue as string).getTime()
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = (duration: string) => {
    // YouTube duration format: PT#M#S or PT#H#M#S
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return duration

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

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
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/tracking" className="text-blue-600 font-medium">
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
          <h1 className="text-3xl font-bold text-gray-900">Video Tracking</h1>
          <p className="mt-2 text-gray-600">
            Monitor the performance of your individual videos with detailed analytics.
          </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Sidebar - Channel & Video List */}
            <div className="lg:col-span-1">
              {/* Channel Selector */}
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Channel</h3>
                <select
                  value={selectedChannel?.id || ''}
                  onChange={(e) => {
                    const channel = channels.find(c => c.id === e.target.value)
                    setSelectedChannel(channel || null)
                    setSelectedVideo(null)
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.channel_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search and Sort */}
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Videos</h3>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Search videos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'published_at' | 'view_count' | 'like_count')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="published_at">Date</option>
                      <option value="view_count">Views</option>
                      <option value="like_count">Likes</option>
                    </select>
                    
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="desc">High to Low</option>
                      <option value="asc">Low to High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Video List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Videos</h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {videosLoading ? (
                    <div className="p-6 text-center text-gray-600">Loading videos...</div>
                  ) : !filteredAndSortedVideos || filteredAndSortedVideos.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      {searchTerm ? 'No videos match your search.' : 'No videos found.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredAndSortedVideos.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => setSelectedVideo(video)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedVideo?.id === video.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            {video.thumbnail_url && (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {video.title}
                              </p>
                              <div className="mt-1 text-xs text-gray-500 space-y-1">
                                <p>{formatDate(video.published_at)}</p>
                                <div className="flex items-center space-x-4">
                                  <span>{formatNumber(video.view_count || 0)} views</span>
                                  {video.duration && <span>{formatDuration(video.duration)}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Content - Video Analytics */}
            <div className="lg:col-span-2">
              {selectedVideo ? (
                <div className="space-y-6">
                  {/* Video Header */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                      {selectedVideo.thumbnail_url && (
                        <img
                          src={selectedVideo.thumbnail_url}
                          alt={selectedVideo.title}
                          className="w-32 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                          {selectedVideo.title}
                        </h2>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Published: {formatDate(selectedVideo.published_at)}</p>
                          {selectedVideo.duration && (
                            <p>Duration: {formatDuration(selectedVideo.duration)}</p>
                          )}
                          {selectedVideo.description && (
                            <p className="line-clamp-3 mt-2">{selectedVideo.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                      title="Views"
                      value={selectedVideo.view_count || 0}
                      format="views"
                    />
                    <MetricCard
                      title="Likes"
                      value={selectedVideo.like_count || 0}
                      format="number"
                    />
                    <MetricCard
                      title="Comments"
                      value={selectedVideo.comment_count || 0}
                      format="number"
                    />
                  </div>

                  {/* Video Performance Chart */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Over Time</h3>
                    {metricsLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-gray-600">Loading metrics...</div>
                      </div>
                    ) : videoMetrics && videoMetrics.length > 0 ? (
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">View Count</h4>
                          <VideoMetricsChart metrics={videoMetrics} metricType="view_count" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Like Count</h4>
                          <VideoMetricsChart metrics={videoMetrics} metricType="like_count" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Comment Count</h4>
                          <VideoMetricsChart metrics={videoMetrics} metricType="comment_count" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No historical metrics available for this video
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Video</h3>
                  <p className="text-gray-600">
                    Choose a video from the list to view its detailed analytics and performance metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 