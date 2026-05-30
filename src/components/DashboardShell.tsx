'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileMenu } from './ProfileMenu'
import { ThumbnailIndexBanner } from './ThumbnailIndexBanner'
import { AppSidebar } from './AppSidebar'
import { ConnectedChannelBar } from './ConnectedChannelBar'
import { useOwnedChannel } from '../../lib/hooks'

type DashboardShellProps = {
  children: React.ReactNode
  email?: string
  onSignOut: () => void
  /** @deprecated Layout is always full width */
  wide?: boolean
}

export function DashboardShell({ children, email, onSignOut }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { channel, isLoading: channelLoading, mutate: mutateChannel } = useOwnedChannel()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="flex h-14 w-full items-center gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--elevated)]"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {mobileNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <Link href="/dashboard" className="shrink-0 text-lg font-bold text-[var(--foreground)]">
            Clik<span className="text-[var(--accent)]">Stats</span>
          </Link>

          <div className="hidden md:flex flex-1 min-w-0 px-2 border-l border-[var(--border)] ml-1 pl-4">
            <ConnectedChannelBar
              channel={channel}
              isLoading={channelLoading}
              onChannelChanged={() => mutateChannel()}
            />
          </div>

          <div className="flex-1 md:flex-none" />

          <div className="flex shrink-0 items-center">
            <ProfileMenu email={email} onSignOut={onSignOut} />
          </div>
        </div>

        <div className="md:hidden border-t border-[var(--border)] px-4 py-2">
          <ConnectedChannelBar
            channel={channel}
            isLoading={channelLoading}
            onChannelChanged={() => mutateChannel()}
          />
        </div>
      </header>

      <div className="flex flex-1 w-full min-h-0">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 overflow-x-hidden">
          {children}
        </main>
      </div>

      <ThumbnailIndexBanner />
    </div>
  )
}
