'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { useUserProfile } from '../../../lib/hooks'
import { DashboardShell } from '../../components/DashboardShell'
import { AddChannelForm } from '../../components/AddChannelForm'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const { profile, updateDisplayName } = useUserProfile()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) router.push('/auth')
      else setUser(u)
    })
  }, [router])

  useEffect(() => {
    if (profile?.display_name) setProfileName(profile.display_name)
  }, [profile?.display_name])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSaveProfileName = async () => {
    if (!profileName.trim()) return
    setSavingName(true)
    try {
      await updateDisplayName(profileName)
    } finally {
      setSavingName(false)
    }
  }

  const handleChannelAdded = () => {
    router.push('/dashboard')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  return (
    <DashboardShell email={user.email} onSignOut={handleSignOut}>
      <div className="max-w-xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to ClikStats</h1>
          <p className="mt-1 text-sm text-gray-600">
            Set your profile name and connect the YouTube channel you want to track.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">1. Profile name</h2>
          <p className="text-sm text-gray-500">Shown in the top right across the app.</p>
          <div className="flex gap-2">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. My Creator Account"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={handleSaveProfileName}
              disabled={savingName || !profileName.trim()}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {savingName ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">2. Connect YouTube channel</h2>
          <AddChannelForm onSuccess={handleChannelAdded} />
        </div>

        <p className="text-center text-sm text-gray-500">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Skip for now →
          </Link>
        </p>
      </div>
    </DashboardShell>
  )
}
