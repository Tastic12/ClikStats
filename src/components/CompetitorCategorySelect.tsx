'use client'

type CategoryOption = { id: string; name: string }

type CompetitorCategorySelectProps = {
  value: string | null | undefined
  categories: CategoryOption[]
  onChange: (groupId: string | null) => void
  disabled?: boolean
  className?: string
}

export function CompetitorCategorySelect({
  value,
  categories,
  onChange,
  disabled,
  className = '',
}: CompetitorCategorySelectProps) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      className={`cs-input text-xs py-1.5 px-2 min-h-9 max-w-full ${className}`}
      aria-label="Move to category"
    >
      <option value="">Unsorted</option>
      {categories.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  )
}
