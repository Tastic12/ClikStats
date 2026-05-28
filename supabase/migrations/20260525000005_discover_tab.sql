-- Discover tab (Tier A): daily YouTube trending videos indexed for browse +
-- thumbnail search. Global corpus; users filter by region + categories.

-- ----------------------------------------------------------------------------
-- Per-user discover preferences
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_discover_settings (
    user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    region_code   TEXT NOT NULL DEFAULT 'GB',
    category_ids  INTEGER[] NOT NULL DEFAULT ARRAY[20, 24, 25, 28, 17],
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_discover_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own discover settings" ON public.user_discover_settings;
CREATE POLICY "Users manage own discover settings"
    ON public.user_discover_settings FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Global trending / discovered videos (shared across all users)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discovered_videos (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id       TEXT NOT NULL,
    title          TEXT NOT NULL,
    thumbnail_url  TEXT NOT NULL,
    channel_id     TEXT,
    channel_name   TEXT,
    category_id    INTEGER NOT NULL,
    region_code    TEXT NOT NULL,
    published_at   TIMESTAMP WITH TIME ZONE,
    duration       TEXT,
    view_count     BIGINT DEFAULT 0,
    like_count     BIGINT DEFAULT 0,
    is_short       BOOLEAN GENERATED ALWAYS AS (public.is_short_duration(duration)) STORED,
    discovered_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (video_id, region_code, category_id)
);

CREATE INDEX IF NOT EXISTS idx_discovered_videos_region_category
    ON public.discovered_videos (region_code, category_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovered_videos_video_id
    ON public.discovered_videos (video_id);

ALTER TABLE public.discovered_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read discovered videos"
    ON public.discovered_videos;
CREATE POLICY "Authenticated users can read discovered videos"
    ON public.discovered_videos FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- Extend thumbnail search to surface discovered metadata
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_thumbnails(
    user_uuid       UUID,
    query_embedding TEXT,
    match_count     INTEGER DEFAULT 20
)
RETURNS TABLE (
    youtube_video_id TEXT,
    thumbnail_url    TEXT,
    similarity       FLOAT,
    title            TEXT,
    view_count       BIGINT,
    published_at     TIMESTAMP WITH TIME ZONE,
    outlier_score    NUMERIC,
    is_short         BOOLEAN,
    source           TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    qvec vector(512);
BEGIN
    qvec := query_embedding::vector(512);

    RETURN QUERY
    WITH nearest AS (
        SELECT
            te.youtube_video_id AS yt_id,
            te.thumbnail_url    AS thumb_url,
            (1 - (te.embedding <=> qvec))::FLOAT AS sim
        FROM public.thumbnail_embeddings te
        ORDER BY te.embedding <=> qvec
        LIMIT match_count
    ),
    own_meta AS (
        SELECT
            v.video_id      AS yt_id,
            v.title         AS t,
            v.view_count    AS vc,
            v.published_at  AS pa,
            v.outlier_score AS os,
            v.is_short      AS sh,
            'own'::TEXT     AS src
        FROM public.videos v
        WHERE v.user_id = user_uuid
          AND v.video_id IN (SELECT n.yt_id FROM nearest n)
    ),
    competitor_meta AS (
        SELECT DISTINCT ON (ccv.video_id)
            ccv.video_id       AS yt_id,
            ccv.title          AS t,
            ccv.view_count     AS vc,
            ccv.published_at   AS pa,
            ccv.outlier_score  AS os,
            ccv.is_short       AS sh,
            'competitor'::TEXT AS src
        FROM public.competitor_channel_videos ccv
        WHERE ccv.user_id = user_uuid
          AND ccv.video_id IN (SELECT n.yt_id FROM nearest n)
        ORDER BY ccv.video_id, ccv.created_at DESC
    ),
    discovered_meta AS (
        SELECT DISTINCT ON (dv.video_id)
            dv.video_id        AS yt_id,
            dv.title           AS t,
            dv.view_count      AS vc,
            dv.published_at    AS pa,
            NULL::NUMERIC      AS os,
            dv.is_short        AS sh,
            'discovered'::TEXT AS src
        FROM public.discovered_videos dv
        WHERE dv.video_id IN (SELECT n.yt_id FROM nearest n)
        ORDER BY dv.video_id, dv.last_seen_at DESC
    )
    SELECT
        n.yt_id                                     AS youtube_video_id,
        n.thumb_url                                 AS thumbnail_url,
        n.sim                                       AS similarity,
        COALESCE(om.t, cm.t, dm.t)                  AS title,
        COALESCE(om.vc, cm.vc, dm.vc)               AS view_count,
        COALESCE(om.pa, cm.pa, dm.pa)                AS published_at,
        COALESCE(om.os, cm.os, dm.os)               AS outlier_score,
        COALESCE(om.sh, cm.sh, dm.sh)               AS is_short,
        COALESCE(om.src, cm.src, dm.src, 'unknown'::TEXT) AS source
    FROM nearest n
    LEFT JOIN own_meta om        ON om.yt_id = n.yt_id
    LEFT JOIN competitor_meta cm ON cm.yt_id = n.yt_id
    LEFT JOIN discovered_meta dm ON dm.yt_id = n.yt_id
    ORDER BY n.sim DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- Include discovered thumbnails in the embed queue (after user-tracked ones)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings(
    user_uuid UUID,
    batch_size INTEGER DEFAULT 25
)
RETURNS TABLE (
    youtube_video_id TEXT,
    thumbnail_url    TEXT
)
LANGUAGE sql
STABLE
AS $$
    WITH user_thumbs AS (
        SELECT v.video_id AS yt_id, v.thumbnail_url AS thumb_url, 1 AS pri
          FROM public.videos v
         WHERE v.user_id = user_uuid AND v.thumbnail_url IS NOT NULL
        UNION ALL
        SELECT ccv.video_id AS yt_id, ccv.thumbnail_url AS thumb_url, 1 AS pri
          FROM public.competitor_channel_videos ccv
         WHERE ccv.user_id = user_uuid AND ccv.thumbnail_url IS NOT NULL
        UNION ALL
        SELECT dv.video_id AS yt_id, dv.thumbnail_url AS thumb_url, 2 AS pri
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
    ),
    deduped AS (
        SELECT DISTINCT ON (ut.yt_id) ut.yt_id, ut.thumb_url, ut.pri
          FROM user_thumbs ut
         ORDER BY ut.yt_id, ut.pri
    )
    SELECT d.yt_id   AS youtube_video_id,
           d.thumb_url AS thumbnail_url
      FROM deduped d
      LEFT JOIN public.thumbnail_embeddings te
             ON te.youtube_video_id = d.yt_id
     WHERE te.id IS NULL
     ORDER BY d.pri, d.yt_id
     LIMIT batch_size;
$$;

CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
      FROM (
        SELECT v.video_id AS yt_id
          FROM public.videos v
         WHERE v.user_id = user_uuid AND v.thumbnail_url IS NOT NULL
        UNION
        SELECT ccv.video_id AS yt_id
          FROM public.competitor_channel_videos ccv
         WHERE ccv.user_id = user_uuid AND ccv.thumbnail_url IS NOT NULL
        UNION
        SELECT dv.video_id AS yt_id
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
      ) all_thumbs
      LEFT JOIN public.thumbnail_embeddings te
             ON te.youtube_video_id = all_thumbs.yt_id
     WHERE te.id IS NULL;
$$;
