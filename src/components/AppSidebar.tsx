'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavLink = { href: string; label: string; match?: (path: string) => boolean }

type NavSection = {
  id: string
  label: string
  items: NavLink[]
  defaultOpen?: boolean
}

const sections: NavSection[] = [
  {
    id: 'competitors',
    label: 'Competitors',
    defaultOpen: true,
    items: [
      {
        href: '/tracking/competitors/channels',
        label: 'Channels',
        match: (p) => p.startsWith('/tracking/competitors/channels'),
      },
      {
        href: '/tracking/competitors/videos',
        label: 'Videos',
        match: (p) => p.startsWith('/tracking/competitors/videos'),
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    defaultOpen: true,
    items: [
      {
        href: '/tracking/outliers',
        label: 'Performing now',
        match: (p) => p.startsWith('/tracking/outliers'),
      },
      {
        href: '/tracking/discover',
        label: 'Discover',
        match: (p) => p.startsWith('/tracking/discover'),
      },
      {
        href: '/tracking/thumbnails',
        label: 'Thumbnail search',
        match: (p) => p.startsWith('/tracking/thumbnails'),
      },
    ],
  },
  {
    id: 'my-channel',
    label: 'My channel',
    defaultOpen: false,
    items: [
      {
        href: '/tracking/my-videos',
        label: 'Videos & sync',
        match: (p) => p.startsWith('/tracking/my-videos'),
      },
    ],
  },
]

function isActive(link: NavLink, pathname: string) {
  return link.match ? link.match(pathname) : pathname === link.href
}

type AppSidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.defaultOpen !== false]))
  )

  useEffect(() => {
    for (const section of sections) {
      if (section.items.some((item) => isActive(item, pathname))) {
        setOpenSections((prev) => ({ ...prev, [section.id]: true }))
      }
    }
  }, [pathname])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const navBody = (
    <nav className="flex flex-col gap-1 p-3">
      <Link
        href="/dashboard"
        onClick={onMobileClose}
        className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          pathname === '/dashboard'
            ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
            : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--elevated)]'
        }`}
      >
        {collapsed ? '⌂' : 'Dashboard'}
      </Link>

      {sections.map((section) => (
        <div key={section.id} className="mt-2">
          {!collapsed && (
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-2)] hover:text-[var(--muted)]"
            >
              {section.label}
              <span className="text-xs">{openSections[section.id] ? '−' : '+'}</span>
            </button>
          )}
          {(collapsed || openSections[section.id]) && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {section.items.map((item) => {
                const active = isActive(item, pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] font-medium'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--elevated)]'
                    } ${collapsed ? 'text-center text-xs' : 'pl-4'}`}
                  >
                    {collapsed ? item.label.charAt(0) : item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-14 z-40 h-[calc(100vh-3.5rem)] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-56'}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto">{navBody}</div>
          <div className="hidden lg:block border-t border-[var(--border)] p-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-full rounded-lg px-2 py-2 text-xs text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
            >
              {collapsed ? '→' : '← Collapse'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
