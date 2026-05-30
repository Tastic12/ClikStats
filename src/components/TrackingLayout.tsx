'use client'

type TrackingLayoutProps = {
  children: React.ReactNode
  title?: string
  description?: string
}

export function TrackingLayout({ children, title, description }: TrackingLayoutProps) {
  return (
    <div className="w-full max-w-none space-y-6">
      {(title || description) && (
        <header className="pb-2">
          {title && (
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">{title}</h1>
          )}
          {description && (
            <p className="mt-2 text-sm text-[var(--muted)] max-w-3xl">{description}</p>
          )}
        </header>
      )}
      {children}
    </div>
  )
}
