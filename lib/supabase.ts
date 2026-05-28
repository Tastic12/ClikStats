'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and add your Supabase keys.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
  }

  if (!url) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Database types
export interface User {
  id: string
  email: string
  display_name?: string | null
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  user_id: string
  channel_id: string
  channel_name: string
  channel_url: string
  description?: string
  thumbnail_url?: string
  subscriber_count?: number
  video_count?: number
  view_count?: number
  created_at: string
  updated_at: string
}

export interface ChannelMetric {
  id: string
  channel_id: string
  subscriber_count: number
  video_count: number
  view_count: number
  recorded_at: string
}

export interface Video {
  id: string
  user_id: string
  channel_id: string
  video_id: string
  title: string
  description?: string
  thumbnail_url?: string
  thumbnail_width?: number | null
  thumbnail_height?: number | null
  published_at: string
  duration?: string
  view_count?: number
  like_count?: number
  comment_count?: number
  outlier_score?: number | null
  outlier_velocity_score?: number | null
  niche_outlier_score?: number | null
  is_short?: boolean | null
  created_at: string
  updated_at: string
}

export interface VideoMetric {
  id: string
  video_id: string
  view_count: number
  like_count: number
  comment_count: number
  recorded_at: string
}

export interface CompetitorChannelGroup {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface CompetitorVideoGroup {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface CompetitorChannel {
  id: string
  user_id: string
  youtube_channel_id: string
  channel_name: string
  channel_url: string
  description?: string
  thumbnail_url?: string
  subscriber_count?: number
  video_count?: number
  view_count?: number
  group_id?: string | null
  created_at: string
  updated_at: string
}

export interface CompetitorChannelVideo {
  id: string
  user_id: string
  competitor_channel_id: string
  video_id: string
  title: string
  thumbnail_url?: string
  published_at: string
  duration?: string | null
  view_count?: number
  like_count?: number
  comment_count?: number
  outlier_score?: number | null
  is_short?: boolean | null
  created_at: string
}

export interface CompetitorVideo {
  id: string
  user_id: string
  youtube_video_id: string
  title: string
  channel_name?: string
  thumbnail_url?: string
  published_at?: string
  view_count?: number
  like_count?: number
  comment_count?: number
  group_id?: string | null
  created_at: string
  updated_at: string
}

export interface DiscoveredVideo {
  id: string
  video_id: string
  title: string
  thumbnail_url: string
  channel_id?: string | null
  channel_name?: string | null
  category_id: number
  region_code: string
  published_at?: string | null
  duration?: string | null
  view_count?: number
  like_count?: number
  is_short?: boolean | null
  discovered_at: string
  last_seen_at: string
}

export interface UserDiscoverSettings {
  user_id: string
  region_code: string
  category_ids: number[]
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      channels: {
        Row: Channel
        Insert: Omit<Channel, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Channel, 'id' | 'created_at' | 'updated_at'>>
      }
      channel_metrics: {
        Row: ChannelMetric
        Insert: Omit<ChannelMetric, 'id'>
        Update: Partial<Omit<ChannelMetric, 'id'>>
      }
      videos: {
        Row: Video
        Insert: Omit<Video, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Video, 'id' | 'created_at' | 'updated_at'>>
      }
      video_metrics: {
        Row: VideoMetric
        Insert: Omit<VideoMetric, 'id'>
        Update: Partial<Omit<VideoMetric, 'id'>>
      }
    }
  }
}
