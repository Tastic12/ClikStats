'use client'

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="flex h-14 w-full items-center gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
          <Link
            href="/dashboard"
            className="shrink-0 text-lg font-bold text-[var(--foreground)]"
          >
            Clik<span className="text-[var(--accent)]">Stats</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 min-w-0">
            {navItems.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith('/tracking')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--elevated)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <ProfileMenu email={email} />
            <button
              type="button"
              onClick={onSignOut}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">{children}</main>
      <ThumbnailIndexBanner />
    </div>
  )
}
