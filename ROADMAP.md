# ClikStats Roadmap

Living list of everything we've discussed but haven't shipped, plus context on
things we've explicitly chosen *not* to build. Tick a box (`[x]`) when something
ships. Add new items at the bottom of the relevant section.

> **How to use this in a new Cursor chat:** open the chat and say
> *"Read `ROADMAP.md` and let's work on [item name]."* The agent will pick up
> the context from this file plus any related code.

**Last reviewed:** 2026-05-25

---

## Up next — high value

### [ ] Daily metrics cron schedule (Supabase Studio setup)
- Enable `pg_cron` and `pg_net` extensions in Database → Extensions
- Create cron job pointing at the `update-metrics-cron` edge function
  - Schedule: `0 3 * * *` (daily, 3am UTC)
  - Method: POST
  - URL: `https://<project-ref>.supabase.co/functions/v1/update-metrics-cron`
  - Auth header: `Bearer <service_role_key>`
- **Why:** keeps videos, channels, and outlier scores fresh nightly with zero
  manual clicks. ~3-5 YouTube API units/day cost.
- **Effort:** ~5 min, one-time setup

### [ ] Rate limiting on YouTube-API endpoints
- Add `@upstash/ratelimit` keyed on `auth.uid()`
- Apply to:
  - `/api/channels/sync-videos` → 5/min, 30/day per user
  - `/api/competitors/channels/refresh` → 3/min, 20/day per user
  - `/api/competitors/channels/init` → 10/min, 50/day per user
- Return `429 Too Many Requests` with a friendly retry-after message
- **Why:** without this, one bad actor can burn the entire 10K daily YouTube
  quota in ~3 minutes, taking the app offline for everyone until midnight PT.
- **Effort:** ~30 min. Upstash free tier covers our volume at $0/mo.
- **Trigger:** must do before letting anyone else onto the site.

---

## Up next — medium value

### [ ] Native mobile UX pass
- Hamburger menu for `DashboardShell` nav below 768px width
- Replace hover-reveal patterns (Watch on YouTube ↗, Find similar text buttons)
  with always-visible variants
- Increase all tap targets to ≥44pt per Apple HIG
- Single-column stacks below 640px for the stat-card rows and competitor
  compare view
- Audit and fix any horizontally-overflowing tables
- Optional: bottom navigation bar for the 3-4 primary actions
- Test on real iPhone + Android, not just resized browser
- **Why:** YouTubers will glance at this from their phone first. Currently
  works but feels cramped.
- **Effort:** ~3 hours

### [ ] "Discover" tab — Tier A (Trending in your niche)
- Daily background job pulls YouTube's trending videos for 3-5 categories
  the user selects (gaming, music, news, sports, tech, etc.)
- Embeds thumbnails into the existing `thumbnail_embeddings` table with
  `source = 'discovered'`
- New Discover tab surfaces these in the dashboard, separately from tracked
  content
- Thumbnail search starts returning these as well, broadening the corpus
- **Why:** turns thumbnail search from "search across people I track" into
  "search across what's currently working on YouTube," without needing the
  user to manually add every competitor.
- **Cost:** ~75 YouTube API units/day for all categories worldwide. Cheap.
- **Effort:** ~3 hours

---

## Backlog — low priority or exploratory

### [ ] API quota usage dashboard
- Small panel showing today's YouTube API unit consumption + remaining
- Useful once we have multiple users
- **Effort:** ~1 hour

### [ ] Bulk competitor import
- Paste a list of `@handles` or YouTube URLs, we add them all in one go
- Surface progress + any failures inline
- **Effort:** ~1 hour

### [ ] Outlier notifications (email or in-app)
- When a tracked video crosses a threshold (e.g. first time hitting 5×) for
  the first time, optionally notify
- Probably weekly digest is more useful than instant
- **Effort:** ~3 hours

### [ ] Time-aware outlier scoring
- Currently the score compares a video to the channel's recent median
- Could also adjust for video age (newer videos with high scores are more
  impressive than 6-month-old ones with the same score)
- Could add a velocity-based "trending now" sub-score
- **Effort:** ~2 hours, plus some research on what's actually useful

### [ ] "Discover" tab — Tier B (Search-based)
- Define niches, periodically run `search.list` for top performers
- More flexible than Tier A, but **100 YouTube units per search call** vs
  1 unit for trending
- Worth building only if Tier A's coverage isn't enough
- **Effort:** ~2 hours

### [ ] Niche-aware outlier scoring
- Right now we compare each channel to itself. Could also compare to peers in
  the same niche/category for a "relative-to-niche" score
- Requires we know channel niches (would need category enrichment)

---

## Not planned (with reasoning)

### Full continuous YouTube crawl (Tier C of Discovery)
- This is viewstats Pro's actual moat — indexing millions of channels they
  don't know you care about
- **Why we won't:** requires hundreds of millions of YouTube API units/day,
  YouTube Partner Program status (or many keys), terabytes of vector storage,
  and ~$1,000+/mo in dedicated worker compute
- Documented here so we don't reconsider without a strong reason. Tier A
  delivers most of the value at <1% of the cost.

---

## Recently shipped (last 30 days)

- [x] Outlier scoring for personal channel videos
- [x] Outlier scoring for competitor channel videos
- [x] Dedicated `/tracking/outliers` page with filters and recompute
- [x] "Top 5 by views" + "Top 5 outliers" side-by-side on competitor detail
- [x] Outlier badges on every video card across the app
- [x] Global "Hide Shorts" preference in profile menu
- [x] Refresh all competitors button + per-channel refresh
- [x] Thumbnail text search (CLIP-based)
- [x] Per-thumbnail "Embed pending" indexing flow
- [x] Background auto-indexing (no more manual button — `ThumbnailIndexBanner`)
- [x] Image upload search (`/api/thumbnails/search-image`)
- [x] Find similar to a video (`/api/thumbnails/search-similar`)
- [x] Find similar action on outlier cards (deep-links to thumbnails page)
- [x] Auto-recompute outlier scores after sync + after daily cron
