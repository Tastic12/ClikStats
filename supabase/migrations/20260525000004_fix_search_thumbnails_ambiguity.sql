-- Fix "column reference youtube_video_id is ambiguous" in the thumbnail
-- search RPCs. PostgreSQL exposes RETURNS TABLE columns as implicit OUT
-- parameters with those exact names, so a bare reference inside the function
-- body collides with any CTE column of the same name. The patch is to alias
-- internal columns to short names (yt_id, thumb_url, sim) that can't clash,
-- then map them back to the public names in the final SELECT.

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
    )
    SELECT
        n.yt_id                                     AS youtube_video_id,
        n.thumb_url                                 AS thumbnail_url,
        n.sim                                       AS similarity,
        COALESCE(om.t, cm.t)                        AS title,
        COALESCE(om.vc, cm.vc)                      AS view_count,
        COALESCE(om.pa, cm.pa)                      AS published_at,
        COALESCE(om.os, cm.os)                      AS outlier_score,
        COALESCE(om.sh, cm.sh)                      AS is_short,
        COALESCE(om.src, cm.src, 'unknown'::TEXT)   AS source
    FROM nearest n
    LEFT JOIN own_meta om        ON om.yt_id = n.yt_id
    LEFT JOIN competitor_meta cm ON cm.yt_id = n.yt_id
    ORDER BY n.sim DESC;
END;
$$;

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
        SELECT v.video_id AS yt_id, v.thumbnail_url AS thumb_url
          FROM public.videos v
         WHERE v.user_id = user_uuid AND v.thumbnail_url IS NOT NULL
        UNION
        SELECT ccv.video_id AS yt_id, ccv.thumbnail_url AS thumb_url
          FROM public.competitor_channel_videos ccv
         WHERE ccv.user_id = user_uuid AND ccv.thumbnail_url IS NOT NULL
    )
    SELECT ut.yt_id   AS youtube_video_id,
           ut.thumb_url AS thumbnail_url
      FROM user_thumbs ut
      LEFT JOIN public.thumbnail_embeddings te
             ON te.youtube_video_id = ut.yt_id
     WHERE te.id IS NULL
     LIMIT batch_size;
$$;
