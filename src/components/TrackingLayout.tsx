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
        <h1 className="text-2xl font-bold text-gray-900">Tracking</h1>
        <p className="mt-1 text-sm text-gray-600">
          Performance for your channel and competitors you add.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-4">
          {trackingTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 pb-3 text-sm font-medium whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
