'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { callEdgeFunction, extractChannelId } from '../../../lib/hooks'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [channelUrl, setChannelUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!channelUrl.trim()) {
      setError('Please enter a YouTube channel URL')
      return
    }

    const channelId = extractChannelId(channelUrl)
    if (!channelId) {
      setError('Invalid YouTube channel URL. Please check the format.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call the edge function to initialize the channel
      await callEdgeFunction('init-channel', { 
        channelId,
        channelUrl: channelUrl.trim()
      })

      setSuccess(true)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      console.error('Error adding channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to add channel. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Channel Added Successfully!</h2>
          <p className="text-gray-600 mb-6">Your YouTube channel has been added and we&apos;re fetching your analytics data.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
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

      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900">Add Your YouTube Channel</h1>
          <p className="mt-4 text-lg text-gray-600">
            Let&apos;s get started by adding your first YouTube channel to track its analytics.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="channel-url" className="block text-sm font-medium text-gray-700">
                  YouTube Channel URL
                </label>
                <div className="mt-1">
                  <input
                    id="channel-url"
                    name="channel-url"
                    type="url"
                    required
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.youtube.com/channel/..."
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter the full URL of your YouTube channel. We support various formats:
                </p>
                <ul className="mt-1 text-sm text-gray-500 list-disc list-inside space-y-1">
                  <li>https://www.youtube.com/channel/UC...</li>
                  <li>https://www.youtube.com/c/channelname</li>
                  <li>https://www.youtube.com/user/username</li>
                  <li>https://www.youtube.com/@handle</li>
                </ul>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding Channel...
                    </>
                  ) : (
                    'Add Channel'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">What happens next?</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-xs font-medium">1</span>
              </div>
              <p>We&apos;ll fetch your channel information and latest videos using the YouTube Data API.</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-xs font-medium">2</span>
              </div>
              <p>Your analytics data will be automatically updated daily to track your growth.</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-xs font-medium">3</span>
              </div>
              <p>You&apos;ll have access to detailed charts and insights on your dashboard.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            Skip for now and go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
} 