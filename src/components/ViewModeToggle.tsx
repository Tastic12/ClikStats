'use client'

export type ViewMode = 'grid' | 'list'

type ViewModeToggleProps = {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-0.5"
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        title="Grid view"
        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          value === 'grid'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
        }`}
      >
        <span className="sr-only">Grid</span>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <path d="M1 1h6v6H1V1zm8 0h6v6H9V1zM1 9h6v6H1V9zm8 0h6v6H9V9z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        title="List view"
        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          value === 'list'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
        }`}
      >
        <span className="sr-only">List</span>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <path d="M1 2h14v2H1V2zm0 5h14v2H1V7zm0 5h14v2H1v-2z" />
        </svg>
      </button>
    </div>
  )
}
