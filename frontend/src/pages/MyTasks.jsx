import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Clock, Calendar, Play, Filter } from 'lucide-react'
import * as tasksApi from '../api/tasks'
import { useTimer } from '../context/TimerContext'
import { useNotifications } from '../context/NotificationContext'
import Card, { CardHeader, CardTitle } from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Select from '../components/common/Select'
import EmptyState from '../components/common/EmptyState'
import { SkeletonCard } from '../components/common/Skeleton'
import TaskDetailPane from '../components/kanban/TaskDetailPane'
import { formatDate, formatHours } from '../utils/formatters'
import { PRIORITIES, STATUSES } from '../utils/constants'

function TaskRow({ task, onSelect, onStartTimer, isTimerRunning }) {
  const priority = PRIORITIES[task.priority]
  const status = STATUSES[task.status]

  return (
    <div
      className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border hover:shadow-card transition-all cursor-pointer"
      onClick={() => onSelect(task)}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: task.column_color || '#7367F0' }}
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-text-primary truncate">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
            <Link
              to={`/projects/${task.project_id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary"
            >
              {task.project_name}
            </Link>
            {task.due_date && (
              <>
                <span className="text-text-muted">|</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(task.due_date, 'MMM d')}
                </span>
              </>
            )}
            {task.estimated_hours && (
              <>
                <span className="text-text-muted">|</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatHours(task.estimated_hours, { compact: true })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={status?.color || 'primary'} size="sm">
          {status?.label || task.status}
        </Badge>
        <Badge variant={priority?.color || 'primary'} size="sm">
          {priority?.label || task.priority}
        </Badge>
        {!isTimerRunning && task.status !== 'complete' && task.status !== 'blocked' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onStartTimer(task)
            }}
            className="text-text-secondary hover:text-primary"
          >
            <Play size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}

export default function MyTasks() {
  const { startTimer, isRunning } = useTimer()
  const { showToast } = useNotifications()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const data = await tasksApi.getMyTasks()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTimer = async (task) => {
    try {
      await startTimer(task.id)
      showToast(`Timer started for "${task.title}"`, 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to start timer', 'error')
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const tasksByPriority = {
    urgent: filteredTasks.filter((t) => t.priority === 'urgent'),
    high: filteredTasks.filter((t) => t.priority === 'high'),
    medium: filteredTasks.filter((t) => t.priority === 'medium'),
    low: filteredTasks.filter((t) => t.priority === 'low'),
  }

  const filterOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'ready', label: 'Ready' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'In Review' },
    { value: 'blocked', label: 'Blocked' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-10 w-40 skeleton rounded" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">My Tasks</h1>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={filterOptions}
          className="w-40"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-text-primary">{tasks.length}</p>
          <p className="text-sm text-text-secondary">Total Tasks</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-danger">{tasksByPriority.urgent.length + tasksByPriority.high.length}</p>
          <p className="text-sm text-text-secondary">High Priority</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-warning">
            {tasks.filter((t) => t.status === 'in_progress').length}
          </p>
          <p className="text-sm text-text-secondary">In Progress</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-text-muted">
            {tasks.filter((t) => t.status === 'blocked').length}
          </p>
          <p className="text-sm text-text-secondary">Blocked</p>
        </Card>
      </div>

      {/* Tasks list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={filter === 'all' ? "You don't have any active tasks" : `No tasks with status "${filter}"`}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onSelect={setSelectedTask}
              onStartTimer={handleStartTimer}
              isTimerRunning={isRunning}
            />
          ))}
        </div>
      )}

      {/* Task detail pane */}
      <TaskDetailPane
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchTasks}
      />
    </div>
  )
}
