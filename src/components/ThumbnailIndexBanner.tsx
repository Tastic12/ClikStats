'use client'

import { useEffect, useRef, useState } from 'react'
import { embedThumbnailBatch, fetchPendingThumbnailCount } from '../../lib/hooks'

const POLL_INTERVAL_MS = 30_000
const COMPLETION_DISMISS_MS = 4_000

/**
 * Floating bottom-right indicator that quietly indexes thumbnails in the
 * background. On every page load (and every 30s thereafter), it asks the
 * server how many of the user's tracked thumbnails still need a CLIP
 * embedding. If there's any pending work, it runs the embed loop until done.
 *
 * Designed to be invisible during normal use — only appears while there's
 * work in flight, plus a brief "Done!" toast.
 */
export function ThumbnailIndexBanner() {
  const [pending, setPending] = useState<number | null>(null)
  const [indexing, setIndexing] = useState(false)
  const [doneSnapshot, setDoneSnapshot] = useState<number | null>(null)
  const [errored, setErrored] = useState<string | null>(null)
  const stopRef = useRef(false)
  const loopActiveRef = useRef(false)

  // Poll the cheap count endpoint on mount + every 30s.
  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      try {
        const count = await fetchPendingThumbnailCount()
        if (!cancelled) setPending(count)
      } catch {
        // Silent: if the count endpoint is down we just don't show anything.
      }
    }

    tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Whenever pending > 0 and we're not already running, kick off the loop.
  useEffect(() => {
    if (pending == null || pending === 0) return
    if (loopActiveRef.current) return

    loopActiveRef.current = true
    stopRef.current = false
    setIndexing(true)
    setErrored(null)

    let processedTotal = 0

    ;(async () => {
      try {
        while (!stopRef.current) {
          const r = await embedThumbnailBatch()
          processedTotal += r.processed
          setPending(r.remaining)
          if (r.remaining === 0) break
          if (r.processed === 0) break // server returned nothing useful — bail
          await new Promise((res) => setTimeout(res, 250))
        }
        if (!stopRef.current && processedTotal > 0) {
          setDoneSnapshot(processedTotal)
          setTimeout(() => setDoneSnapshot(null), COMPLETION_DISMISS_MS)
        }
      } catch (err) {
        setErrored(err instanceof Error ? err.message : 'Indexing failed.')
      } finally {
        setIndexing(false)
        loopActiveRef.current = false
      }
    })()
  }, [pending])

  // Nothing to show when there's no work and no recent completion to flash.
  if (!indexing && doneSnapshot == null && !errored) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg shadow-xl ring-1 ring-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-3">
      {indexing && (
        <div className="flex items-start gap-3">
          <span className="inline-block h-2.5 w-2.5 mt-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Indexing thumbnails
            </p>
            <p className="text-xs text-[var(--muted)]">
              {pending != null && pending > 0
                ? `${pending} remaining…`
                : 'Wrapping up…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRef.current = true
            }}
            className="ml-2 text-[10px] uppercase text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Stop
          </button>
        </div>
      )}
      {!indexing && doneSnapshot != null && (
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
          <p className="text-sm text-[var(--foreground)]">
            Indexed {doneSnapshot} new thumbnail{doneSnapshot === 1 ? '' : 's'}.
          </p>
        </div>
      )}
      {!indexing && errored && (
        <div className="flex items-start gap-2">
          <span className="inline-block h-2.5 w-2.5 mt-1.5 rounded-full bg-[var(--danger)]" />
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)]">Auto-indexing failed</p>
            <p className="text-xs text-[var(--muted)] break-words">{errored}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrored(null)}
            className="ml-2 text-[10px] uppercase text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
