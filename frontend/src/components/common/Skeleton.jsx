export default function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 rounded w-48',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-button',
    card: 'h-32 rounded-card',
    image: 'h-48 rounded-lg',
  }

  return <div className={`skeleton ${variants[variant]} ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="card space-y-4">
      <Skeleton variant="title" />
      <Skeleton className="w-full" />
      <Skeleton className="w-3/4" />
      <div className="flex gap-2">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-24" />
          <Skeleton className="w-16" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
