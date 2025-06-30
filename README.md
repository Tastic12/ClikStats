# YouTube Analytics Pro

A comprehensive Next.js application for tracking YouTube channels, videos, and analytics using Supabase and the YouTube Data API.

## Features

- 🔐 **Supabase Authentication** - Secure user registration and login
- 📊 **YouTube Analytics** - Track channel subscribers, views, and video performance
- 📈 **Real-time Charts** - Beautiful visualizations using Recharts
- 🔄 **Automatic Updates** - Daily cron jobs to refresh metrics
- 🎯 **Multi-channel Support** - Track multiple YouTube channels
- 📱 **Responsive Design** - Mobile-friendly interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Charts**: Recharts
- **Data Fetching**: SWR with stale-while-revalidate
- **API**: YouTube Data API v3

## Project Structure

```
youtube-analytics/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── auth/              # Authentication
│   │   ├── dashboard/         # Main dashboard
│   │   ├── onboarding/        # Channel setup
│   │   └── tracking/          # Channel & video management
│   └── components/            # React components
├── lib/
│   ├── supabase.ts           # Supabase client & types
│   └── hooks.ts              # SWR data hooks
├── supabase/
│   ├── migrations/           # Database schema
│   └── functions/            # Edge Functions
└── components/
    └── Charts.tsx            # Chart components
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- YouTube Data API key

### 2. Clone and Install

```bash
git clone <repository-url>
cd youtube-analytics
npm install
```

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the migration file `supabase/migrations/20241201000001_initial_schema.sql` in your Supabase SQL editor
3. This will create all necessary tables with RLS policies

### 5. Edge Functions Setup

Deploy the Edge Functions to Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy init-channel
supabase functions deploy update-metrics-cron
```

### 6. Set up Environment Variables in Supabase

In your Supabase dashboard, go to Settings > Edge Functions and add:
- `YOUTUBE_API_KEY`: Your YouTube Data API key

### 7. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Usage

### Getting Started

1. **Sign Up**: Create an account on the landing page
2. **Onboarding**: Add your first YouTube channel URL
3. **Dashboard**: View analytics and insights
4. **Manage Channels**: Add/remove channels you want to track
5. **View Videos**: Browse and manage tracked videos

### Adding Channels

Supported YouTube URL formats:
- `https://www.youtube.com/channel/UC...`
- `https://www.youtube.com/c/channelname`
- `https://www.youtube.com/user/username`
- `https://www.youtube.com/@channelname`

### Automatic Updates

The system automatically:
- Fetches channel info and latest 10 videos when adding a channel
- Updates all metrics daily via the `update-metrics-cron` Edge Function
- Stores historical data for trend analysis

## Database Schema

### Tables

- **users**: User profiles (extends Supabase auth.users)
- **channels**: YouTube channel information
- **channel_metrics**: Historical channel metrics
- **videos**: YouTube video information
- **video_metrics**: Historical video metrics

### Row Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data.

## API Endpoints

### Edge Functions

- `POST /functions/v1/init-channel`: Initialize a new channel
- `POST /functions/v1/update-metrics-cron`: Update all metrics (cron job)

## Cron Setup

### Option 1: Supabase Cron (Recommended)

Add to your Supabase project:

```sql
SELECT cron.schedule(
  'update-youtube-metrics',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/update-metrics-cron'',
    headers := jsonb_build_object(
      ''Authorization'', ''Bearer '' || ''your-service-role-key'',
      ''Content-Type'', ''application/json''
    ),
    body := jsonb_build_object()
  );'
);
```

### Option 2: Vercel Cron

If deploying to Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-metrics",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Deployment

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Deploy Edge Functions

```bash
supabase functions deploy --project-ref your-project-ref
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@youtubeanalyticspro.com or create an issue in the repository. 