-- Thumbnail aspect-ratio Short detection + time/niche outlier scores + API usage log

-- ----------------------------------------------------------------------------
-- Short detection: portrait thumbnail (9:16) OR duration < 60s as fallback
-- ----------------------------------------------------------------------------

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
    ratio NUMERIC;
BEGIN
    IF thumb_w IS NOT NULL AND thumb_h IS NOT NULL AND thumb_w > 0 AND thumb_h > 0 THEN
        ratio := thumb_h::NUMERIC / thumb_w::NUMERIC;
        -- Portrait / Shorts-style thumbnail (typically 9:16 ≈ 1.78)
        IF ratio > 1.15 THEN
            RETURN TRUE;
        END IF;
        -- Landscape 16:9 or wider — treat as long-form
        IF ratio <= 1.05 THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN public.is_short_duration(duration_iso);
END;
$$;

GRANT EXECUTE ON FUNCTION public.classify_as_short(TEXT, INTEGER, INTEGER)
    TO authenticated, service_role;

-- videos
ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS thumbnail_width  INTEGER,
    ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

ALTER TABLE public.videos DROP COLUMN IF EXISTS is_short;

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN
        GENERATED ALWAYS AS (
            public.classify_as_short(duration, thumbnail_width, thumbnail_height)
        ) STORED;

-- competitor_channel_videos
ALTER TABLE public.competitor_channel_videos
    ADD COLUMN IF NOT EXISTS thumbnail_width  INTEGER,
    ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

ALTER TABLE public.competitor_channel_videos DROP COLUMN IF EXISTS is_short;

ALTER TABLE public.competitor_channel_videos
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN
        GENERATED ALWAYS AS (
            public.classify_as_short(duration, thumbnail_width, thumbnail_height)
        ) STORED;

-- discovered_videos
ALTER TABLE public.discovered_videos
    ADD COLUMN IF NOT EXISTS thumbnail_width  INTEGER,
    ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

ALTER TABLE public.discovered_videos DROP COLUMN IF EXISTS is_short;

ALTER TABLE public.discovered_videos
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN
        GENERATED ALWAYS AS (
            public.classify_as_short(duration, thumbnail_width, thumbnail_height)
        ) STORED;

-- ----------------------------------------------------------------------------
-- Time-aware outlier: views per day vs channel baseline daily rate
-- ----------------------------------------------------------------------------

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS outlier_velocity_score NUMERIC(10, 2);

CREATE OR REPLACE FUNCTION public.recompute_outlier_scores(channel_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    long_baseline  NUMERIC;
    short_baseline NUMERIC;
    rows_updated   INTEGER;
BEGIN
    long_baseline  := public.channel_baseline_views(channel_uuid, FALSE);
    short_baseline := public.channel_baseline_views(channel_uuid, TRUE);

    UPDATE public.videos v
       SET outlier_score = CASE
            WHEN COALESCE(v.is_short, FALSE) THEN
                CASE WHEN short_baseline IS NULL OR short_baseline = 0
                     THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / short_baseline, 2)
                END
            ELSE
                CASE WHEN long_baseline IS NULL OR long_baseline = 0
                     THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / long_baseline, 2)
                END
        END,
        outlier_velocity_score = CASE
            WHEN v.published_at IS NULL THEN NULL
            WHEN COALESCE(v.is_short, FALSE) THEN
                CASE WHEN short_baseline IS NULL OR short_baseline = 0 THEN NULL
                     ELSE ROUND(
                        (v.view_count::NUMERIC / GREATEST(
                            EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v.published_at)) / 86400.0,
                            1.0
                        )) / GREATEST(short_baseline / 30.0, 1.0),
                        2
                     )
                END
            ELSE
                CASE WHEN long_baseline IS NULL OR long_baseline = 0 THEN NULL
                     ELSE ROUND(
                        (v.view_count::NUMERIC / GREATEST(
                            EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v.published_at)) / 86400.0,
                            1.0
                        )) / GREATEST(long_baseline / 30.0, 1.0),
                        2
                     )
                END
        END
     WHERE v.channel_id = channel_uuid;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

-- ----------------------------------------------------------------------------
-- Niche-aware outlier: compare to median of tracked competitors (optionally one group)
-- ----------------------------------------------------------------------------

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS niche_outlier_score NUMERIC(10, 2);

