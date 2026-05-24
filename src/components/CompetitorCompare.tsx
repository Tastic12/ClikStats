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

  const columnMin = viewMode === 'grid' ? 120 : 160

  return (
    <div className="space-y-4">
      {leader && (
        <div className="rounded-lg border border-[var(--success)]/50 bg-[var(--elevated)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-[var(--success)]">Leading channel</p>
          <div className="mt-1 flex items-center gap-2">
            {leader.thumbnail_url && (
              <img
                src={leader.thumbnail_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--success)]"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)] truncate">{leader.channel_name}</p>
              <p className="text-xs text-[var(--muted)]">
                {formatCount(leader.subscriber_count || 0)} subs ·{' '}
                {formatCount(leader.view_count || 0)} views
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-[var(--muted)] mb-2">Channel comparison</p>
        <ChannelSnapshotComparisonChart channels={channels} />
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--muted)] mb-2">Top 5 videos — side by side</p>
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          {viewMode === 'list' ? (
            <div className="space-y-4 min-w-0">
              {channels.map((ch) => {
                const top = (videosByChannel[ch.id] || []).slice(0, 5)
                return (
                  <div key={ch.id} className="rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-2">
                    <a
                      href={ch.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 flex items-center gap-2 group"
                    >
                      {ch.thumbnail_url ? (
                        <img
                          src={ch.thumbnail_url}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-[var(--card)]" />
                      )}
                      <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] truncate">
                        {ch.channel_name}
                      </span>
                    </a>
                    <VideoResultsLayout
                      viewMode="list"
                      compact
                      maxItems={5}
                      videos={top.map((v) => ({
                        id: v.id,
                        videoId: v.video_id,
                        title: v.title,
                        thumbnailUrl: v.thumbnail_url,
                        views: v.view_count,
                        likes: v.like_count,
                        comments: v.comment_count,
                      }))}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              className="grid gap-2 min-w-max"
              style={{
                gridTemplateColumns: `repeat(${channels.length}, minmax(${columnMin}px, 1fr))`,
              }}
            >
              {channels.map((ch) => {
                const top = (videosByChannel[ch.id] || []).slice(0, 5)
                return (
                  <div
                    key={ch.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-2 min-w-0"
                  >
                    <a
                      href={ch.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 flex items-center gap-1.5 group min-w-0"
                    >
                      {ch.thumbnail_url ? (
                        <img
                          src={ch.thumbnail_url}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 shrink-0 rounded-full bg-[var(--card)]" />
                      )}
                      <span className="text-[11px] font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] truncate">
                        {ch.channel_name}
                      </span>
                    </a>
                    <VideoResultsLayout
                      viewMode="grid"
                      compact
                      maxItems={5}
                      videos={top.map((v) => ({
                        id: v.id,
                        videoId: v.video_id,
                        title: v.title,
                        thumbnailUrl: v.thumbnail_url,
                        views: v.view_count,
                        likes: v.like_count,
                        comments: v.comment_count,
                      }))}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
