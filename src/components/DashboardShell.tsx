'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileMenu } from './ProfileMenu'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tracking/my-videos', label: 'Tracking' },
]

type DashboardShellProps = {
  children: React.ReactNode
  email?: string
  onSignOut: () => void
}

export function DashboardShell({ children, email, onSignOut }: DashboardShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-bold text-[var(--foreground)]">
            Clik<span className="text-[var(--accent)]">Stats</span>
          </Link>
          <div className="flex items-center gap-3">
            <ProfileMenu email={email} />
            <button
              type="button"
              onClick={onSignOut}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-48 flex-shrink-0 md:block">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith('/tracking')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
