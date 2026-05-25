-- Outlier scoring for the user's own videos.
-- Score = video.view_count / median(view_count of recent uploads of the same kind on the same channel)
-- Shorts and long-form get separate baselines so a viral short doesn't drown long-form scores.

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- True when the ISO 8601 duration string represents a video < 60 seconds (Short).
-- Conservatively returns FALSE when duration is unknown or anything besides
-- a plain "PT..S" / "PT..M..S" pattern.
CREATE OR REPLACE FUNCTION public.is_short_duration(duration_iso TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    total_seconds INTEGER := 0;
    minutes_part  INTEGER;
    seconds_part  INTEGER;
    hours_part    INTEGER;
BEGIN
    IF duration_iso IS NULL OR duration_iso = '' THEN
        RETURN FALSE;
    END IF;

    -- Anything with hours is definitely not a Short.
    hours_part := NULLIF(substring(duration_iso FROM 'PT(\d+)H'), '')::INTEGER;
    IF hours_part IS NOT NULL AND hours_part > 0 THEN
        RETURN FALSE;
    END IF;

    minutes_part := COALESCE(NULLIF(substring(duration_iso FROM '(\d+)M'), '')::INTEGER, 0);
    seconds_part := COALESCE(NULLIF(substring(duration_iso FROM '(\d+)S'), '')::INTEGER, 0);
    total_seconds := minutes_part * 60 + seconds_part;

    RETURN total_seconds > 0 AND total_seconds < 60;
END;
$$;

-- ----------------------------------------------------------------------------
-- videos: add outlier_score + is_short
-- ----------------------------------------------------------------------------

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS outlier_score NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN
        GENERATED ALWAYS AS (public.is_short_duration(duration)) STORED;

CREATE INDEX IF NOT EXISTS idx_videos_channel_outlier_score
    ON public.videos (channel_id, outlier_score DESC NULLS LAST);

-- Same shape on competitor_channel_videos so a later slice can score competitor
-- top-5 videos with the same function. We don't store duration there yet, so
-- is_short defaults to NULL (treated as long-form by the recompute function).
ALTER TABLE public.competitor_channel_videos
    ADD COLUMN IF NOT EXISTS outlier_score NUMERIC(10, 2);

-- ----------------------------------------------------------------------------
-- Baseline + recompute
-- ----------------------------------------------------------------------------

-- Returns the median view_count of the last N videos on a channel for a given
-- kind (TRUE = shorts, FALSE = long-form). Returns NULL when fewer than 5
-- qualifying videos exist (not enough data to score meaningfully).
CREATE OR REPLACE FUNCTION public.channel_baseline_views(
    channel_uuid UUID,
    want_short   BOOLEAN,
    window_size  INTEGER DEFAULT 30,
    min_sample   INTEGER DEFAULT 5
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
      FROM (
        SELECT 1
          FROM public.videos
         WHERE channel_id = channel_uuid
           AND COALESCE(is_short, FALSE) = want_short
         ORDER BY published_at DESC
         LIMIT window_size
      ) s;

    IF sample_count < min_sample THEN
        RETURN NULL;
    END IF;

    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count)
      INTO baseline
      FROM (
        SELECT view_count
          FROM public.videos
         WHERE channel_id = channel_uuid
           AND COALESCE(is_short, FALSE) = want_short
         ORDER BY published_at DESC
         LIMIT window_size
      ) recent;

    -- Floor baseline at 100 so brand-new channels don't get absurd ratios.
    RETURN GREATEST(baseline, 100);
END;
$$;

-- Recompute outlier_score for every video on a channel. Idempotent.
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
        END
     WHERE v.channel_id = channel_uuid;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

-- Allow the authenticated role to call recompute via PostgREST (handy for the
-- "Sync all from YouTube" flow which runs as the user).
GRANT EXECUTE ON FUNCTION public.recompute_outlier_scores(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.channel_baseline_views(UUID, BOOLEAN, INTEGER, INTEGER)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_short_duration(TEXT) TO authenticated, service_role;
