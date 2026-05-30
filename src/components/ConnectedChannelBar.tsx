'use client'

import { useState } from 'react'
import { formatCount } from '@/lib/format'
import type { Channel } from '../../lib/supabase'
import { ChangeChannelDialog } from './ChangeChannelDialog'

type ConnectedChannelBarProps = {
  channel: Channel | null
  isLoading?: boolean
  onChannelChanged?: () => void
}

export function ConnectedChannelBar({
  channel,
  isLoading,
  onChannelChanged,
}: ConnectedChannelBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) {
    return <span className="text-xs text-[var(--muted)]">Loading channel…</span>
  }

  if (!channel) {
    return (
      <a
        href="/dashboard"
        className="text-xs font-medium text-[var(--accent)] hover:underline"
      >
        Connect channel
      </a>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        {channel.thumbnail_url && (
          <img
            src={channel.thumbnail_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]"
          />
        )}
        <div className="min-w-0 hidden sm:block">
          <p className="text-xs font-semibold text-[var(--foreground)] truncate max-w-[160px] lg:max-w-[220px]">
            {channel.channel_name}
          </p>
          <p className="text-[10px] text-[var(--muted-2)] tabular-nums">
            {formatCount(channel.subscriber_count || 0)} subs ·{' '}
            {formatCount(channel.view_count || 0)} views
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="shrink-0 text-[10px] font-medium text-[var(--accent)] hover:underline min-h-9 px-2"
        >
          Change
        </button>
      </div>

      <ChangeChannelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        currentChannelName={channel.channel_name}
        onSuccess={() => {
          setDialogOpen(false)
          onChannelChanged?.()
        }}
      />
    </>
  )
}
