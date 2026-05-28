import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchChannelVideos, fetchYouTubeChannel } from '../../../../../../lib/youtube-channel'
import { checkRateLimit } from '../../../../../../lib/rate-limit'
import { logYoutubeApiUsage } from '../../../../../../lib/admin'

const COMPETITOR_BASELINE_WINDOW = 30
export const maxDuration = 120

type BulkResult = {
  input: string
  status: 'ok' | 'error' | 'skipped'
  channelName?: string
  error?: string
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const body = await request.json()
    const rawUrls = body.channel_urls as string[] | string | undefined
    const groupId = (body.group_id as string) || null

    const urls = Array.isArray(rawUrls)
      ? rawUrls
      : typeof rawUrls === 'string'
        ? rawUrls.split(/[\n,]+/)
        : []

    const channelInputs = urls.map((u) => u.trim()).filter(Boolean)
    if (!channelInputs.length) {
      return NextResponse.json({ error: 'Provide at least one channel URL or @handle.' }, { status: 400 })
    }
    if (channelInputs.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 channels per bulk import.' }, { status: 400 })
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

    const rl = await checkRateLimit(user.id, 'competitors-init')
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const results: BulkResult[] = []
    let apiUnits = 0

    for (const channelInput of channelInputs) {
      try {
        const { channel, youtubeChannelId, channelUrl } = await fetchYouTubeChannel(
          channelInput,
          youtubeApiKey
        )
        apiUnits += 1

        const { data: record, error } = await admin
          .from('competitor_channels')
          .upsert(
            {
              user_id: user.id,
              youtube_channel_id: youtubeChannelId,
              channel_name: channel.snippet.title,
              channel_url: channelUrl,
              description: channel.snippet.description,
              thumbnail_url:
                channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
              subscriber_count: parseInt(channel.statistics.subscriberCount, 10) || 0,
              video_count: parseInt(channel.statistics.videoCount, 10) || 0,
              view_count: parseInt(channel.statistics.viewCount, 10) || 0,
              ...(groupId ? { group_id: groupId } : {}),
            },
            { onConflict: 'user_id,youtube_channel_id' }
          )
          .select()
          .single()

        if (error) {
          results.push({ input: channelInput, status: 'error', error: 'Failed to save channel' })
          continue
        }

        await admin.from('competitor_channel_videos').delete().eq('competitor_channel_id', record.id)

        const recentVideos = await fetchChannelVideos(
          youtubeChannelId,
          youtubeApiKey,
          COMPETITOR_BASELINE_WINDOW
        )
        apiUnits += 4

        if (recentVideos.length) {
          await admin.from('competitor_channel_videos').insert(
            recentVideos.map((v) => ({
              user_id: user.id,
              competitor_channel_id: record.id,
              video_id: v.video_id,
              title: v.title,
              thumbnail_url: v.thumbnail_url,
              thumbnail_width: v.thumbnail_width,
              thumbnail_height: v.thumbnail_height,
              published_at: v.published_at,
              duration: v.duration,
              view_count: v.view_count,
              like_count: v.like_count,
              comment_count: v.comment_count,
            }))
          )

          await admin.rpc('recompute_competitor_outlier_scores', { channel_uuid: record.id })
        }

        results.push({
          input: channelInput,
          status: 'ok',
          channelName: channel.snippet.title,
        })
      } catch (err) {
        results.push({
          input: channelInput,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      await new Promise((r) => setTimeout(r, 300))
    }

    await admin.rpc('recompute_niche_outlier_scores', { user_uuid: user.id })

    await logYoutubeApiUsage(admin, {
      userId: user.id,
      endpoint: 'competitors/bulk-init',
      units: apiUnits,
    })

    const ok = results.filter((r) => r.status === 'ok').length
    return NextResponse.json({
      success: true,
      added: ok,
      total: results.length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
