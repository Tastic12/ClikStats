-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON tables TO postgres, anon, authenticated, service_role;

-- Create users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create channels table
CREATE TABLE public.channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    channel_id TEXT UNIQUE NOT NULL,
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    subscriber_count BIGINT DEFAULT 0,
    video_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create channel_metrics table
CREATE TABLE public.channel_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    subscriber_count BIGINT NOT NULL DEFAULT 0,
    video_count BIGINT NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create videos table
CREATE TABLE public.videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    video_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration TEXT,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create video_metrics table
CREATE TABLE public.video_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    like_count BIGINT NOT NULL DEFAULT 0,
    comment_count BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_channels_user_id ON public.channels(user_id);
CREATE INDEX idx_channels_channel_id ON public.channels(channel_id);
CREATE INDEX idx_channel_metrics_channel_id ON public.channel_metrics(channel_id);
CREATE INDEX idx_channel_metrics_recorded_at ON public.channel_metrics(recorded_at);
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX idx_videos_video_id ON public.videos(video_id);
CREATE INDEX idx_video_metrics_video_id ON public.video_metrics(video_id);
CREATE INDEX idx_video_metrics_recorded_at ON public.video_metrics(recorded_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only see and modify their own profile
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only see and modify their own channels
CREATE POLICY "Users can view their own channels" ON public.channels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channels" ON public.channels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels" ON public.channels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels" ON public.channels
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see metrics for their own channels
CREATE POLICY "Users can view their own channel metrics" ON public.channel_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channels 
            WHERE channels.id = channel_metrics.channel_id 
            AND channels.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert channel metrics" ON public.channel_metrics
    FOR INSERT WITH CHECK (true);

-- Users can only see and modify their own videos
CREATE POLICY "Users can view their own videos" ON public.videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON public.videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON public.videos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON public.videos
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see metrics for their own videos
CREATE POLICY "Users can view their own video metrics" ON public.video_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.videos 
            WHERE videos.id = video_metrics.video_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert video metrics" ON public.video_metrics
    FOR INSERT WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_channels_updated_at
    BEFORE UPDATE ON public.channels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 