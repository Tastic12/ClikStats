import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Categories fetched nightly for GB trending (~7 API units/day).
const CRON_CATEGORY_IDS = [20, 24, 25, 28, 17, 10, 26]
const CRON_REGION = 'GB'

type TrendingItem = {
  id: string
  snippet: {
    title: string
    channelId: string
    channelTitle: string
    publishedAt: string
    thumbnails: { maxres?: { url: string }; high?: { url: string }; medium?: { url: string } }
    categoryId?: string
  }
  statistics?: { viewCount?: string; likeCount?: string }
  contentDetails?: { duration?: string }
}

async function fetchCategoryTrending(
  apiKey: string,
  regionCode: string,
  categoryId: number
) {
  const params = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode,
    videoCategoryId: String(categoryId),
    maxResults: '50',
    key: apiKey,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `YouTube API ${res.status}`)
  }
  return (data.items || []) as TrendingItem[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (!youtubeApiKey) {
      return new Response(JSON.stringify({ error: 'YouTube API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date().toISOString()
    let apiCalls = 0
    let saved = 0
    const errors: string[] = []

    for (const categoryId of CRON_CATEGORY_IDS) {
      try {
        const items = await fetchCategoryTrending(youtubeApiKey, CRON_REGION, categoryId)
        apiCalls += 1

        if (!items.length) continue

        const rows = items.map((item) => {
          const thumb =
            item.snippet.thumbnails.maxres?.url ||
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.medium?.url ||
            ''
          return {
            video_id: item.id,
            title: item.snippet.title,
            thumbnail_url: thumb,
            channel_id: item.snippet.channelId,
            channel_name: item.snippet.channelTitle,
            category_id: Number(item.snippet.categoryId || categoryId),
            region_code: CRON_REGION,
            published_at: item.snippet.publishedAt,
            duration: item.contentDetails?.duration ?? null,
            view_count: parseInt(item.statistics?.viewCount || '0', 10) || 0,
            like_count: parseInt(item.statistics?.likeCount || '0', 10) || 0,
            last_seen_at: now,
          }
        })

        const { error } = await supabase.from('discovered_videos').upsert(rows, {
          onConflict: 'video_id,region_code,category_id',
        })
        if (error) {
          errors.push(`category ${categoryId}: ${error.message}`)
        } else {
          saved += rows.length
        }
      } catch (err) {
        errors.push(
          `category ${categoryId}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
      await new Promise((r) => setTimeout(r, 200))
    }

    return new Response(
      JSON.stringify({
        success: true,
        saved,
        api_calls: apiCalls,
        region: CRON_REGION,
        categories: CRON_CATEGORY_IDS,
        errors: errors.length ? errors : undefined,
        timestamp: now,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('discover-trending-cron error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
