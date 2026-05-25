'use client'

type OutlierBadgeProps = {
  score?: number | null
  size?: 'sm' | 'md'
  className?: string
}

type Tier = {
  /** Inclusive minimum score that activates this tier. */
  min: number
  label: string
  className: string
}

// Ordered high → low so the first match wins.
// Solid fills + dark ring + drop shadow so the badge stays legible on any
// thumbnail background, not just on dark UI surfaces.
const TIERS: Tier[] = [
  { min: 10, label: 'Viral',      className: 'bg-red-600    text-white     ring-black/50' },
  { min: 5,  label: 'Breakout',   className: 'bg-orange-500 text-white     ring-black/50' },
  { min: 3,  label: 'Outlier',    className: 'bg-amber-400  text-amber-950 ring-black/50' },
  { min: 1.5,label: 'Above avg',  className: 'bg-blue-600   text-white     ring-black/50' },
  { min: 0,  label: 'Average',    className: 'bg-zinc-800   text-zinc-100  ring-black/50' },
]

function tierFor(score: number): Tier {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1]
}

export function formatOutlierScore(score: number): string {
  if (score >= 100) return `${Math.round(score)}×`
  if (score >= 10) return `${score.toFixed(1)}×`
  return `${score.toFixed(2)}×`
}

export function OutlierBadge({ score, size = 'sm', className = '' }: OutlierBadgeProps) {
  if (score == null || !Number.isFinite(score)) return null

  const tier = tierFor(score)
  const sizing =
    size === 'md'
      ? 'text-sm px-2 py-0.5'
      : 'text-[11px] px-1.5 py-0.5'

  return (
    <span
      title={`Outlier score: ${formatOutlierScore(score)} (${tier.label}) — multiplier vs. this channel's median recent uploads`}
      className={`inline-flex items-center gap-1 rounded-md font-bold tracking-tight shadow-md ring-1 ${tier.className} ${sizing} ${className}`}
    >
      {formatOutlierScore(score)}
    </span>
  )
}
