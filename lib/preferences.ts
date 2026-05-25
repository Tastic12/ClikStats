'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Per-browser UI preferences stored in localStorage. We avoid Supabase
 * round-trips for things that only affect rendering; the trade-off is that
 * preferences don't sync across devices, which is fine for a personal app.
 */

const HIDE_SHORTS_KEY = 'clikstats:hide-shorts'
const DEFAULT_HIDE_SHORTS = true

type Listener = (hide: boolean) => void
const listeners = new Set<Listener>()

function readHideShorts(): boolean {
  if (typeof window === 'undefined') return DEFAULT_HIDE_SHORTS
  try {
    const raw = window.localStorage.getItem(HIDE_SHORTS_KEY)
    if (raw === null) return DEFAULT_HIDE_SHORTS
    return raw === '1'
  } catch {
    return DEFAULT_HIDE_SHORTS
  }
}

function writeHideShorts(hide: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HIDE_SHORTS_KEY, hide ? '1' : '0')
  } catch {
    // Storage may be disabled (private mode, etc.) — fail open.
  }
  for (const l of listeners) l(hide)
}

/**
 * Subscribe to the global "Hide Shorts" preference. Returns the current
 * value, a setter, and a `mounted` flag that's false on the first SSR pass
 * (so callers can avoid rendering preference-dependent UI before hydration).
 */
export function useShortsPreference() {
  const [hideShorts, setHide] = useState<boolean>(DEFAULT_HIDE_SHORTS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHide(readHideShorts())

    const listener: Listener = (h) => setHide(h)
    listeners.add(listener)

    const onStorage = (e: StorageEvent) => {
      if (e.key === HIDE_SHORTS_KEY && e.newValue !== null) {
        setHide(e.newValue === '1')
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setHideShorts = useCallback((next: boolean) => {
    writeHideShorts(next)
  }, [])

  return { hideShorts, setHideShorts, mounted }
}

/**
 * Filter helper for any list of videos that exposes `is_short`.
 * If hideShorts is false, returns the list unchanged.
 * If hideShorts is true, drops every video whose is_short flag is strictly true.
 * (NULL/undefined is treated as long-form — safe default for legacy rows.)
 */
export function filterByShorts<T extends { is_short?: boolean | null }>(
  items: T[] | undefined,
  hideShorts: boolean
): T[] {
  if (!items || !hideShorts) return items ?? []
  return items.filter((v) => v.is_short !== true)
}
