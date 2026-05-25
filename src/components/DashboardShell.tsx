'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileMenu } from './ProfileMenu'
import { ThumbnailIndexBanner } from './ThumbnailIndexBanner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tracking/my-videos', label: 'Tracking' },
]

type DashboardShellProps = {
  children: React.ReactNode
  email?: string
  onSignOut: () => void
  /** @deprecated Layout is always full width */
  wide?: boolean
}

export function DashboardShell({ children, email, onSignOut }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the mobile menu whenever we navigate to a new route so the
  // user isn't left with a stale overlay covering the new page.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isItemActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith('/tracking')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* Mobile menu button — only visible under md, sits to the left of the logo */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--elevated)]"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <Link
            href="/dashboard"
            className="shrink-0 text-lg font-bold text-[var(--foreground)]"
          >
            Clik<span className="text-[var(--accent)]">Stats</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex flex-1 items-center gap-1 min-w-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  isItemActive(item.href)
                    ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--elevated)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Spacer on mobile so profile menu sits hard-right */}
          <div className="md:hidden flex-1" />

          <div className="flex shrink-0 items-center">
            <ProfileMenu email={email} onSignOut={onSignOut} />
          </div>
        </div>

        {/* Mobile drawer — slides down from header on md and below */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)]">
            <nav className="flex flex-col px-2 py-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isItemActive(item.href)
                      ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--elevated)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">{children}</main>
      <ThumbnailIndexBanner />
    </div>
  )
}
