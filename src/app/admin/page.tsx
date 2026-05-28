'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { DashboardShell } from '../../components/DashboardShell'

type QuotaPayload = {
  daily_quota: number
  today: {
    totalUnits: number
    callCount: number
    byEndpoint: Record<string, number>
    remaining: number
  }
  last_7_days: {
    totalUnits: number
    callCount: number
    byEndpoint: Record<string, number>
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [data, setData] = useState<QuotaPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) {
        router.push('/auth')
        return
      }
      setUser(u)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/admin/quota', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const json = await res.json()
        if (res.status === 403) {
          setError('Admin access only. Add your email to ADMIN_EMAILS on Vercel.')
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error(json.error || 'Failed to load quota')
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data')
      } finally {
        setLoading(false)
      }
    })
  }, [router])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  const pct = data
    ? Math.min(100, Math.round((data.today.totalUnits / data.daily_quota) * 100))
    : 0

  return (
    <DashboardShell
      email={user.email}
      onSignOut={async () => {
        await supabase.auth.signOut()
        router.push('/')
      }}
    >
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Admin</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            YouTube API quota tracking (resets midnight Pacific Time on Google&apos;s side).
          </p>
        </header>

        {loading && <p className="text-[var(--muted)]">Loading…</p>}
        {error && <p className="text-[var(--danger)]">{error}</p>}

        {data && (
          <>
            <section className="cs-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Today (UTC)</h2>
              <div className="h-3 rounded-full bg-[var(--elevated)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm text-[var(--foreground)]">
                {data.today.totalUnits.toLocaleString()} / {data.daily_quota.toLocaleString()} units
                estimated · {data.today.remaining.toLocaleString()} remaining
              </p>
              <p className="text-xs text-[var(--muted)]">
                {data.today.callCount} logged API operations
              </p>
            </section>

            <section className="cs-card p-5">
              <h2 className="text-sm font-semibold mb-3">By endpoint (today)</h2>
              {Object.keys(data.today.byEndpoint).length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No usage logged yet today.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {Object.entries(data.today.byEndpoint)
                    .sort((a, b) => b[1] - a[1])
                    .map(([endpoint, units]) => (
                      <li key={endpoint} className="flex justify-between gap-4">
                        <span className="text-[var(--muted)] truncate">{endpoint}</span>
                        <span className="font-medium">{units} units</span>
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <section className="cs-card p-5">
              <h2 className="text-sm font-semibold mb-2">Last 7 days</h2>
              <p className="text-sm">
                {data.last_7_days.totalUnits.toLocaleString()} units across{' '}
                {data.last_7_days.callCount.toLocaleString()} calls
              </p>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
