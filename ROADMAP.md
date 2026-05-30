# ClikStats Roadmap

**Last reviewed:** 2026-05-29

> New chat: *"Read `ROADMAP.md` and let's work on [item]."*

---

## Done recently

- [x] **Product phases 1–3 (2026-05-29)** — left sidebar nav, channel in header + change channel, dashboard columns + performing-now widget, unified outliers feed, competitors-first layout, plan scaffolding (no billing)
- [x] **Customer feedback batch (2026-05-28)** — move channels/videos to categories, Shorts v2 logic, thumbnail index dashboard, image search fixes, duplicate-add messaging, competitor list-first view, comparison tables instead of bar charts
- [x] Discover tab (Tier A) — trending browse + thumbnail search integration
- [x] **Portrait thumbnail Short detection** — now combined with duration (3 min cap) in migration `20260528000001`
- [x] **Bulk competitor import** — paste up to 50 URLs on Competitor channels page
- [x] **Time-aware outliers** — `outlier_velocity_score` (views/day vs channel norm)
- [x] **Niche-aware outliers** — `niche_outlier_score` vs tracked competitors (+ optional category)
- [x] **Admin area** — `/admin` YouTube API quota dashboard (requires `ADMIN_EMAILS` env)
- [x] Rate limiting (Upstash), mobile UX pass 1, daily metrics cron, thumbnail search suite

---

## Setup still required (one-time)

### Migration `20260529000001_product_phases.sql`
Adds `users.plan` (free/pro scaffold), standalone competitor video outlier scores. Run in Supabase SQL Editor.

### Migration `20260528000001_customer_feedback_fixes.sql`
Run in Supabase SQL Editor after deploy. Updates:
- `classify_as_short` — portrait + duration rules (vertical long-form ≥3 min stays visible)
- `thumbnail_index_stats` RPC — index counts by source on Thumbnail search page
- Embed queue priority — competitors → trending → own uploads

Then re-sync if Hide Shorts still looks wrong:
1. **Discover → Refresh trending**
2. **My videos → Sync all from YouTube**
3. **Competitors → Refresh all**

### Migration `20260525000006_thumbnail_shorts_and_outliers.sql`
(If not already run.) See prior notes in git history.

### Admin access
Set `ADMIN_EMAILS=your@email.com` in `.env.local` and Vercel, redeploy. Visit `/admin`.

### Plan / paywall scaffold (billing not wired)
- `users.plan` = `free` (default) or `pro` (set manually in Supabase for now)
- `lib/plans.ts` — feature gates; beta default unlocks everything unless:
  - Client: `NEXT_PUBLIC_UNLOCK_ALL_FEATURES=false`
  - Server: `UNLOCK_ALL_FEATURES=false`
- When locked down, **change connected channel** requires Pro

### Optional: Discover nightly cron
Deploy `discover-trending-cron` edge function + cron at `0 4 * * *`.

---

## Not doing (user decision)

- [ ] **In-app / browser notifications** — explicitly declined for now
- [ ] **Discover Tier B (search-based)** — stay on roadmap only; build when Trending isn’t enough (see below)

---

## Backlog

### Discover Tier B — search-based (future only)
**Layman’s version:** Tier A = YouTube’s official Trending chart. Tier B = Google a specific phrase (“iPhone review”, “Scottish football”) and index whatever ranks top — for sub-niches Trending misses. Costs **100 API units per search** vs **1** for Trending. **Do not build until needed.**

### Mobile UX pass — round 2
User tested on phone; fixes deferred until they note specific issues.

### Full YouTube crawl (Tier C)
Not planned — too expensive. Tier A is the ceiling for us.

---

## Recently shipped (reference)

Outliers, Hide Shorts, auto-indexing, image/similar thumbnail search, competitor refresh, category move dropdowns, etc.
