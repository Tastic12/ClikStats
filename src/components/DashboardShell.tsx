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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-bold text-gray-900">
            ClikStats
          </Link>
          <div className="flex items-center gap-3">
            <ProfileMenu email={email} />
            <button
              type="button"
              onClick={onSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
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
                pathname === item.href || pathname.startsWith('/tracking')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
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
