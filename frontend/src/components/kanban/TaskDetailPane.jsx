import { useState, useEffect } from 'react'
import {
  Clock,
  Calendar,
  User,
  Link as LinkIcon,
  MessageSquare,
  Paperclip,
  Play,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import * as tasksApi from '../../api/tasks'
import { useAuth } from '../../context/AuthContext'
import { useTimer } from '../../context/TimerContext'
import { useNotifications } from '../../context/NotificationContext'
import SlidePane from '../common/SlidePane'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import Badge from '../common/Badge'
import Avatar from '../common/Avatar'
import { formatDate, formatDateTime, formatHours, formatRelative } from '../../utils/formatters'
import { PRIORITIES, STATUSES, COMPLEXITIES } from '../../utils/constants'

export default function TaskDetailPane({ task, isOpen, onClose, onUpdate }) {
  const { user } = useAuth()
  const { startTimer, isRunning, activeTimer } = useTimer()
  const { showToast } = useNotifications()
  const [taskData, setTaskData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    if (task?.id) {
      fetchTaskDetails()
    }
  }, [task?.id])

  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      const data = await tasksApi.getTask(task.id)
      setTaskData(data)
    } catch (error) {
      console.error('Failed to fetch task details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await tasksApi.updateTaskStatus(task.id, newStatus)
      showToast('Status updated', 'success')
      onUpdate()
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update status', 'error')
    }
  }

  const handleStartTimer = async () => {
    try {
      await startTimer(task.id)
      showToast('Timer started', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to start timer', 'error')
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmittingComment(true)
    try {
      await tasksApi.addComment(task.id, newComment)
      setNewComment('')
      fetchTaskDetails()
    } catch (error) {
      showToast('Failed to add comment', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (!taskData && loading) {
    return (
      <SlidePane isOpen={isOpen} onClose={onClose} title="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-secondary rounded w-3/4" />
          <div className="h-4 bg-surface-secondary rounded w-1/2" />
          <div className="h-24 bg-surface-secondary rounded" />
        </div>
      </SlidePane>
    )
  }

  if (!taskData) return null

  const priority = PRIORITIES[taskData.priority]
  const status = STATUSES[taskData.status]
  const isTimerOnThis = isRunning && activeTimer?.task_id === task.id

  const statusOptions = Object.entries(STATUSES)
    .filter(([key]) => key !== 'blocked')
    .map(([value, { label }]) => ({ value, label }))

  return (
    <SlidePane
      isOpen={isOpen}
      onClose={onClose}
      title={taskData.title}
      width="550px"
    >
      <div className="space-y-6">
        {/* Status and priority */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={taskData.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={statusOptions}
            className="w-40"
            disabled={taskData.status === 'blocked'}
          />
          <Badge variant={priority?.color || 'primary'}>
            {priority?.label || taskData.priority}
          </Badge>
          {taskData.is_blocked && (
            <Badge variant="muted">
              <AlertCircle size={12} className="mr-1" />
              Blocked
            </Badge>
          )}
        </div>

        {/* Timer button */}
        {!isTimerOnThis && !isRunning && taskData.status !== 'complete' && (
          <Button
            variant="secondary"
            leftIcon={<Play size={16} />}
            onClick={handleStartTimer}
          >
            Start Timer
          </Button>
        )}
        {isTimerOnThis && (
          <div className="flex items-center gap-2 text-success">
            <div className="animate-pulse">
              <Clock size={16} />
            </div>
            <span className="text-sm font-medium">Timer running</span>
          </div>
        )}

        {/* Description */}
        {taskData.description && (
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">Description</h4>
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {taskData.description}
            </p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-text-secondary mb-1">Owner</h4>
            <div className="flex items-center gap-2">
              <Avatar
                src={taskData.owner_avatar}
                name={taskData.owner_name}
                size="sm"
              />
              <span className="text-sm">{taskData.owner_name || 'Unassigned'}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-text-secondary mb-1">Complexity</h4>
            <span className="text-sm capitalize">{taskData.complexity}</span>
          </div>

          <div>
            <h4 className="text-xs font-medium text-text-secondary mb-1">Due Date</h4>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-text-muted" />
              {taskData.due_date ? formatDate(taskData.due_date) : 'Not set'}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-text-secondary mb-1">Time</h4>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-text-muted" />
              {formatHours(taskData.actual_hours || 0)} / {formatHours(taskData.estimated_hours || 0)}
            </div>
          </div>
        </div>

        {/* Dependencies */}
        {(taskData.blocked_by?.length > 0 || taskData.blocking?.length > 0) && (
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <LinkIcon size={14} />
              Dependencies
            </h4>

            {taskData.blocked_by?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-text-muted mb-1">Blocked by:</p>
                <div className="space-y-1">
                  {taskData.blocked_by.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center gap-2 text-sm p-2 bg-surface-secondary rounded"
                    >
                      {dep.status === 'complete' ? (
                        <CheckCircle size={14} className="text-success" />
                      ) : (
                        <AlertCircle size={14} className="text-warning" />
                      )}
                      <span className="truncate">{dep.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {taskData.blocking?.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-1">Blocking:</p>
                <div className="space-y-1">
                  {taskData.blocking.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center gap-2 text-sm p-2 bg-surface-secondary rounded"
                    >
                      <span className="truncate">{dep.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contributors */}
        {taskData.contributors?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">Contributors</h4>
            <div className="space-y-2">
              {taskData.contributors.map((contributor) => (
                <div
                  key={contributor.id}
                  className="flex items-center justify-between p-2 bg-surface-secondary rounded"
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={contributor.avatar_url} name={contributor.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{contributor.name}</p>
                      <p className="text-xs text-text-secondary">{contributor.role_name}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      contributor.status === 'complete'
                        ? 'success'
                        : contributor.status === 'in_progress'
                        ? 'warning'
                        : 'muted'
                    }
                    size="sm"
                  >
                    {contributor.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time entries */}
        {taskData.time_entries?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <Clock size={14} />
              Recent Time Entries
            </h4>
            <div className="space-y-2">
              {taskData.time_entries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm p-2 bg-surface-secondary rounded"
                >
                  <div>
                    <span className="font-medium">{entry.user_name}</span>
                    <span className="text-text-secondary ml-2">{formatDate(entry.date)}</span>
                  </div>
                  <span className="font-medium">{formatHours(entry.hours)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
            <MessageSquare size={14} />
            Comments ({taskData.comments?.length || 0})
          </h4>

          <form onSubmit={handleAddComment} className="mb-4">
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
              />
              <Button type="submit" loading={submittingComment} size="sm">
                Post
              </Button>
            </div>
          </form>

          {taskData.comments?.length > 0 && (
            <div className="space-y-3">
              {taskData.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar src={comment.avatar_url} name={comment.user_name} size="sm" />
                  <div className="flex-1 bg-surface-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{comment.user_name}</span>
                      <span className="text-xs text-text-muted">
                        {formatRelative(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="text-xs text-text-muted pt-4 border-t border-border">
          <p>Created {formatRelative(taskData.created_at)} by {taskData.created_by_name}</p>
          {taskData.completed_at && (
            <p className="mt-1">Completed {formatDateTime(taskData.completed_at)}</p>
          )}
        </div>
      </div>
    </SlidePane>
  )
}
