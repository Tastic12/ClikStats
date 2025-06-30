'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientStatus, setClientStatus] = useState<string>('checking...')

  useEffect(() => {
    const checkSupabaseClient = async () => {
      try {
        // Debug environment variables
        console.log('Environment check:', {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        })

        // Check if client is available
        if (!supabase) {
          setClientStatus('❌ Supabase client not initialized - check environment variables')
          setIsLoading(false)
          return
        }

        setClientStatus('✅ Supabase client initialized')
        
        // Check current session - only if supabase client exists
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        setIsLoading(false)

        // Listen for auth changes - only if supabase client exists
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setUser(session?.user ?? null)
          }
        )

        return () => subscription.unsubscribe()
      } catch (error: any) {
        console.error('Supabase initialization error:', error)
        setClientStatus(`❌ Error: ${error.message}`)
        setIsLoading(false)
      }
    }

    checkSupabaseClient()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                  YouTube Analytics Pro
                </h1>
              </div>
            </div>
            
            {/* Debug Info */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{clientStatus}</span>
              
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">Welcome, {user.email}</span>
                  <Link 
                    href="/dashboard"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/auth"
                    className="text-gray-700 hover:text-red-600 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Master Your{' '}
              <span className="bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                YouTube Analytics
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Track channel growth, monitor video performance, and gain insights 
              that help you grow your YouTube presence with our comprehensive analytics platform.
            </p>
            
            {!isLoading && !user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/auth"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                >
                  Start Free Trial
                </Link>
                <Link 
                  href="#features"
                  className="border border-red-600 text-red-600 hover:bg-red-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                >
                  View Features
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Grow
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive analytics tools designed specifically for YouTube creators
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Channel Analytics',
                description: 'Monitor subscriber growth, view counts, and overall channel performance with detailed insights.',
                icon: '📊'
              },
              {
                title: 'Video Tracking',
                description: 'Track individual video performance, engagement rates, and optimization opportunities.',
                icon: '🎥'
              },
              {
                title: 'Growth Insights',
                description: 'Get actionable recommendations to improve your content and grow your audience.',
                icon: '📈'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-red-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Grow Your Channel?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already using our platform to optimize their YouTube strategy.
          </p>
          {!user && (
            <Link 
              href="/auth"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-block"
            >
              Get Started for Free
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">YouTube Analytics Pro</h3>
              <p className="text-gray-400">
                The ultimate analytics platform for YouTube creators.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 YouTube Analytics Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 