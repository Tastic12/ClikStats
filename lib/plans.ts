/**
 * Subscription scaffolding — no billing wired yet.
 *
 * Set NEXT_PUBLIC_UNLOCK_ALL_FEATURES=true in .env to bypass gates during beta.
 * When Stripe ships, set that to false and assign plan='pro' in the users table.
 */

export type PlanId = 'free' | 'pro'

export type PlanFeature =
  | 'change_connected_channel'
  | 'unlimited_competitors'
  | 'discover_extra_categories'

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
}

/** What each tier will unlock once billing is live. */
export const PLAN_FEATURE_COPY: Record<PlanFeature, { label: string; description: string }> = {
  change_connected_channel: {
    label: 'Change connected channel',
    description: 'Swap which YouTube channel is linked to your account.',
  },
  unlimited_competitors: {
    label: 'Higher competitor limits',
    description: 'Track more competitor channels and videos per account.',
  },
  discover_extra_categories: {
    label: 'More Discover categories',
    description: 'Pull trending from additional niches at once.',
  },
}

const PRO_FEATURES: PlanFeature[] = [
  'change_connected_channel',
  'unlimited_competitors',
  'discover_extra_categories',
]

const FREE_FEATURES: PlanFeature[] = []

export function normalizePlan(raw: string | null | undefined): PlanId {
  return raw === 'pro' ? 'pro' : 'free'
}

export function featuresForPlan(plan: PlanId): PlanFeature[] {
  return plan === 'pro' ? PRO_FEATURES : FREE_FEATURES
}

export function canUseFeature(plan: PlanId, feature: PlanFeature): boolean {
  // Beta default: all features open unless explicitly locked down.
  if (process.env.NEXT_PUBLIC_UNLOCK_ALL_FEATURES !== 'false') return true
  return featuresForPlan(plan).includes(feature)
}

export function proFeatureList(): PlanFeature[] {
  return PRO_FEATURES.filter((f) => !FREE_FEATURES.includes(f))
}
