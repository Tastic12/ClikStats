'use client'

import { useEffect, useRef, useState } from 'react'
import { useUserProfile } from '../../lib/hooks'

type ProfileMenuProps = {
  email?: string
}

export function ProfileMenu({ email }: ProfileMenuProps) {
  const { profile, isLoading, updateDisplayName } = useUserProfile()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const displayLabel =
    profile?.display_name ||
    (email ? email.split('@')[0] : null) ||
    'Your profile'

  useEffect(() => {
    if (profile?.display_name) setNameInput(profile.display_name)
  }, [profile?.display_name])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSaveName = async () => {
    setSaving(true)
    setError('')
    try {
      await updateDisplayName(nameInput)
      setEditing(false)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
          {displayLabel.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block max-w-[140px] truncate font-medium text-gray-900">
          {isLoading ? '…' : displayLabel}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg py-2">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
          </div>

          {editing ? (
            <div className="px-4 py-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Profile name</label>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                placeholder="e.g. My Creator Account"
                autoFocus
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex-1 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameInput(profile?.display_name || '')
                setEditing(true)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {profile?.display_name ? 'Edit profile name' : 'Set profile name'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
