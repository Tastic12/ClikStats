'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const trackingTabs = [
  { href: '/tracking/my-videos', label: 'My videos' },
  { href: '/tracking/competitors/channels', label: 'Competitor channels' },
  { href: '/tracking/competitors/videos', label: 'Competitor videos' },
]

export function TrackingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Tracking</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Performance for your channel and competitors you add.
        </p>
      </div>

      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex flex-wrap gap-1">
          {trackingTabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-4 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
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
