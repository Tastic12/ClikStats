'use client'

import { createClient } from '@supabase/supabase-js'

// Environment variables - handle both server and client side
const getEnvVar = (name: string): string | undefined => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Client-side: use process.env directly
    return process.env[name]
  }
  // Server-side: also use process.env
  return process.env[name]
}

// Fallback values for debugging
const FALLBACK_URL = 'https://pbnkzbmktzeudohyajfc.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibmt6Ym1rdHpldWRvaHlhamZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyODQ1NDAsImV4cCI6MjA2Njg2MDU0MH0.uxkpkwIMF-mxPjWVBdVo9JJttQXbT5PFgY77GFHvmJc'

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || FALLBACK_URL
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || FALLBACK_ANON_KEY

console.log('Supabase client initialization:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  envKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

if (!supabaseUrl) {
  console.error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')))
}

if (!supabaseAnonKey) {
  console.error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create Supabase client with fallback handling
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Server-side admin client (for server actions and API routes)
// This is a function that only creates the client when called, not during module initialization
export const createSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  
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
  published_at: string
  duration?: string
  view_count?: number
  like_count?: number
  comment_count?: number
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