'use client'

import { useState } from 'react'
import { initChannel, useUserProfile } from '../../lib/hooks'
import { parseChannelInput } from '../../lib/youtube-channel'
import { canUseFeature, normalizePlan, PLAN_FEATURE_COPY } from '../../lib/plans'

type ChangeChannelDialogProps = {
  open: boolean
  onClose: () => void
  currentChannelName: string
  onSuccess?: () => void
}

export function ChangeChannelDialog({
  open,
  onClose,
  currentChannelName,
  onSuccess,
}: ChangeChannelDialogProps) {
  const { profile } = useUserProfile()
  const plan = normalizePlan(profile?.plan)
  const allowed = canUseFeature(plan, 'change_connected_channel')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allowed) {
      setError(PLAN_FEATURE_COPY.change_connected_channel.description)
      return
    }
    if (!confirmed) {
      setError('Please confirm you understand this replaces your current channel data.')
      return
    }
    if (!parseChannelInput(url.trim())) {
      setError('Enter a valid YouTube channel URL or @handle.')
      return
    }

    setLoading(true)
    try {
      await initChannel(url.trim())
      setUrl('')
      setConfirmed(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change channel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-labelledby="change-channel-title"
        className="w-full max-w-md rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)] shadow-2xl p-5"
      >
        <h2 id="change-channel-title" className="text-lg font-semibold text-[var(--foreground)]">
          Change connected channel
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Currently connected to <strong>{currentChannelName}</strong>. Replacing it will delete
          synced videos and metrics for the old channel. Competitors and Discover are not affected.
        </p>

        {!allowed && (
          <p className="mt-3 text-xs rounded-md bg-[var(--elevated)] px-3 py-2 text-[var(--muted)]">
            <strong className="text-[var(--foreground)]">Pro feature (preview):</strong>{' '}
            {PLAN_FEATURE_COPY.change_connected_channel.description} Billing isn&apos;t live yet —
            set <code className="text-[10px]">NEXT_PUBLIC_UNLOCK_ALL_FEATURES=true</code> in env to
            test.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/@newchannel"
            className="cs-input w-full px-3 py-2 text-sm"
            disabled={!allowed || loading}
          />
          <label className="flex items-start gap-2 text-xs text-[var(--muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
              disabled={!allowed || loading}
            />
            I understand my previous channel&apos;s synced data will be removed.
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !allowed}
              className="cs-btn-primary flex-1 py-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Connect new channel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cs-input px-4 py-2 text-sm hover:bg-[var(--card)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
