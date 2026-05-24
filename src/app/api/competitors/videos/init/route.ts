import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchYouTubeVideo, parseVideoInput } from '../../../../../../lib/youtube-channel'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const body = await request.json()
    const videoInput = (body.video_url as string) || (body.videoUrl as string)
    const groupId = (body.group_id as string) || null
    if (!videoInput?.trim()) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
    }

    const videoId = parseVideoInput(videoInput.trim())
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube video URL' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!supabaseUrl || !serviceRoleKey || !youtubeApiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const video = await fetchYouTubeVideo(videoId, youtubeApiKey)

    const { data: record, error } = await admin
      .from('competitor_videos')
      .upsert(
        { user_id: user.id, ...video, ...(groupId ? { group_id: groupId } : {}) },
        { onConflict: 'user_id,youtube_video_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save competitor video' }, { status: 500 })
    }

    return NextResponse.json({ success: true, video: record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
