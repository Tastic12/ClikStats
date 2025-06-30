# YouTube Analytics Pro

A comprehensive YouTube analytics application built with Next.js, TypeScript, Supabase, and the YouTube Data API. Track your YouTube channels, analyze performance metrics, and grow your audience with detailed insights and beautiful visualizations.

![YouTube Analytics Pro](https://via.placeholder.com/800x400?text=YouTube+Analytics+Pro)

## 🚀 Features

- **Multi-Channel Support**: Track multiple YouTube channels from a single dashboard
- **Real-time Analytics**: Monitor subscriber count, view count, and video performance
- **Interactive Charts**: Beautiful visualizations using Recharts
- **Video Tracking**: Detailed analytics for individual videos
- **Automatic Updates**: Daily automated metric updates via Supabase Edge Functions
- **Secure Authentication**: Supabase Auth with row-level security
- **Responsive Design**: Modern UI that works on all devices

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR
- **API Integration**: YouTube Data API v3

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- A Google Cloud Platform account with YouTube Data API enabled
- YouTube Data API key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd youtube-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.local.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.local.example .env.local
   ```

   Required environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   YOUTUBE_API_KEY=your_youtube_data_api_key
   ```

4. **Set up Supabase**

   Run the database migrations:
   ```bash
   npx supabase db push
   ```

   Deploy the Edge Functions:
   ```bash
   npx supabase functions deploy init-channel
   npx supabase functions deploy update-metrics-cron
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

The application uses the following main tables:

- **users**: User profiles and authentication
- **channels**: YouTube channel information
- **channel_metrics**: Historical channel metrics
- **videos**: Video information
- **video_metrics**: Historical video metrics

All tables include Row Level Security (RLS) policies to ensure users only access their own data.

## ⚡ Edge Functions

### init-channel
Initializes a new YouTube channel by:
- Fetching channel information from YouTube API
- Storing channel data in the database
- Fetching the latest 10 videos
- Creating initial metric records

### update-metrics-cron
Daily scheduled function that:
- Updates metrics for all channels
- Fetches new video data
- Records historical metric data points

## 📱 Usage

### Adding Your First Channel

1. Sign up or log in to the application
2. Navigate to the onboarding page
3. Enter your YouTube channel URL in any of these formats:
   - `https://www.youtube.com/channel/UC...`
   - `https://www.youtube.com/c/channelname`
   - `https://www.youtube.com/user/username`
   - `https://www.youtube.com/@handle`
4. Click "Add Channel" to initialize tracking

### Dashboard

The dashboard provides:
- Overview metrics for all your channels
- Interactive charts showing growth over time
- Top-performing videos
- Channel distribution (for multiple channels)

### Video Tracking

The tracking page offers:
- Detailed video-level analytics
- Search and filtering capabilities
- Performance trends over time
- Individual video metrics

## 🎨 Customization

### Adding New Chart Types

To add new chart types, extend the components in `src/components/Charts.tsx`:

```typescript
export function NewChartComponent({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <YourChartType data={data}>
        {/* Chart configuration */}
      </YourChartType>
    </ResponsiveContainer>
  )
}
```

### Extending Metrics

To track additional metrics:

1. Update the database schema in `supabase/migrations/`
2. Modify the Edge Functions to fetch new data
3. Update TypeScript interfaces in `lib/supabase.ts`
4. Add new hooks in `lib/hooks.ts`

## 🔐 Security

- All API routes are protected with Supabase RLS policies
- Users can only access their own data
- Environment variables secure API keys
- CORS properly configured for production

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## 📊 API Reference

### YouTube Data API Integration

The application uses these YouTube Data API endpoints:
- `channels.list`: Get channel information
- `search.list`: Find videos by channel
- `videos.list`: Get detailed video information

### Supabase Edge Functions

#### POST /functions/v1/init-channel
Initialize a new YouTube channel for tracking.

**Request Body:**
```json
{
  "channelId": "string",
  "channelUrl": "string"
}
```

#### POST /functions/v1/update-metrics-cron
Update metrics for all tracked channels (called by Supabase cron).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](issues) page for existing solutions
2. Create a new issue with detailed information
3. Include screenshots and error messages when applicable

## 🎯 Roadmap

- [ ] Email notifications for metric changes
- [ ] Export data to CSV/PDF
- [ ] Competitor analysis
- [ ] Advanced filtering and date ranges
- [ ] Mobile app
- [ ] AI-powered insights

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Recharts](https://recharts.org/) for beautiful chart components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [YouTube Data API](https://developers.google.com/youtube/v3) for providing access to YouTube data
