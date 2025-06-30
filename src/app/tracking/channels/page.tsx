'use client'

import { useState } from 'react'
import { useChannels, callEdgeFunction, extractChannelId } from '@/lib/hooks'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ChannelsPage() {
  const { channels, isLoading, isError, mutate } = useChannels()
  const [channelUrl, setChannelUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')

    try {
      const channelId = extractChannelId(channelUrl)
      if (!channelId) {
        throw new Error('Invalid YouTube channel URL')
      }

      await callEdgeFunction('init-channel', { channel_id: channelId })
      setChannelUrl('')
      mutate() // Refresh channels list
    } catch (error: any) {
      setError(error.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel? All associated videos and metrics will be removed.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)

      if (error) throw error
      mutate() // Refresh channels list
    } catch (error: any) {
      alert('Error deleting channel: ' + error.message)
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Manage Channels</h1>
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
        {/* Add Channel Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Channel</h2>
          <form onSubmit={handleAddChannel} className="flex gap-4">
            <div className="flex-1">
              <input
                type="url"
                placeholder="https://www.youtube.com/channel/..."
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Channel'}
            </button>
          </form>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Channels List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Channels</h2>
          </div>
          <div className="p-6">
            {isError ? (
              <div className="text-center text-red-600 py-8">
                Error loading channels. Please try again.
              </div>
            ) : channels && channels.length > 0 ? (
              <div className="space-y-4">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      {channel.thumbnail_url && (
                        <img 
                          src={channel.thumbnail_url} 
                          alt={channel.channel_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{channel.channel_name}</h3>
                        <p className="text-sm text-gray-500">
                          {channel.subscriber_count?.toLocaleString() || 0} subscribers • 
                          {channel.video_count?.toLocaleString() || 0} videos • 
                          {channel.view_count?.toLocaleString() || 0} total views
                        </p>
                        <a 
                          href={channel.channel_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          View on YouTube →
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/tracking/videos?channel=${channel.id}`}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        View Videos
                      </Link>
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
      </main>
    </div>
  )
} 