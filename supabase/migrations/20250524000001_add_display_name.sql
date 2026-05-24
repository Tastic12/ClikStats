-- Add optional display name for user profiles
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMENT ON COLUMN public.users.display_name IS 'User-chosen profile name shown in the app header';
