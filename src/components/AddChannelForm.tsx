'use client'

import { useState } from 'react'
import { initChannel } from '../../lib/hooks'
import { parseChannelInput } from '../../lib/youtube-channel'

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

    if (!parseChannelInput(channelUrl.trim())) {
      setError('Enter a valid YouTube channel URL (channel, @handle, /c/, or /user/).')
      return
    }

    setLoading(true)
    try {
      await initChannel(channelUrl.trim())
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
        <label htmlFor="channel-url" className="block text-sm font-medium text-[var(--foreground)] mb-1">
          YouTube channel URL
        </label>
        <input
          id="channel-url"
          type="url"
          required
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          placeholder="https://www.youtube.com/@yourchannel"
          className="cs-input w-full px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={loading} className="cs-btn-primary px-4 py-2 text-sm disabled:opacity-50">
        {loading ? 'Connecting…' : 'Connect channel'}
      </button>
    </form>
  )
}
