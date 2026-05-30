'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/tracking/competitors/channels', label: 'Channels' },
  { href: '/tracking/competitors/videos', label: 'Videos' },
]

export default function CompetitorsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Competitors</h1>
        <p className="mt-2 text-sm text-[var(--muted)] max-w-3xl">
          Track rival channels and individual videos. Organise them into folders (categories) so
          you can compare niches — music, gaming, news, and so on.
        </p>
      </header>

      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-4 py-2.5 min-h-11 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
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
