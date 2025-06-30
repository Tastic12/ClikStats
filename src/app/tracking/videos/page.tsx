'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useVideos, useChannels } from '@/lib/hooks'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function VideosPage() {
  const searchParams = useSearchParams()
  const channelFilter = searchParams?.get('channel')
  
  const { videos, isLoading, isError, mutate } = useVideos(channelFilter || undefined)
  const { channels } = useChannels()
  const [selectedChannel, setSelectedChannel] = useState(channelFilter || 'all')

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? All associated metrics will be removed.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error
      mutate() // Refresh videos list
    } catch (error: any) {
      alert('Error deleting video: ' + error.message)
    }
  }

  const filteredVideos = selectedChannel === 'all' 
    ? videos 
    : videos?.filter(video => video.channel_id === selectedChannel)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Videos</h1>
            <Link 
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Channel</h2>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Channels</option>
            {channels?.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.channel_name}
              </option>
            ))}
          </select>
        </div>

        {/* Videos List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Videos ({filteredVideos?.length || 0})
            </h2>
          </div>
          <div className="p-6">
            {isError ? (
              <div className="text-center text-red-600 py-8">
                Error loading videos. Please try again.
              </div>
            ) : filteredVideos && filteredVideos.length > 0 ? (
              <div className="space-y-4">
                {filteredVideos.map((video) => {
                  const channel = channels?.find(c => c.id === video.channel_id)
                  return (
                    <div key={video.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {video.thumbnail_url && (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-32 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
                          <p className="text-sm text-gray-500 mb-2">
                            Channel: {channel?.channel_name || 'Unknown'}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{video.view_count?.toLocaleString() || 0} views</span>
                            <span>{video.like_count?.toLocaleString() || 0} likes</span>
                            <span>{video.comment_count?.toLocaleString() || 0} comments</span>
                            <span>Published {new Date(video.published_at).toLocaleDateString()}</span>
                          </div>
                          <a 
                            href={`https://youtube.com/watch?v=${video.video_id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 text-sm mt-1 inline-block"
                          >
                            Watch on YouTube →
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No videos found. Videos are automatically added when you add YouTube channels.</p>
                <Link 
                  href="/tracking/channels"
                  className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Manage Channels
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 