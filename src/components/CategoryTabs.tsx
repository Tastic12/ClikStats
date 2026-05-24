'use client'

import { useState } from 'react'

export type CategoryItem = {
  id: string
  name: string
}

export const ALL_CATEGORIES_ID = '__all__'

type CategoryTabsProps = {
  categories: CategoryItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string) => Promise<void>
  unsortedLabel?: string
  showUnsorted?: boolean
  showAll?: boolean
}

export function CategoryTabs({
  categories,
  selectedId,
  onSelect,
  onCreate,
  unsortedLabel = 'Unsorted',
  showUnsorted = true,
  showAll = true,
}: CategoryTabsProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      await onCreate(name)
      setNewName('')
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showAll && (
          <button
            type="button"
            onClick={() => onSelect(ALL_CATEGORIES_ID)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              selectedId === ALL_CATEGORIES_ID
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            All
          </button>
        )}
        {showUnsorted && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              selectedId === null
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {unsortedLabel}
          </button>
        )}
        {categories.map((cat) => {
          const active = selectedId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                active
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]'
              }`}
            >
              {cat.name}
            </button>
          )
        })}
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            + New category
          </button>
        ) : (
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. News, Football…"
              className="cs-input px-3 py-1.5 text-sm w-40"
              autoFocus
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="cs-btn-primary px-3 py-1.5 text-sm"
            >
              {saving ? '…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setNewName('')
              }}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
