# ClikStats Roadmap

**Last reviewed:** 2026-05-25

> New chat: *"Read `ROADMAP.md` and let's work on [item]."*

---

## Done recently

- [x] Discover tab (Tier A) — trending browse + thumbnail search integration
- [x] **Portrait thumbnail Short detection** — 9:16 vs 16:9 from YouTube API dimensions (duration fallback)
- [x] **Bulk competitor import** — paste up to 50 URLs on Competitor channels page
- [x] **Time-aware outliers** — `outlier_velocity_score` (views/day vs channel norm)
- [x] **Niche-aware outliers** — `niche_outlier_score` vs tracked competitors (+ optional category)
- [x] **Admin area** — `/admin` YouTube API quota dashboard (requires `ADMIN_EMAILS` env)
- [x] Rate limiting (Upstash), mobile UX pass 1, daily metrics cron, thumbnail search suite

---

## Setup still required (one-time)

### Migration `20260525000006_thumbnail_shorts_and_outliers.sql`
Run in Supabase SQL Editor after deploy. Then:
1. **Discover → Refresh trending** again (stores thumbnail width/height)
2. **My videos → Sync all from YouTube** (re-classifies your library)
3. **Competitors → Refresh all** (re-classifies competitor videos)

### Admin access
Set `ADMIN_EMAILS=your@email.com` in `.env.local` and Vercel, redeploy. Visit `/admin`.

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

Outliers, Hide Shorts, auto-indexing, image/similar thumbnail search, competitor refresh, etc.
