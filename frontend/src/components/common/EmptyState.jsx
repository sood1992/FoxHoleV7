import { Inbox } from 'lucide-react'
import Button from './Button'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
        <Icon size={32} className="text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-text-secondary text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <Button onClick={action}>{actionLabel}</Button>
      )}
    </div>
  )
}
