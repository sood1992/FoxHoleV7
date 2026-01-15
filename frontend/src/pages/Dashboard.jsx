import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as analyticsApi from '../api/analytics'
import Card, { CardHeader, CardTitle } from '../components/common/Card'
import Avatar from '../components/common/Avatar'
import Badge from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'
import { SkeletonCard } from '../components/common/Skeleton'
import { formatDate, formatHours, formatCurrency } from '../utils/formatters'
import { PRIORITIES, STATUSES, getLevelTitle } from '../utils/constants'
import XPProgress from '../components/gamification/XPProgress'

function StatCard({ icon: Icon, label, value, subValue, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  }

  return (
    <Card className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-sm text-text-secondary">{label}</p>
        {subValue && <p className="text-xs text-text-muted mt-0.5">{subValue}</p>}
      </div>
    </Card>
  )
}

function TaskItem({ task }) {
  const priority = PRIORITIES[task.priority]
  const status = STATUSES[task.status]

  return (
    <Link
      to={`/projects/${task.project_id}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-secondary transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-2 h-2 rounded-full shrink-0`}
          style={{ backgroundColor: task.column_color || '#7367F0' }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {task.title}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {task.project_name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.due_date && (
          <span className="text-xs text-text-muted">{formatDate(task.due_date, 'MMM d')}</span>
        )}
        <Badge variant={priority?.color || 'primary'} size="sm">
          {priority?.label || task.priority}
        </Badge>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user, isAdmin, isPM } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        let dashboardData
        if (isAdmin) {
          dashboardData = await analyticsApi.getAdminDashboard()
        } else if (isPM) {
          dashboardData = await analyticsApi.getPMDashboard()
        } else {
          dashboardData = await analyticsApi.getEmployeeDashboard()
        }
        setData(dashboardData)
      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [isAdmin, isPM])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-text-secondary mt-1">
            Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <Link
          to="/my-tasks"
          className="btn-primary flex items-center gap-2"
        >
          View My Tasks
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label={isAdmin ? 'Active Projects' : 'My Projects'}
          value={data?.overview?.active_projects || data?.overview?.my_projects || 0}
          color="primary"
        />
        <StatCard
          icon={CheckSquare}
          label="Active Tasks"
          value={data?.overview?.active_tasks || data?.overview?.my_tasks || 0}
          color="warning"
        />
        <StatCard
          icon={CheckSquare}
          label="Completed This Week"
          value={data?.overview?.completed_this_week || 0}
          color="success"
        />
        <StatCard
          icon={Clock}
          label="Hours This Week"
          value={formatHours(data?.overview?.hours_this_week || 0, { compact: true })}
          subValue={`${formatHours(data?.overview?.billable_hours_this_week || 0, { compact: true })} billable`}
          color="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks due soon / My tasks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              action={
                <Link to="/my-tasks" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              }
            >
              <CardTitle>
                {isAdmin ? 'Tasks Due Soon' : 'My Tasks'}
              </CardTitle>
            </CardHeader>

            <div className="space-y-1">
              {(data?.tasks_due_soon || data?.my_tasks || []).length === 0 ? (
                <p className="text-text-secondary text-sm py-4 text-center">
                  No tasks to show
                </p>
              ) : (
                (data?.tasks_due_soon || data?.my_tasks || []).slice(0, 5).map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))
              )}
            </div>
          </Card>
        </div>

        {/* XP Progress for employees */}
        {!isAdmin && (
          <div>
            <XPProgress />
          </div>
        )}

        {/* Project progress for admins/PMs */}
        {(isAdmin || isPM) && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>

              <div className="space-y-4">
                {(data?.project_progress || data?.my_projects || []).slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block hover:bg-surface-secondary p-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {project.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {project.progress}%
                      </span>
                    </div>
                    <ProgressBar value={project.progress} size="sm" />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-text-muted">
                        {project.completed_tasks}/{project.total_tasks} tasks
                      </span>
                      {project.due_date && (
                        <span className="text-xs text-text-muted">
                          Due {formatDate(project.due_date, 'MMM d')}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
