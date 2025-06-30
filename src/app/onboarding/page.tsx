'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { callEdgeFunction, extractChannelId } from '@/lib/hooks'

export default function OnboardingPage() {
  const [channelUrl, setChannelUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const channelId = extractChannelId(channelUrl)
      if (!channelId) {
        throw new Error('Invalid YouTube channel URL')
      }

      await callEdgeFunction('init-channel', { channel_id: channelId })
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Add Your First YouTube Channel
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the URL of the YouTube channel you want to track
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="channelUrl" className="block text-sm font-medium text-gray-700">
                YouTube Channel URL
              </label>
              <div className="mt-1">
                <input
                  id="channelUrl"
                  name="channelUrl"
                  type="url"
                  placeholder="https://www.youtube.com/channel/..."
                  required
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Supported formats: youtube.com/channel/..., youtube.com/c/..., youtube.com/@...
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Adding Channel...' : 'Add Channel'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 