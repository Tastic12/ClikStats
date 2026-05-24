'use client'

import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

const features = [
  {
    icon: '📊',
    title: 'Channel dashboard',
    description:
      'See subscribers, total views, and your latest uploads in one place with clear performance charts.',
  },
  {
    icon: '🎬',
    title: 'My videos',
    description:
      'Track views, likes, and comments over time for every video on your channel — from upload to today.',
  },
  {
    icon: '🔍',
    title: 'Competitor tracking',
    description:
      'Monitor rival channels and videos, filter by category, and compare performance side by side.',
  },
  {
    icon: '🔄',
    title: 'Automated snapshots',
    description:
      'Daily metric syncs build history so your charts grow more accurate the longer you use ClikStats.',
  },
]

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const primaryCta = user ? (
    <Link href="/dashboard" className="cs-btn-primary inline-flex items-center justify-center px-8 py-3 text-base md:py-4 md:text-lg md:px-10">
      Go to dashboard
    </Link>
  ) : (
    <Link href="/auth" className="cs-btn-primary inline-flex items-center justify-center px-8 py-3 text-base md:py-4 md:text-lg md:px-10">
      Get started free
    </Link>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
          <Link href="/" className="shrink-0 text-lg font-bold text-[var(--foreground)]">
            Clik<span className="text-[var(--accent)]">Stats</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <Link
                  href="/tracking/my-videos"
                  className="hidden sm:inline text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] whitespace-nowrap"
                >
                  Tracking
                </Link>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] whitespace-nowrap"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/auth" className="cs-btn-primary px-4 py-2 text-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-8 xl:px-10 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-[var(--border)]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
              YouTube analytics
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl">
              <span className="block">Your channel.</span>
              <span className="block text-[var(--accent)]">Your competitors.</span>
              <span className="block">One dashboard.</span>
            </h1>
            <p className="mt-6 text-base text-[var(--muted)] sm:text-lg md:max-w-2xl md:mx-auto">
              ClikStats tracks your YouTube performance and the channels you care about — with
              charts, categories, and side-by-side comparisons built for creators who want clarity,
              not clutter.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {primaryCta}
              {!user && (
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-[var(--foreground)] border border-[var(--border-strong)] rounded-lg hover:bg-[var(--elevated)] transition-colors md:py-4 md:text-lg md:px-10"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 sm:px-6 lg:px-8 xl:px-10 py-16 sm:py-20 border-b border-[var(--border)]">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
                Everything you need to grow with data
              </h2>
              <p className="mt-4 text-[var(--muted)]">
                The same dark purple experience across dashboard, tracking, and your video analytics.
              </p>
            </div>

            <ul className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-12">
              {features.map((feature) => (
                <li key={feature.title} className="flex gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--elevated)] text-xl"
                    aria-hidden
                  >
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{feature.title}</h3>
                    <p className="mt-2 text-[var(--muted)] leading-relaxed">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 lg:px-8 xl:px-10 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
                Ready to track what matters?
              </h2>
              <p className="mt-3 text-lg text-[var(--accent)]">
                Connect your channel and start comparing today.
              </p>
            </div>
            <div className="shrink-0">{primaryCta}</div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        <p className="text-center text-sm text-[var(--muted)]">
          © 2026{' '}
          <a
            href="https://clikstats.com"
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            clikstats.com
          </a>
        </p>
      </footer>
    </div>
  )
}
