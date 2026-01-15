import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, Link as LinkIcon, Lock, User } from 'lucide-react'
import Avatar from '../common/Avatar'
import Badge from '../common/Badge'
import { formatDate, formatHours } from '../../utils/formatters'
import { PRIORITIES } from '../../utils/constants'

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: task.is_blocked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = PRIORITIES[task.priority]

  const progress = task.actual_hours && task.estimated_hours
    ? Math.round((task.actual_hours / task.estimated_hours) * 100)
    : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={`bg-surface rounded-lg border border-border p-4 cursor-pointer hover:shadow-card transition-all ${
        isDragging ? 'opacity-50 ring-2 ring-primary' : ''
      } ${task.is_blocked ? 'opacity-60' : ''}`}
    >
      {/* Priority indicator and title */}
      <div className="flex items-start gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
            priority?.color === 'danger' ? 'bg-danger' :
            priority?.color === 'warning' ? 'bg-warning' :
            priority?.color === 'info' ? 'bg-info' : 'bg-primary'
          }`}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-text-primary text-sm leading-tight">
            {task.is_blocked && <Lock size={12} className="inline mr-1 text-text-muted" />}
            {task.title}
          </h4>
        </div>
      </div>

      {/* Meta info */}
      <div className="space-y-2 text-xs text-text-secondary">
        {/* Assignee and estimate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.owner_avatar || task.owner_name ? (
              <Avatar
                src={task.owner_avatar}
                name={task.owner_name}
                size="xs"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center">
                <User size={12} className="text-text-muted" />
              </div>
            )}
            <span className="truncate max-w-[100px]">{task.owner_name || 'Unassigned'}</span>
          </div>
          {task.estimated_hours && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatHours(task.estimated_hours, { compact: true })}</span>
            </div>
          )}
        </div>

        {/* Due date and dependencies */}
        <div className="flex items-center justify-between">
          {task.due_date && (
            <span className={task.is_overdue ? 'text-danger' : ''}>
              Due {formatDate(task.due_date, 'MMM d')}
            </span>
          )}
          {task.dependency_count > 0 && (
            <div className="flex items-center gap-1">
              <LinkIcon size={12} />
              <span>{task.dependency_count} deps</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {task.estimated_hours > 0 && (
          <div className="pt-1">
            <div className="w-full bg-surface-tertiary rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  progress > 100 ? 'bg-danger' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {task.complexity && task.complexity !== 'medium' && (
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge size="sm" variant="muted">
            {task.complexity}
          </Badge>
        </div>
      )}
    </div>
  )
}
