'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const trackingTabs = [
  { href: '/tracking/my-videos', label: 'My videos' },
  { href: '/tracking/outliers', label: 'Outliers' },
  { href: '/tracking/thumbnails', label: 'Thumbnail search' },
  { href: '/tracking/competitors/channels', label: 'Competitor channels' },
  { href: '/tracking/competitors/videos', label: 'Competitor videos' },
]

export function TrackingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="w-full space-y-6">
      <header className="pb-4 sm:pb-6 border-b border-[var(--border)]">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Tracking</h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--muted)]">
          Performance for your channel and competitors you add.
        </p>
      </header>

      {/* Horizontal scroll on narrow viewports prevents the 5 tabs from
          wrapping into ugly multi-row stacks. The negative margin lets the
          row bleed to the page edge so the last tab isn't clipped. */}
      <div className="border-b border-[var(--border)] -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-thin">
        <nav className="-mb-px flex gap-1 min-w-max">
          {trackingTabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-3 sm:px-4 pb-3 pt-1 min-h-[44px] flex items-center text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {children}
    </div>
  )
}
