'use client'

import type { CompetitorChannel, CompetitorChannelVideo } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import type { ViewMode } from './ViewModeToggle'
import { VideoResultsLayout } from './VideoResultsLayout'
import { ChannelSnapshotComparisonChart } from './Charts'

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
  if (channels.length === 0) return null

  const leader =
    leadingChannel ||
    [...channels].sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0))[0]

  const columnCount = channels.length

  return (
    <div className="w-full space-y-6">
      {leader && (
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

      <div className="w-full">
        <p className="text-sm font-medium text-[var(--foreground)] mb-3">Channel comparison</p>
        <ChannelSnapshotComparisonChart channels={channels} />
      </div>

      <div className="w-full">
        <p className="text-sm font-medium text-[var(--foreground)] mb-3">
          Top 5 videos — side by side ({columnCount} channel{columnCount === 1 ? '' : 's'})
        </p>

        <div className="w-full overflow-x-auto">
          <div
            className="grid w-full gap-3 xl:gap-4"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              minWidth: columnCount > 5 ? `${columnCount * 11}rem` : undefined,
            }}
          >
            {channels.map((ch) => {
              const top = (videosByChannel[ch.id] || []).slice(0, 5)
              return (
                <ChannelColumn
                  key={ch.id}
                  channel={ch}
                  videos={top}
                  viewMode={viewMode}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChannelColumn({
  channel,
  videos,
  viewMode,
}: {
  channel: CompetitorChannel
  videos: CompetitorChannelVideo[]
  viewMode: ViewMode
}) {
  return (
    <div className="min-w-0 flex flex-col overflow-hidden">
      <a
        href={channel.channel_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 pb-3 border-b border-[var(--border)] group shrink-0"
      >
        {channel.thumbnail_url ? (
          <img
            src={channel.thumbnail_url}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)] group-hover:ring-[var(--accent)]"
          />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--card)]" />
        )}
        <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] line-clamp-2 leading-tight">
          {channel.channel_name}
        </span>
      </a>
      <div className="pt-3 flex-1 min-w-0">
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
      </div>
    </div>
  )
}
