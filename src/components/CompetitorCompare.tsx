'use client'

import type { CompetitorChannel, CompetitorChannelVideo } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import { VideoThumbnailLink } from './VideoThumbnailLink'
import { ChannelSnapshotComparisonChart } from './Charts'

type CompetitorCompareProps = {
  channels: CompetitorChannel[]
  videosByChannel: Record<string, CompetitorChannelVideo[]>
  leadingChannel?: CompetitorChannel | null
}

export function CompetitorCompare({
  channels,
  videosByChannel,
  leadingChannel,
}: CompetitorCompareProps) {
  if (channels.length === 0) return null

  const leader =
    leadingChannel ||
    [...channels].sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0))[0]

  return (
    <div className="space-y-6">
      {leader && (
        <div className="cs-card border-[var(--success)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--success)]">Leading channel</p>
          <div className="mt-2 flex items-center gap-3">
            {leader.thumbnail_url && (
              <img
                src={leader.thumbnail_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--success)]"
              />
            )}
            <div>
              <p className="text-lg font-bold text-[var(--foreground)]">{leader.channel_name}</p>
              <p className="text-sm text-[var(--muted)]">
                {formatCount(leader.subscriber_count || 0)} subscribers ·{' '}
                {formatCount(leader.view_count || 0)} views
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="cs-card p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
          Channel comparison
        </h3>
        <ChannelSnapshotComparisonChart channels={channels} />
      </div>

      <div className="cs-card p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
          Top 5 videos — side by side
        </h3>
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-4 min-w-max"
            style={{
              gridTemplateColumns: `repeat(${channels.length}, minmax(200px, 1fr))`,
            }}
          >
            {channels.map((ch) => {
              const top = (videosByChannel[ch.id] || []).slice(0, 5)
              return (
                <div key={ch.id} className="space-y-3">
                  <a
                    href={ch.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group"
                  >
                    {ch.thumbnail_url ? (
                      <img
                        src={ch.thumbnail_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-[var(--border)] group-hover:ring-[var(--accent)]"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-[var(--elevated)]" />
                    )}
                    <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] line-clamp-2">
                      {ch.channel_name}
                    </span>
                  </a>
                  <div className="space-y-2">
                    {top.length === 0 ? (
                      <p className="text-xs text-[var(--muted)]">No videos yet</p>
                    ) : (
                      top.map((v, i) => (
                        <VideoThumbnailLink
                          key={v.id}
                          videoId={v.video_id}
                          title={v.title}
                          thumbnailUrl={v.thumbnail_url}
                          views={v.view_count}
                          likes={v.like_count}
                          comments={v.comment_count}
                          rank={i + 1}
                          layout="card"
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
