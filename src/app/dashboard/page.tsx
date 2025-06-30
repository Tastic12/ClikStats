'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useDashboardData } from '@/lib/hooks'
import { MetricCard, TopVideosChart, ChannelDistributionChart } from '@/components/Charts'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { channels, videos, topVideos, totalMetrics, isLoading } = useDashboardData()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
      }
    }
    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Link href="/tracking/channels" className="text-indigo-600 hover:text-indigo-700">
                Manage Channels
              </Link>
              <Link href="/tracking/videos" className="text-indigo-600 hover:text-indigo-700">
                Manage Videos
              </Link>
              <button 
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-8">
          <h2 className="text-xl font-semibold mb-2">Welcome to YouTube Analytics Pro</h2>
          <p className="text-indigo-100">
            Track your YouTube performance across {channels?.length || 0} channels and {videos?.length || 0} videos
          </p>
        </div>

        {/* Metrics Cards */}
        {totalMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard 
              title="Total Subscribers" 
              value={totalMetrics.subscribers} 
              format="subscribers"
            />
            <MetricCard 
              title="Total Views" 
              value={totalMetrics.views} 
              format="views"
            />
            <MetricCard 
              title="Total Videos" 
              value={totalMetrics.videos} 
              format="number"
            />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performing Videos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Performing Videos
            </h3>
            {topVideos && topVideos.length > 0 ? (
              <TopVideosChart videos={topVideos} />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No videos found. Add some YouTube channels to see video performance.</p>
                <Link 
                  href="/onboarding"
                  className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Add Channel
                </Link>
              </div>
            )}
          </div>

          {/* Channel Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Channel Subscriber Distribution
            </h3>
            {channels && channels.length > 0 ? (
              <ChannelDistributionChart channels={channels} />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No channels found. Add your first YouTube channel to get started.</p>
                <Link 
                  href="/onboarding"
                  className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Add Channel
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Videos</h3>
          </div>
          <div className="p-6">
            {videos && videos.length > 0 ? (
              <div className="space-y-4">
                {videos.slice(0, 5).map((video) => (
                  <div key={video.id} className="flex items-center space-x-4">
                    {video.thumbnail_url && (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{video.title}</h4>
                      <p className="text-sm text-gray-500">
                        {video.view_count?.toLocaleString() || 0} views • 
                        Published {new Date(video.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No videos found. Add some YouTube channels to see recent videos.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 