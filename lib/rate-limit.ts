/**
 * Rate limiting for the YouTube-API-touching endpoints. We use Upstash Redis
 * + their `Ratelimit` sliding-window helper, keyed on the authenticated user
 * ID. If the Upstash env vars are missing (e.g. local dev without setup),
 * rate limiting becomes a no-op and we log a single warning so it doesn't
 * crash the build or local development.
 *
 * The big risk this protects against: one bad actor can otherwise burn the
 * entire 10K-units/day YouTube quota in ~3 minutes of spamming
 * "Refresh all competitors", taking the app offline for everyone until
 * midnight Pacific. See ROADMAP.md → Rate limiting for the rationale.
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type LimiterId = 'sync-videos' | 'competitors-init' | 'competitors-refresh'

type LimiterSpec = {
  /** Tokens per window — short burst guard. */
  perMinute: number
  /** Tokens per day — hard ceiling so nobody burns the YouTube quota alone. */
  perDay: number
}

const LIMITS: Record<LimiterId, LimiterSpec> = {
  'sync-videos': { perMinute: 5, perDay: 30 },
  'competitors-init': { perMinute: 10, perDay: 50 },
  'competitors-refresh': { perMinute: 3, perDay: 20 },
}

let warnedAboutMissingEnv = false

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (!warnedAboutMissingEnv) {
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting is DISABLED. ' +
          'Set them in .env.local (and on Vercel) to enable.'
      )
      warnedAboutMissingEnv = true
    }
    return null
  }
  return new Redis({ url, token })
}

// Cache one Ratelimit instance per (limiter, window) pair so we don't re-build
// the Redis client on every request.
const cache = new Map<string, Ratelimit>()

function getLimiter(
  redis: Redis,
  id: LimiterId,
  window: 'minute' | 'day'
): Ratelimit {
  const key = `${id}:${window}`
  const existing = cache.get(key)
  if (existing) return existing
  const spec = LIMITS[id]
  const tokens = window === 'minute' ? spec.perMinute : spec.perDay
  const duration = window === 'minute' ? '1 m' : '1 d'
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, duration),
    analytics: false,
    prefix: `ratelimit:${id}:${window}`,
  })
  cache.set(key, rl)
  return rl
}

export type RateLimitResult =
  | { ok: true }
  | {
      ok: false
      status: 429
      message: string
      retryAfterSeconds: number
      scope: 'minute' | 'day'
    }

/**
 * Check both the per-minute burst and the per-day total. The first failing
 * limit wins; the response carries the friendlier message and the seconds
 * the user must wait. Returns ok=true if Upstash isn't configured so dev
 * workflows aren't blocked.
 */
export async function checkRateLimit(
  userId: string,
  limiterId: LimiterId
): Promise<RateLimitResult> {
  const redis = getRedis()
  if (!redis) return { ok: true }

  const minuteLimiter = getLimiter(redis, limiterId, 'minute')
  const dayLimiter = getLimiter(redis, limiterId, 'day')

  // Check the daily ceiling first — friendlier error message for someone
  // who's been clicking all day vs someone who's spam-clicking right now.
  const dayRes = await dayLimiter.limit(userId)
  if (!dayRes.success) {
    const wait = Math.max(1, Math.ceil((dayRes.reset - Date.now()) / 1000))
    return {
      ok: false,
      status: 429,
      message: `Daily limit reached for this action (${LIMITS[limiterId].perDay}/day). Try again in ${formatWait(wait)}.`,
      retryAfterSeconds: wait,
      scope: 'day',
    }
  }

  const minRes = await minuteLimiter.limit(userId)
  if (!minRes.success) {
    const wait = Math.max(1, Math.ceil((minRes.reset - Date.now()) / 1000))
    return {
      ok: false,
      status: 429,
      message: `Slow down — you can run this ${LIMITS[limiterId].perMinute} times per minute. Try again in ${wait}s.`,
      retryAfterSeconds: wait,
      scope: 'minute',
    }
  }

  return { ok: true }
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`
  return `${Math.ceil(seconds / 3600)}h`
}