ALTER TABLE public.competitor_channel_videos
    ADD COLUMN IF NOT EXISTS niche_outlier_score NUMERIC(10, 2);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS niche_group_id UUID
        REFERENCES public.competitor_channel_groups(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.niche_baseline_views(
    user_uuid   UUID,
    want_short  BOOLEAN,
    group_uuid  UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    baseline NUMERIC;
    sample_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO sample_count
      FROM public.competitor_channel_videos ccv
      JOIN public.competitor_channels cc ON cc.id = ccv.competitor_channel_id
     WHERE ccv.user_id = user_uuid
       AND COALESCE(ccv.is_short, FALSE) = want_short
       AND ccv.view_count IS NOT NULL
       AND (group_uuid IS NULL OR cc.group_id = group_uuid);

    IF sample_count < 5 THEN
        RETURN NULL;
    END IF;

    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ccv.view_count)
      INTO baseline
      FROM public.competitor_channel_videos ccv
      JOIN public.competitor_channels cc ON cc.id = ccv.competitor_channel_id
     WHERE ccv.user_id = user_uuid
       AND COALESCE(ccv.is_short, FALSE) = want_short
       AND ccv.view_count IS NOT NULL
       AND (group_uuid IS NULL OR cc.group_id = group_uuid);

    RETURN GREATEST(baseline, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_niche_outlier_scores(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    group_uuid     UUID;
    long_baseline  NUMERIC;
    short_baseline NUMERIC;
    rows_updated   INTEGER := 0;
    n              INTEGER;
BEGIN
    SELECT niche_group_id INTO group_uuid
      FROM public.users
     WHERE id = user_uuid;

    long_baseline  := public.niche_baseline_views(user_uuid, FALSE, group_uuid);
    short_baseline := public.niche_baseline_views(user_uuid, TRUE, group_uuid);

    UPDATE public.videos v
       SET niche_outlier_score = CASE
            WHEN COALESCE(v.is_short, FALSE) THEN
                CASE WHEN short_baseline IS NULL THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / short_baseline, 2)
                END
            ELSE
                CASE WHEN long_baseline IS NULL THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / long_baseline, 2)
                END
        END
     WHERE v.user_id = user_uuid;

    GET DIAGNOSTICS n = ROW_COUNT;
    rows_updated := rows_updated + n;

    UPDATE public.competitor_channel_videos ccv
       SET niche_outlier_score = CASE
            WHEN COALESCE(ccv.is_short, FALSE) THEN
                CASE WHEN short_baseline IS NULL THEN NULL
                     ELSE ROUND(ccv.view_count::NUMERIC / short_baseline, 2)
                END
            ELSE
                CASE WHEN long_baseline IS NULL THEN NULL
                     ELSE ROUND(ccv.view_count::NUMERIC / long_baseline, 2)
                END
        END
     WHERE ccv.user_id = user_uuid;

    GET DIAGNOSTICS n = ROW_COUNT;
    rows_updated := rows_updated + n;

    RETURN rows_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.niche_baseline_views(UUID, BOOLEAN, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_niche_outlier_scores(UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- YouTube API usage log (admin dashboard)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.youtube_api_usage (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint   TEXT NOT NULL,
    units      INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_created
    ON public.youtube_api_usage (created_at DESC);

ALTER TABLE public.youtube_api_usage ENABLE ROW LEVEL SECURITY;

-- No public read; admin routes use service role.

CREATE OR REPLACE FUNCTION public.youtube_api_usage_summary(since_ts TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
    total_units BIGINT,
    call_count  BIGINT,
    by_endpoint JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered AS (
        SELECT *
          FROM public.youtube_api_usage
         WHERE since_ts IS NULL OR created_at >= since_ts
    ),
    by_ep AS (
        SELECT endpoint, SUM(units)::BIGINT AS endpoint_units
          FROM filtered
         GROUP BY endpoint
    )
    SELECT
        (SELECT COALESCE(SUM(units), 0) FROM filtered)::BIGINT AS total_units,
        (SELECT COUNT(*) FROM filtered)::BIGINT AS call_count,
        (SELECT COALESCE(jsonb_object_agg(endpoint, endpoint_units), '{}'::jsonb) FROM by_ep) AS by_endpoint;
$$;

GRANT EXECUTE ON FUNCTION public.youtube_api_usage_summary(TIMESTAMPTZ) TO service_role;
