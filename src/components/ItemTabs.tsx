'use client'

type TabItem = {
  id: string
  label: string
  thumbnailUrl?: string | null
}

type ItemTabsProps = {
  items: TabItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyLabel?: string
}

export function ItemTabs({ items, selectedId, onSelect, emptyLabel }: ItemTabsProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-[var(--muted)] py-4 text-center">
        {emptyLabel || 'Nothing to show yet.'}
      </p>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {items.map((item) => {
        const active = selectedId === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 border transition-colors ${
              active
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]'
            }`}
          >
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover bg-[var(--elevated)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--elevated)]" />
            )}
            <span className="text-sm font-medium truncate max-w-[140px]">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
