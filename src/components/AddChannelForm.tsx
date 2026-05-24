'use client'

import { useState } from 'react'
import { callEdgeFunction, extractChannelId } from '../../lib/hooks'

type AddChannelFormProps = {
  onSuccess?: () => void
  compact?: boolean
}

export function AddChannelForm({ onSuccess, compact }: AddChannelFormProps) {
  const [channelUrl, setChannelUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const channelId = extractChannelId(channelUrl.trim())
    if (!channelId) {
      setError('Enter a valid YouTube channel URL (channel, @handle, /c/, or /user/).')
      return
    }

    setLoading(true)
    try {
      await callEdgeFunction('init-channel', {
        channelId,
        channelUrl: channelUrl.trim(),
      })
      setChannelUrl('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <label htmlFor="channel-url" className="block text-sm font-medium text-gray-700 mb-1">
          YouTube channel URL
        </label>
        <input
          id="channel-url"
          type="url"
          required
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          placeholder="https://www.youtube.com/@yourchannel"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Connecting…' : 'Connect channel'}
      </button>
    </form>
  )
}
