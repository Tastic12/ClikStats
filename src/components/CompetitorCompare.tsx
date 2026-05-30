'use client'

import { useState } from 'react'
import type { CompetitorChannel, CompetitorChannelVideo } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import type { ViewMode } from './ViewModeToggle'
import { VideoResultsLayout } from './VideoResultsLayout'
import { ChannelComparisonTable } from './Charts'

type CompetitorCompareProps = {
  channels: CompetitorChannel[]
  videosByChannel: Record<string, CompetitorChannelVideo[]>
  viewMode: ViewMode
  leadingChannel?: CompetitorChannel | null
}

export function CompetitorCompare({
  channels,
  videosByChannel,
  viewMode,
  leadingChannel,
}: CompetitorCompareProps) {
  const [sideBySide, setSideBySide] = useState(false)

  if (channels.length === 0) return null

  const leader =
    leadingChannel ||
    [...channels].sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0))[0]

  return (
    <div className="w-full space-y-6">
      {leader && channels.length > 1 && (
        <div className="border-l-2 border-[var(--success)] pl-4 py-1">
          <p className="text-xs font-semibold uppercase text-[var(--success)]">Leading channel</p>
          <div className="mt-2 flex items-center gap-3">
            {leader.thumbnail_url && (
              <img
                src={leader.thumbnail_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--success)]"
              />
            )}
            <div className="min-w-0">
              <p className="text-base font-bold text-[var(--foreground)] truncate">
                {leader.channel_name}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {formatCount(leader.subscriber_count || 0)} subscribers ·{' '}
                {formatCount(leader.view_count || 0)} views
              </p>
            </div>
          </div>
        </div>
      )}

      {channels.length > 1 && (
        <div>
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">Channel comparison</p>
          <ChannelComparisonTable channels={channels} />
        </div>
      )}

      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Top 5 recent uploads per channel
          </p>
          {channels.length > 1 && (
            <button
              type="button"
              onClick={() => setSideBySide((v) => !v)}
              className="text-xs text-[var(--accent)] hover:underline min-h-11 px-2"
            >
              {sideBySide ? 'Show list view' : 'Compare side by side'}
            </button>
          )}
        </div>

        {sideBySide && channels.length > 1 ? (
          <SideBySideGrid channels={channels} videosByChannel={videosByChannel} viewMode={viewMode} />
        ) : (
          <div className="space-y-8">
            {channels.map((ch) => {
              const top = (videosByChannel[ch.id] || []).slice(0, 5)
              return (
                <ChannelListSection key={ch.id} channel={ch} videos={top} viewMode={viewMode} />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelListSection({
  channel,
  videos,
  viewMode,
}: {
  channel: CompetitorChannel
  videos: CompetitorChannelVideo[]
  viewMode: ViewMode
}) {
  return (
    <div className="rounded-lg ring-1 ring-[var(--border)] overflow-hidden">
      <a
        href={channel.channel_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 bg-[var(--elevated)]/40 border-b border-[var(--border)] group"
      >
        {channel.thumbnail_url ? (
          <img
            src={channel.thumbnail_url}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]"
          />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--card)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] truncate">
            {channel.channel_name}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {formatCount(channel.subscriber_count || 0)} subs ·{' '}
            {formatCount(channel.view_count || 0)} views
          </p>
        </div>
      </a>
      <div className="p-3">
        {videos.length ? (
          <VideoResultsLayout
            viewMode={viewMode}
            columnStack={viewMode === 'grid'}
            maxItems={5}
            videos={videos.map((v) => ({
              id: v.id,
              videoId: v.video_id,
              title: v.title,
              thumbnailUrl: v.thumbnail_url,
              views: v.view_count,
              likes: v.like_count,
              comments: v.comment_count,
              outlierScore: v.outlier_score,
            }))}
          />
        ) : (
          <p className="text-xs text-[var(--muted)] py-2">No videos loaded yet.</p>
        )}
      </div>
    </div>
  )
}

function SideBySideGrid({
  channels,
  videosByChannel,
  viewMode,
}: {
  channels: CompetitorChannel[]
  videosByChannel: Record<string, CompetitorChannelVideo[]>
  viewMode: ViewMode
}) {
  const columnCount = channels.length
  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid w-full gap-3 xl:gap-4"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          minWidth: columnCount > 5 ? `${columnCount * 11}rem` : undefined,
        }}
      >
        {channels.map((ch) => (
          <ChannelListSection
            key={ch.id}
            channel={ch}
            videos={(videosByChannel[ch.id] || []).slice(0, 5)}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  )
}
