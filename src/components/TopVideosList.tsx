'use client'

import type { Video } from '../../lib/supabase'
import { VideoThumbnailLink } from './VideoThumbnailLink'

type TopVideosListProps = {
  videos: Video[]
}

export function TopVideosList({ videos }: TopVideosListProps) {
  if (!videos.length) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center">
        No videos yet. Connect a channel to import your latest uploads.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {videos.map((video, index) => (
        <li key={video.id}>
          <VideoThumbnailLink
            videoId={video.video_id}
            title={video.title}
            thumbnailUrl={video.thumbnail_url}
            subtitle={`${new Date(video.published_at).toLocaleDateString()} · Watch on YouTube`}
            views={video.view_count}
            likes={video.like_count}
            comments={video.comment_count}
            rank={index + 1}
          />
        </li>
      ))}
    </ul>
  )
}
