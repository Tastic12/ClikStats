-- One owned YouTube channel per user
CREATE UNIQUE INDEX IF NOT EXISTS channels_one_owned_per_user ON public.channels (user_id);

-- Competitor channels (multiple per user)
CREATE TABLE public.competitor_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    youtube_channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    subscriber_count BIGINT DEFAULT 0,
    video_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, youtube_channel_id)
);

-- Top videos snapshot per competitor channel
CREATE TABLE public.competitor_channel_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    competitor_channel_id UUID REFERENCES public.competitor_channels(id) ON DELETE CASCADE NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (competitor_channel_id, video_id)
);

-- Individual competitor videos to track
CREATE TABLE public.competitor_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    youtube_video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    channel_name TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, youtube_video_id)
);

CREATE INDEX idx_competitor_channels_user ON public.competitor_channels(user_id);
CREATE INDEX idx_competitor_channel_videos_channel ON public.competitor_channel_videos(competitor_channel_id);
CREATE INDEX idx_competitor_videos_user ON public.competitor_videos(user_id);

ALTER TABLE public.competitor_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_channel_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitor channels" ON public.competitor_channels
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own competitor channel videos" ON public.competitor_channel_videos
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own competitor videos" ON public.competitor_videos
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
