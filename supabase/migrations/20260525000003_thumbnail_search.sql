-- Thumbnail similarity search powered by pgvector + CLIP embeddings.
-- One embedding per unique YouTube video (shared regardless of which user
-- happens to track it), keyed by the YouTube video id string. Embeddings
-- are 512-dimensional (CLIP ViT-B/32).

CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- thumbnail_embeddings
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.thumbnail_embeddings (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    youtube_video_id TEXT UNIQUE NOT NULL,
    thumbnail_url    TEXT NOT NULL,
    embedding        vector(512) NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HNSW index for fast approximate-nearest-neighbour search using cosine distance.
CREATE INDEX IF NOT EXISTS idx_thumbnail_embeddings_vec
    ON public.thumbnail_embeddings USING hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Embeddings are derived from PUBLIC YouTube thumbnails, so the row contents
-- aren't sensitive. We still enable RLS so only authenticated users can read
-- them via the API; writes happen via service role from the embed-batch route.

ALTER TABLE public.thumbnail_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read thumbnail embeddings"
    ON public.thumbnail_embeddings;
CREATE POLICY "Authenticated users can read thumbnail embeddings"
    ON public.thumbnail_embeddings FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- Search RPC
-- ----------------------------------------------------------------------------
-- Returns the K nearest thumbnails to query_embedding, joined to whatever
-- metadata the calling user has (their own videos take precedence over their
-- competitor_channel_videos). Embedding is passed as TEXT in pgvector's
-- "[1,2,3]" syntax because Supabase's JS RPC client serialises params as JSON
-- and PostgreSQL cannot implicitly cast a JSON array to vector.

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
            te.youtube_video_id,
            te.thumbnail_url,
            (1 - (te.embedding <=> qvec))::FLOAT AS similarity
        FROM public.thumbnail_embeddings te
        ORDER BY te.embedding <=> qvec
        LIMIT match_count
    ),
    own_meta AS (
        SELECT
            v.video_id     AS youtube_video_id,
            v.title,
            v.view_count,
            v.published_at,
            v.outlier_score,
            v.is_short,
            'own'::TEXT    AS source
        FROM public.videos v
        WHERE v.user_id = user_uuid
          AND v.video_id IN (SELECT youtube_video_id FROM nearest)
    ),
    competitor_meta AS (
        SELECT DISTINCT ON (ccv.video_id)
            ccv.video_id        AS youtube_video_id,
            ccv.title,
            ccv.view_count,
            ccv.published_at,
            ccv.outlier_score,
            ccv.is_short,
            'competitor'::TEXT  AS source
        FROM public.competitor_channel_videos ccv
        WHERE ccv.user_id = user_uuid
          AND ccv.video_id IN (SELECT youtube_video_id FROM nearest)
        ORDER BY ccv.video_id, ccv.created_at DESC
    )
    SELECT
        n.youtube_video_id,
        n.thumbnail_url,
        n.similarity,
        COALESCE(om.title, cm.title)                        AS title,
        COALESCE(om.view_count, cm.view_count)              AS view_count,
        COALESCE(om.published_at, cm.published_at)          AS published_at,
        COALESCE(om.outlier_score, cm.outlier_score)        AS outlier_score,
        COALESCE(om.is_short, cm.is_short)                  AS is_short,
        COALESCE(om.source, cm.source, 'unknown'::TEXT)     AS source
    FROM nearest n
    LEFT JOIN own_meta om        ON om.youtube_video_id = n.youtube_video_id
    LEFT JOIN competitor_meta cm ON cm.youtube_video_id = n.youtube_video_id
    ORDER BY n.similarity DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_thumbnails(UUID, TEXT, INTEGER)
    TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Helper: list every video the user tracks that doesn't yet have an embedding.
-- Used by the embed-batch route to know what's left to do.
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
        SELECT video_id AS youtube_video_id, thumbnail_url
          FROM public.videos
         WHERE user_id = user_uuid AND thumbnail_url IS NOT NULL
        UNION
        SELECT video_id AS youtube_video_id, thumbnail_url
          FROM public.competitor_channel_videos
         WHERE user_id = user_uuid AND thumbnail_url IS NOT NULL
    )
    SELECT ut.youtube_video_id, ut.thumbnail_url
      FROM user_thumbs ut
      LEFT JOIN public.thumbnail_embeddings te
             ON te.youtube_video_id = ut.youtube_video_id
     WHERE te.id IS NULL
     LIMIT batch_size;
$$;

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings(UUID, INTEGER)
    TO authenticated, service_role;

-- Also expose a count helper for the UI progress indicator.
CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
      FROM (
        SELECT video_id AS youtube_video_id
          FROM public.videos
         WHERE user_id = user_uuid AND thumbnail_url IS NOT NULL
        UNION
        SELECT video_id AS youtube_video_id
          FROM public.competitor_channel_videos
         WHERE user_id = user_uuid AND thumbnail_url IS NOT NULL
      ) all_thumbs
      LEFT JOIN public.thumbnail_embeddings te
             ON te.youtube_video_id = all_thumbs.youtube_video_id
     WHERE te.id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings_count(UUID)
    TO authenticated, service_role;
