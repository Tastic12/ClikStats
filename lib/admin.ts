import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** YouTube Data API v3 default daily quota per project key. */
export const YOUTUBE_DAILY_QUOTA = 10_000

/**
 * Log estimated YouTube API unit consumption. Fire-and-forget — never blocks
 * the caller on failure.
 */
export async function logYoutubeApiUsage(
  admin: SupabaseClient,
  opts: { userId?: string | null; endpoint: string; units?: number }
) {
  try {
    await admin.from('youtube_api_usage').insert({
      user_id: opts.userId ?? null,
      endpoint: opts.endpoint,
      units: opts.units ?? 1,
    })
  } catch {
    // Logging must never break the main request path.
  }
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const raw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || ''
  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (!allowed.length) return false
  return allowed.includes(email.toLowerCase())
}

export async function getYoutubeUsageSummary(admin: SupabaseClient, since?: Date) {
  const { data, error } = await admin.rpc('youtube_api_usage_summary', {
    since_ts: since?.toISOString() ?? null,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    totalUnits: Number(row?.total_units ?? 0),
    callCount: Number(row?.call_count ?? 0),
    byEndpoint: (row?.by_endpoint ?? {}) as Record<string, number>,
    remaining: Math.max(0, YOUTUBE_DAILY_QUOTA - Number(row?.total_units ?? 0)),
  }
}

export function createServiceAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server configuration error')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
