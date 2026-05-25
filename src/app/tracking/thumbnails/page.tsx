'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabase'
import {
  searchThumbnails,
  searchThumbnailsByImage,
  searchSimilarToVideo,
  embedThumbnailBatch,
  type ThumbnailSearchResult,
} from '../../../../lib/hooks'
import { useShortsPreference } from '../../../../lib/preferences'
import { DashboardShell } from '../../../components/DashboardShell'
import { TrackingLayout } from '../../../components/TrackingLayout'
import { youtubeWatchUrl } from '@/lib/youtube'
import { formatCount } from '@/lib/format'
import { OutlierBadge } from '../../../components/OutlierBadge'

const EXAMPLE_QUERIES = [
  'red arrow pointing at money',
  'shocked face close-up',
  'before and after transformation',
  'glowing neon text',
  'person holding giant object',
]

export default function ThumbnailSearchPage() {
  // useSearchParams() forces this subtree to be client-rendered and Next 15
  // requires it to live inside a Suspense boundary so the rest of the
  // dashboard shell can still be prerendered.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
          <p className="text-[var(--muted)]">Loading…</p>
        </div>
      }
    >
      <ThumbnailSearchPageInner />
    </Suspense>
  )
}

function ThumbnailSearchPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hideShorts } = useShortsPreference()
  const [user, setUser] = useState<User | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ThumbnailSearchResult[]>([])
  const [searchError, setSearchError] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'image' | 'similar'>('text')
  const [searchContext, setSearchContext] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Admin / indexing state
  const [indexing, setIndexing] = useState(false)
  const [indexMsg, setIndexMsg] = useState('')
  const [processedTotal, setProcessedTotal] = useState(0)
  const indexShouldStop = useRef(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  // Deep-link from outlier cards (?similar=<videoId>&title=<title>): once
  // we have a logged-in user, run a similar-search and then clean the URL.
  useEffect(() => {
    if (!user) return
    const similarId = searchParams.get('similar')
    if (!similarId) return
    const title = searchParams.get('title')
    runSimilarSearch(similarId, title)
    router.replace('/tracking/thumbnails')
    // We only want this to fire once per arrival from the outliers page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const runSearch = async (q: string) => {
    setSearching(true)
    setSearchError('')
    setLastQuery(q)
    setSearchMode('text')
    setSearchContext('')
    try {
      // Ask for more matches than we'll display so client-side Shorts
      // filtering doesn't leave the grid feeling sparse.
      const r = await searchThumbnails(q, hideShorts ? 48 : 24)
      setResults(r)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const runImageSearch = async (file: File) => {
    setSearching(true)
    setSearchError('')
    setLastQuery('')
    setSearchMode('image')
    setSearchContext(file.name)
    try {
      const r = await searchThumbnailsByImage(file, hideShorts ? 48 : 24)
      setResults(r)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Image search failed.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const runSimilarSearch = async (videoId: string, title: string | null) => {
    setSearching(true)
    setSearchError('')
    setLastQuery('')
    setSearchMode('similar')
    setSearchContext(title || videoId)
    try {
      const r = await searchSimilarToVideo(videoId, hideShorts ? 48 : 24)
      setResults(r)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Similar search failed.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) runImageSearch(file)
    // Reset so the same file can be re-uploaded
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    await runSearch(query.trim())
  }

  /**
   * Run embed-batch repeatedly until the server reports zero remaining.
   * The button toggles to "Stop" while looping so the user can interrupt.
   */
  const runIndexLoop = async () => {
    setIndexing(true)
    setIndexMsg('')
    setProcessedTotal(0)
    indexShouldStop.current = false
    try {
      while (!indexShouldStop.current) {
        const r = await embedThumbnailBatch()
        setProcessedTotal((p) => p + r.processed)
        setIndexMsg(
          r.remaining > 0
            ? `Embedded ${r.processed} thumbnails this batch · ${r.remaining} remaining…`
            : `Done. ${r.processed > 0 ? `Embedded ${r.processed} this batch. ` : ''}Index is up to date.`
        )
        if (r.remaining === 0) break
        // Tiny breather between batches so cold-start retries don't pile up.
        await new Promise((res) => setTimeout(res, 250))
      }
      if (indexShouldStop.current) {
        setIndexMsg(`Stopped. ${processedTotal > 0 ? `Embedded ${processedTotal} thumbnails so far.` : ''}`)
      }
    } catch (err) {
      setIndexMsg(err instanceof Error ? err.message : 'Indexing failed.')
    } finally {
      setIndexing(false)
    }
  }

  const stopIndexing = () => {
    indexShouldStop.current = true
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  return (
    <DashboardShell
      email={user.email}
      onSignOut={async () => {
        await supabase.auth.signOut()
        router.push('/')
      }}
    >
      <TrackingLayout>
        <div className="space-y-6 w-full">
          <section className="pb-6 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              What is thumbnail search?
            </h2>
            <p className="text-xs text-[var(--muted)] max-w-3xl">
              Search the thumbnails you&apos;re tracking by what they{' '}
              <strong>look like</strong>, not by the words in their title. Type a description
              (&quot;red arrow money face&quot;) and we&apos;ll find the visually closest thumbnails
              across your own videos and every competitor you track, sorted by similarity. Powered
              by OpenAI&apos;s CLIP model running locally on the server.
            </p>
          </section>

          <section>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe a thumbnail…"
                className="cs-input flex-1 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="cs-btn-primary px-4 py-2 text-sm"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={searching}
                className="cs-input px-3 py-2 text-sm whitespace-nowrap hover:bg-[var(--card)]"
                title="Upload an image to find visually similar thumbnails"
              >
                Search by image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
            </form>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted-2)] mr-1">
                Try:
              </span>
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q)
                    runSearch(q)
                  }}
                  className="rounded-full bg-[var(--elevated)] hover:bg-[var(--card)] text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-2.5 py-1 ring-1 ring-[var(--border)]"
                >
                  {q}
                </button>
              ))}
            </div>
            {searchError && (
              <p className="mt-2 text-sm text-[var(--danger)]">{searchError}</p>
            )}
          </section>

          {/* Admin: indexing controls */}
          <section className="rounded-lg bg-[var(--elevated)]/40 ring-1 ring-[var(--border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                  Index your thumbnails
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Before search works, each thumbnail needs to be converted to a vector and stored
                  once. Click the button below and we&apos;ll work through everything in batches of
                  25. Safe to leave running — you can stop and resume anytime.
                </p>
                {indexMsg && (
                  <p className="mt-2 text-xs text-[var(--muted-2)]">{indexMsg}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {!indexing ? (
                  <button
                    type="button"
                    onClick={runIndexLoop}
                    className="cs-btn-primary px-3 py-1.5 text-xs"
                  >
                    Embed pending thumbnails
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopIndexing}
                    className="cs-input px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Results */}
          <section>
            {(() => {
              const visibleResults = hideShorts
                ? results.filter((r) => r.is_short !== true)
                : results
              const hiddenCount = results.length - visibleResults.length

              // Build a human label for what triggered the current results.
              let contextLabel = ''
              if (!searching && results.length > 0) {
                if (searchMode === 'text' && lastQuery) contextLabel = `for "${lastQuery}"`
                else if (searchMode === 'image') contextLabel = `similar to uploaded image${searchContext ? ` (${searchContext})` : ''}`
                else if (searchMode === 'similar') contextLabel = `similar to "${searchContext}"`
              }

              return (
                <>
                  {contextLabel && (
                    <p className="text-xs text-[var(--muted)] mb-3">
                      {visibleResults.length > 0
                        ? `${visibleResults.length} match${visibleResults.length === 1 ? '' : 'es'} ${contextLabel}`
                        : `No matches ${contextLabel} — you may need to embed more thumbnails first.`}
                      {hiddenCount > 0 && (
                        <span className="text-[var(--muted-2)]">
                          {' '}
                          · {hiddenCount} Short{hiddenCount === 1 ? '' : 's'} hidden by your preferences.
                        </span>
                      )}
                    </p>
                  )}
                  {visibleResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {visibleResults.map((r) => (
                        <ThumbnailSearchCard
                          key={r.youtube_video_id}
                          result={r}
                          onFindSimilar={runSimilarSearch}
                        />
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </section>
        </div>
      </TrackingLayout>
    </DashboardShell>
  )
}

function ThumbnailSearchCard({
  result,
  onFindSimilar,
}: {
  result: ThumbnailSearchResult
  onFindSimilar: (videoId: string, title: string | null) => void
}) {
  const href = youtubeWatchUrl(result.youtube_video_id)
  const similarityPct = Math.round(result.similarity * 100)

  return (
    <div className="group overflow-hidden rounded-lg bg-[var(--elevated)]/50 hover:bg-[var(--elevated)] ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-all">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="aspect-video bg-[var(--elevated)] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.thumbnail_url} alt="" className="w-full h-full object-cover" />
          <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {similarityPct}%
          </span>
          {result.outlier_score != null && (
            <div className="absolute top-1 right-1">
              <OutlierBadge score={result.outlier_score} size="sm" />
            </div>
          )}
          {result.source && result.source !== 'unknown' && (
            <span
              className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${
                result.source === 'own' ? 'bg-[var(--accent)]' : 'bg-zinc-700/90'
              }`}
            >
              {result.source === 'own' ? 'You' : 'Competitor'}
            </span>
          )}
        </div>
        <div className="p-3">
          <VideoSearchCardMeta result={result} />
        </div>
      </a>
      <div className="px-3 pb-3 -mt-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onFindSimilar(result.youtube_video_id, result.title ?? null)
          }}
          className="w-full text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)] rounded px-2 py-1 hover:bg-[var(--card)] ring-1 ring-transparent hover:ring-[var(--border)] transition-colors"
        >
          Find similar
        </button>
      </div>
    </div>
  )
}

function VideoSearchCardMeta({ result }: { result: ThumbnailSearchResult }) {
  if (!result.title) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {result.youtube_video_id}
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-[var(--foreground)] line-clamp-2">
        {result.title}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-[var(--muted-2)]">
        {result.view_count != null && <span>{formatCount(result.view_count)} views</span>}
        {result.is_short === true && <span>Short</span>}
      </div>
    </div>
  )
}
