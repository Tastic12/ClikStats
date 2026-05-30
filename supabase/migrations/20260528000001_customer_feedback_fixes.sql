-- Customer feedback batch: Shorts v2, thumbnail index stats, embed queue priority

-- ----------------------------------------------------------------------------
-- Duration helper + Shorts v2 (portrait + duration combined, 3 min cap)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.duration_seconds(duration_iso TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    minutes_part INTEGER;
    seconds_part INTEGER;
    hours_part   INTEGER;
BEGIN
    IF duration_iso IS NULL OR duration_iso = '' THEN
        RETURN NULL;
    END IF;

    hours_part := NULLIF(substring(duration_iso FROM 'PT(\d+)H'), '')::INTEGER;
    IF hours_part IS NOT NULL AND hours_part > 0 THEN
        RETURN hours_part * 3600
             + COALESCE(NULLIF(substring(duration_iso FROM '(\d+)M'), '')::INTEGER, 0) * 60
             + COALESCE(NULLIF(substring(duration_iso FROM '(\d+)S'), '')::INTEGER, 0);
    END IF;

    minutes_part := COALESCE(NULLIF(substring(duration_iso FROM '(\d+)M'), '')::INTEGER, 0);
    seconds_part := COALESCE(NULLIF(substring(duration_iso FROM '(\d+)S'), '')::INTEGER, 0);
    RETURN minutes_part * 60 + seconds_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_short_duration(duration_iso TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    dur INTEGER;
BEGIN
    dur := public.duration_seconds(duration_iso);
    RETURN dur IS NOT NULL AND dur > 0 AND dur < 180;
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_as_short(
    duration_iso TEXT,
    thumb_w      INTEGER,
    thumb_h      INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    dur    INTEGER;
    ratio  NUMERIC;
BEGIN
    dur := public.duration_seconds(duration_iso);

    IF thumb_w IS NOT NULL AND thumb_h IS NOT NULL AND thumb_w > 0 AND thumb_h > 0 THEN
        ratio := thumb_h::NUMERIC / thumb_w::NUMERIC;

        -- Portrait thumbnail (typical Shorts 9:16)
        IF ratio > 1.15 THEN
            -- Vertical long-form: keep visible when duration >= 3 minutes
            IF dur IS NOT NULL AND dur >= 180 THEN
                RETURN FALSE;
            END IF;
            RETURN TRUE;
        END IF;

        -- Landscape / wide — long-form unless duration says Short
        IF ratio <= 1.05 THEN
            IF dur IS NOT NULL AND dur > 0 AND dur < 180 THEN
                RETURN TRUE;
            END IF;
            RETURN FALSE;
        END IF;
    END IF;

    -- Unknown or ambiguous thumbnail shape — duration only
    RETURN dur IS NOT NULL AND dur > 0 AND dur < 180;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duration_seconds(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_short_duration(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.classify_as_short(TEXT, INTEGER, INTEGER)
    TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Thumbnail index stats by source (own / competitor / discovered)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.thumbnail_index_stats(user_uuid UUID)
RETURNS TABLE (
    source   TEXT,
    total    BIGINT,
    indexed  BIGINT,
    pending  BIGINT
)
LANGUAGE sql
STABLE
AS $$
    WITH own_thumbs AS (
        SELECT v.video_id AS yt_id
          FROM public.videos v
         WHERE v.user_id = user_uuid AND v.thumbnail_url IS NOT NULL
    ),
    competitor_thumbs AS (
        SELECT ccv.video_id AS yt_id
          FROM public.competitor_channel_videos ccv
         WHERE ccv.user_id = user_uuid AND ccv.thumbnail_url IS NOT NULL
    ),
    discovered_thumbs AS (
        SELECT dv.video_id AS yt_id
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
    ),
    buckets AS (
        SELECT 'own'::TEXT AS src, yt_id FROM own_thumbs
        UNION ALL
        SELECT 'competitor'::TEXT, yt_id FROM competitor_thumbs
        UNION ALL
        SELECT 'discovered'::TEXT, yt_id FROM discovered_thumbs
    ),
    deduped AS (
        SELECT DISTINCT src, yt_id FROM buckets
    )
    SELECT
        d.src AS source,
        COUNT(*)::BIGINT AS total,
        COUNT(te.id)::BIGINT AS indexed,
        (COUNT(*) - COUNT(te.id))::BIGINT AS pending
    FROM deduped d
    LEFT JOIN public.thumbnail_embeddings te ON te.youtube_video_id = d.yt_id
    GROUP BY d.src
    ORDER BY CASE d.src WHEN 'competitor' THEN 1 WHEN 'discovered' THEN 2 ELSE 3 END;
$$;

GRANT EXECUTE ON FUNCTION public.thumbnail_index_stats(UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Embed queue: competitors first, then trending, then own uploads
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
        SELECT ccv.video_id AS yt_id, ccv.thumbnail_url AS thumb_url, 1 AS pri
          FROM public.competitor_channel_videos ccv
         WHERE ccv.user_id = user_uuid AND ccv.thumbnail_url IS NOT NULL
        UNION ALL
        SELECT dv.video_id AS yt_id, dv.thumbnail_url AS thumb_url, 2 AS pri
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
        UNION ALL
        SELECT v.video_id AS yt_id, v.thumbnail_url AS thumb_url, 3 AS pri
          FROM public.videos v
         WHERE v.user_id = user_uuid AND v.thumbnail_url IS NOT NULL
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

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings(UUID, INTEGER)
    TO authenticated, service_role;
