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

### [x] Daily metrics cron schedule (Supabase Studio setup)
- User confirmed SQL/cron succeeded (2026-05-25).
- Nightly `update-metrics-cron` keeps channel/video stats + outlier scores fresh.

### [x] Rate limiting (Upstash)
- Code shipped + env vars set locally and on Vercel Production.

### [ ] Discover nightly cron (optional second job)
- Deploy `discover-trending-cron` edge function (code in repo).
- Create cron job (e.g. `0 4 * * *` daily, 4am UTC) → same pattern as metrics cron.
- Fetches GB trending for Gaming, Entertainment, News, Tech, Sports, Music, How-to (~7 API units/day).
- **Manual alternative:** users click **Refresh trending now** on Discover tab.

---

## Up next — medium value (user confirmed interest)

### [ ] Bulk competitor import
- Paste many `@handles` or channel URLs at once; progress bar + per-row errors.
- **Why:** building a niche watchlist one-by-one is slow.
- **Effort:** ~1 hour.

### [ ] In-app / browser outlier notifications
- **Not email** — use **browser push notifications** (Web Notifications API) when the
  tab/site is allowed, plus an **in-app notification centre** (bell icon, unread list).
- Works on mobile **browser** too (user adds site to home screen / allows notifications).
- Alert when: your video or a tracked competitor crosses an outlier threshold (e.g. first time ≥3× or ≥5×).
- Prefer **weekly digest** or batched alerts over constant pings.
- Needs: notification preferences, stored events table, optional service worker for push.
- **Effort:** ~3 hours.

### [ ] Time-aware outlier scoring
- Adjust scores for **video age** — a 3× on a 2-day-old upload beats 3× on a 6-month-old video.
- Optional **velocity** sub-score (views/day vs channel norm).
- **Effort:** ~2 hours + tuning.

### [ ] Niche-aware outlier scoring
- Compare performance to **peers in the same competitor category** (news, gaming, etc.), not only the channel's own median.
- Example: "4× vs your channel" but also "top 10% vs other channels in your News category."
- Uses existing **competitor channel groups** as niches.
- **Effort:** ~2–3 hours.

### [ ] Native mobile UX pass — round 2
- User tested on phone; fixes deferred to a later session.
- Real-device issues → add as bullet items here when ready.

---

## Backlog — lower priority

### [ ] API quota usage dashboard (**admin-only**)
- Only visible to admin user(s) — requires a small **admin area** of the site
  (see below), not public.
- Shows estimated YouTube API units used today / remaining.
- **Effort:** ~1 hour (+ admin gate ~1 hour if not built yet).

### [ ] Admin area (foundation for quota dashboard + future tools)
- Restrict pages/routes to allowlisted emails (env var `ADMIN_EMAILS`).
- Home for quota dashboard, manual cron triggers, user stats later.
- **Trigger:** before quota dashboard or multi-user ops.

### [ ] "Discover" tab — Tier B (search-based) — see explanation below
- Only if Tier A trending doesn't cover a sub-niche well enough.
- **Effort:** ~2 hours. **Cost:** ~100 YouTube units per search query/day.

### [ ] Discover Tier B explanation (for future reference)
- **Tier A (shipped):** "What's on YouTube's official **Trending** chart today?" — same list everyone sees on YouTube Trending, filtered by category.
- **Tier B (not built):** "Find me the **top videos about a topic** even if they're not on Trending." Example: search YouTube for `"iPhone 16 review"` and index the top 20 results. Useful for **specific sub-niches** Trending misses (e.g. "Scottish football highlights"). Costs more API quota because `search.list` = 100 units per query.

---

## Not planned (with reasoning)

### Full continuous YouTube crawl (Tier C)
- viewstats Pro moat; not feasible for us. Tier A is the right balance.

---

## Recently shipped (last 30 days)

- [x] **Discover tab (Tier A)** — trending browse, user region/category prefs, manual sync, search integration (`source = discovered`)
- [x] Rate limiting (Upstash) — production + local
- [x] Mobile UX pass round 1
- [x] Outlier scoring (personal + competitor)
- [x] Thumbnail search (text, image upload, find similar)
- [x] Auto-indexing banner
- [x] Hide Shorts preference
- [x] Refresh all competitors
- [x] Daily metrics cron (user confirmed)

---

## One-time setup after Discover deploy

1. **Run migration** `20260525000005_discover_tab.sql` in Supabase SQL Editor (if not via CLI).
2. **Deploy** edge function `discover-trending-cron` (Supabase → Edge Functions → paste from repo).
3. **Optional cron** for nightly trending fetch (see "Discover nightly cron" above).
4. On site: open **Discover → Refresh trending now** once to populate data.
5. Auto-index banner will embed new thumbnails for search (may take a few minutes).
