export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function youtubeChannelUrl(channelId: string, handle?: string) {
  if (handle) return `https://www.youtube.com/@${handle}`
  return `https://www.youtube.com/channel/${channelId}`
}
