-- Categories for organizing competitor channels and videos (e.g. News, Football, Makeup)

CREATE TABLE public.competitor_channel_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, name)
);

CREATE TABLE public.competitor_video_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, name)
);

ALTER TABLE public.competitor_channels
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.competitor_channel_groups(id) ON DELETE SET NULL;

ALTER TABLE public.competitor_videos
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.competitor_video_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_competitor_channel_groups_user ON public.competitor_channel_groups(user_id);
CREATE INDEX idx_competitor_video_groups_user ON public.competitor_video_groups(user_id);
CREATE INDEX idx_competitor_channels_group ON public.competitor_channels(group_id);
CREATE INDEX idx_competitor_videos_group ON public.competitor_videos(group_id);

ALTER TABLE public.competitor_channel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_video_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitor channel groups" ON public.competitor_channel_groups
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own competitor video groups" ON public.competitor_video_groups
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
