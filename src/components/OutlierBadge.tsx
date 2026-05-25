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
const TIERS: Tier[] = [
  { min: 10, label: 'Viral',      className: 'bg-red-500/15    text-red-400    ring-red-500/30' },
  { min: 5,  label: 'Breakout',   className: 'bg-orange-500/15 text-orange-300 ring-orange-500/30' },
  { min: 3,  label: 'Outlier',    className: 'bg-yellow-400/15 text-yellow-300 ring-yellow-400/30' },
  { min: 1.5,label: 'Above avg',  className: 'bg-blue-500/15   text-blue-300   ring-blue-500/30' },
  { min: 0,  label: 'Average',    className: 'bg-zinc-500/15   text-zinc-300   ring-zinc-500/30' },
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
      ? 'text-xs px-2 py-0.5'
      : 'text-[10px] px-1.5 py-[1px]'

  return (
    <span
      title={`Outlier score: ${formatOutlierScore(score)} (${tier.label}) — multiplier vs. this channel's median recent uploads`}
      className={`inline-flex items-center gap-1 rounded font-semibold ring-1 ${tier.className} ${sizing} ${className}`}
    >
      {formatOutlierScore(score)}
    </span>
  )
}
