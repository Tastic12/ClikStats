'use client'

import type { Video } from '../../lib/supabase'
import { formatCount } from '@/lib/format'
import { youtubeWatchUrl } from '@/lib/youtube'

type TopVideosListProps = {
  videos: Video[]
}

export function TopVideosList({ videos }: TopVideosListProps) {
  if (!videos.length) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No videos yet. Connect a channel to import your latest uploads.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {videos.map((video, index) => (
        <li key={video.id}>
          <a
            href={youtubeWatchUrl(video.video_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 py-4 first:pt-0 last:pb-0 hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors group"
          >
            <span className="flex-shrink-0 w-6 text-sm font-semibold text-gray-400 pt-1">
              {index + 1}
            </span>
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt=""
                className="w-28 h-16 object-cover rounded-md flex-shrink-0 bg-gray-100"
              />
            ) : (
              <div className="w-28 h-16 rounded-md bg-gray-100 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                {video.title}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(video.published_at).toLocaleDateString()} · Open on YouTube ↗
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                <span>{formatCount(video.view_count || 0)} views</span>
                <span>{formatCount(video.like_count || 0)} likes</span>
                <span>{formatCount(video.comment_count || 0)} comments</span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
