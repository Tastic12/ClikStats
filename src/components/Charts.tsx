'use client'

import React from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import type { ChannelMetric, VideoMetric } from '../../lib/supabase'

interface ChannelMetricsChartProps {
  metrics: ChannelMetric[]
  metricType: 'subscriber_count' | 'view_count' | 'video_count'
}

export function ChannelMetricsChart({ metrics, metricType }: ChannelMetricsChartProps) {
  const data = metrics.map(metric => ({
    date: new Date(metric.recorded_at).toLocaleDateString(),
    value: metric[metricType]
  })).reverse() // Reverse to show chronological order

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={formatValue} />
        <Tooltip formatter={(value) => formatValue(Number(value))} />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#4361ee" 
          strokeWidth={2}
          dot={{ fill: '#4361ee' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface VideoMetricsChartProps {
  metrics: VideoMetric[]
  metricType: 'view_count' | 'like_count' | 'comment_count'
}

export function VideoMetricsChart({ metrics, metricType }: VideoMetricsChartProps) {
  const data = metrics.map(metric => ({
    date: new Date(metric.recorded_at).toLocaleDateString(),
    value: metric[metricType]
  })).reverse()

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={formatValue} />
        <Tooltip formatter={(value) => formatValue(Number(value))} />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#60a5fa" 
          strokeWidth={2}
          dot={{ fill: '#60a5fa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface TopVideosChartProps {
  videos: Array<{
    title: string
    view_count?: number
  }>
}

export function TopVideosChart({ videos }: TopVideosChartProps) {
  const data = videos.slice(0, 10).map(video => ({
    title: video.title.length > 30 ? video.title.substring(0, 30) + '...' : video.title,
    views: video.view_count || 0
  }))

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis type="number" tickFormatter={formatValue} />
        <YAxis type="category" dataKey="title" width={200} />
        <Tooltip formatter={(value) => formatValue(Number(value))} />
        <Bar dataKey="views" fill="#4361ee" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface ChannelDistributionChartProps {
  channels: Array<{
    channel_name: string
    subscriber_count?: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function ChannelDistributionChart({ channels }: ChannelDistributionChartProps) {
  const data = channels.map((channel, index) => ({
    name: channel.channel_name,
    value: channel.subscriber_count || 0,
    color: COLORS[index % COLORS.length]
  }))

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, value }) => `${name}: ${formatValue(Number(value))}`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatValue(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface MetricCardProps {
  title: string
  value: number
  change?: number
  format?: 'number' | 'views' | 'subscribers'
}

export function MetricCard({ title, value, change, format = 'number' }: MetricCardProps) {
  const formatValue = (val: number) => {
    if (format === 'subscribers' || format === 'views') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`
      }
    }
    return val.toLocaleString()
  }

  return (
    <div className="cs-card p-6">
      <h3 className="text-sm font-medium text-[var(--muted)]">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <div className="text-2xl font-semibold text-[var(--foreground)]">
          {formatValue(value)}
        </div>
        {change !== undefined && change !== 0 && (
          <div
            className={`ml-2 text-sm font-semibold ${
              change >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {change >= 0 ? '+' : ''}
            {formatValue(Math.abs(change))}
          </div>
        )}
      </div>
    </div>
  )
} 