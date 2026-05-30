-- Product phases: plan scaffolding + standalone competitor video outlier scores

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'pro'));

COMMENT ON COLUMN public.users.plan IS
    'Subscription tier scaffold (free|pro). Billing not wired yet — set manually or via future webhook.';

-- Standalone competitor videos: duration + outlier vs peer videos user tracks
ALTER TABLE public.competitor_videos
    ADD COLUMN IF NOT EXISTS duration TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_width INTEGER,
    ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER,
    ADD COLUMN IF NOT EXISTS outlier_score NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS niche_outlier_score NUMERIC(10, 2);

ALTER TABLE public.competitor_videos DROP COLUMN IF EXISTS is_short;

ALTER TABLE public.competitor_videos
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN
        GENERATED ALWAYS AS (
            public.classify_as_short(duration, thumbnail_width, thumbnail_height)
        ) STORED;

CREATE INDEX IF NOT EXISTS idx_competitor_videos_user_outlier
    ON public.competitor_videos (user_id, outlier_score DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.standalone_competitor_video_baseline(
    user_uuid  UUID,
    want_short BOOLEAN
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
      FROM public.competitor_videos cv
     WHERE cv.user_id = user_uuid
       AND COALESCE(cv.is_short, FALSE) = want_short
       AND cv.view_count IS NOT NULL;

    IF sample_count < 3 THEN
        RETURN NULL;
    END IF;

    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY cv.view_count)
      INTO baseline
      FROM public.competitor_videos cv
     WHERE cv.user_id = user_uuid
       AND COALESCE(cv.is_short, FALSE) = want_short
       AND cv.view_count IS NOT NULL;

    RETURN GREATEST(baseline, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_standalone_competitor_video_scores(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    long_baseline  NUMERIC;
    short_baseline NUMERIC;
    rows_updated   INTEGER;
BEGIN
    long_baseline  := public.standalone_competitor_video_baseline(user_uuid, FALSE);
    short_baseline := public.standalone_competitor_video_baseline(user_uuid, TRUE);

    UPDATE public.competitor_videos cv
       SET outlier_score = CASE
            WHEN COALESCE(cv.is_short, FALSE) THEN
                CASE WHEN short_baseline IS NULL THEN NULL
                     ELSE ROUND(cv.view_count::NUMERIC / short_baseline, 2)
                END
            ELSE
                CASE WHEN long_baseline IS NULL THEN NULL
                     ELSE ROUND(cv.view_count::NUMERIC / long_baseline, 2)
                END
        END
     WHERE cv.user_id = user_uuid;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.standalone_competitor_video_baseline(UUID, BOOLEAN)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_standalone_competitor_video_scores(UUID)
    TO authenticated, service_role;
