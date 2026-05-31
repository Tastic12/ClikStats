'use client'

import { useState } from 'react'
import { OutlierBadge } from './OutlierBadge'

const demoTabs = [
  { id: 'competitors', label: 'Competitors' },
  { id: 'outliers', label: 'Performing now' },
  { id: 'thumbnails', label: 'Thumbnail search' },
] as const

type DemoTab = (typeof demoTabs)[number]['id']

const demoChannels = [
  { name: 'BeatLab', subs: '1.2M', outlier: 4.2, thumb: 'from-violet-600 to-indigo-900' },
  { name: 'GearReview HQ', subs: '890K', outlier: 3.1, thumb: 'from-fuchsia-700 to-purple-900' },
  { name: 'Daily Drive', subs: '2.4M', outlier: 5.8, thumb: 'from-blue-700 to-violet-900' },
]

export function HomeProductPreview() {
  const [tab, setTab] = useState<DemoTab>('competitors')

  return (
    <section className="px-4 sm:px-6 lg:px-8 xl:px-10 py-16 sm:py-20 border-b border-[var(--border)] bg-[var(--elevated)]/20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            See it in action
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
            Built for niche tracking, not generic analytics
          </h2>
          <p className="mt-4 text-[var(--muted)]">
            Click the tabs below — this is a live preview of how ClikStats organises competitors,
            outlier scores, and thumbnail search.
          </p>
        </div>

        <div
          className="rounded-xl ring-1 ring-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xl shadow-black/20"
          aria-label="Interactive product preview"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--elevated)]/50">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-3 text-xs text-[var(--muted)]">clikstats.com — preview</span>
          </div>

          <div className="flex flex-wrap gap-1 p-3 border-b border-[var(--border)]">
            {demoTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-2 text-xs font-medium min-h-10 transition-colors ${
                  tab === t.id
                    ? 'bg-[var(--accent-glow)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                    : 'text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 min-h-[280px]">
            {tab === 'competitors' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {demoChannels.map((ch) => (
                  <div
                    key={ch.name}
                    className="rounded-lg ring-1 ring-[var(--border)] overflow-hidden bg-[var(--card)]/40"
                  >
                    <div className={`aspect-video bg-gradient-to-br ${ch.thumb} relative`}>
                      <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white/90 bg-black/50 px-1.5 py-0.5 rounded">
                        {ch.name}
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--muted)]">{ch.subs} subs</span>
                      <OutlierBadge score={ch.outlier} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'outliers' && (
              <ul className="space-y-2">
                {[
                  { title: 'I tried every camera under $500', score: 6.2, channel: 'GearReview HQ' },
                  { title: 'This beat took 20 minutes', score: 4.8, channel: 'BeatLab' },
                  { title: 'POV: morning commute chaos', score: 3.4, channel: 'Daily Drive' },
                ].map((v) => (
                  <li
                    key={v.title}
                    className="flex items-center gap-3 rounded-lg ring-1 ring-[var(--border)] p-3 bg-[var(--elevated)]/30"
                  >
                    <div className="h-12 w-20 shrink-0 rounded bg-gradient-to-br from-zinc-700 to-zinc-900" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{v.title}</p>
                      <p className="text-[10px] text-[var(--muted)]">{v.channel}</p>
                    </div>
                    <OutlierBadge score={v.score} size="sm" />
                  </li>
                ))}
              </ul>
            )}

            {tab === 'thumbnails' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="cs-input flex-1 px-3 py-2 text-sm text-[var(--muted)]">
                    shocked face red arrow money…
                  </div>
                  <span className="cs-btn-primary px-4 py-2 text-sm inline-flex items-center">
                    Search
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[92, 87, 84, 79].map((pct, i) => (
                    <div
                      key={pct}
                      className="aspect-video rounded-md bg-gradient-to-br from-violet-800/80 to-fuchsia-900/80 relative ring-1 ring-[var(--border)]"
                    >
                      <span className="absolute top-1 left-1 text-[10px] font-bold text-white bg-black/60 px-1 rounded">
                        {pct}%
                      </span>
                      <span className="absolute bottom-1 left-1 text-[9px] text-white/80 bg-black/40 px-1 rounded">
                        {i === 0 ? 'You' : 'Rival'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
