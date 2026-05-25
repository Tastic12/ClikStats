-- Competitor outlier scoring.
-- Mirrors the videos-table approach: stores duration, derives is_short, and
-- computes outlier_score = views / median(recent uploads of the same kind on
-- the same competitor channel). Reuses the public.is_short_duration helper
-- from the previous migration.

-- ----------------------------------------------------------------------------
-- competitor_channel_videos: add duration + is_short
-- ----------------------------------------------------------------------------

ALTER TABLE public.competitor_channel_videos
    ADD COLUMN IF NOT EXISTS duration TEXT,
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN
        GENERATED ALWAYS AS (public.is_short_duration(duration)) STORED;

CREATE INDEX IF NOT EXISTS idx_competitor_channel_videos_channel_score
    ON public.competitor_channel_videos (competitor_channel_id, outlier_score DESC NULLS LAST);

-- ----------------------------------------------------------------------------
-- Baseline + recompute for competitor channels
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.competitor_channel_baseline_views(
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
          FROM public.competitor_channel_videos
         WHERE competitor_channel_id = channel_uuid
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
          FROM public.competitor_channel_videos
         WHERE competitor_channel_id = channel_uuid
           AND COALESCE(is_short, FALSE) = want_short
         ORDER BY published_at DESC
         LIMIT window_size
      ) recent;

    RETURN GREATEST(baseline, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_competitor_outlier_scores(channel_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    long_baseline  NUMERIC;
    short_baseline NUMERIC;
    rows_updated   INTEGER;
BEGIN
    long_baseline  := public.competitor_channel_baseline_views(channel_uuid, FALSE);
    short_baseline := public.competitor_channel_baseline_views(channel_uuid, TRUE);

    UPDATE public.competitor_channel_videos v
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
     WHERE v.competitor_channel_id = channel_uuid;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_competitor_outlier_scores(UUID)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.competitor_channel_baseline_views(UUID, BOOLEAN, INTEGER, INTEGER)
    TO authenticated, service_role;
