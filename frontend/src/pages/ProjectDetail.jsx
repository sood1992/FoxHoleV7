import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Settings, Users, Clock, Calendar } from 'lucide-react'
import * as projectsApi from '../api/projects'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'
import Avatar from '../components/common/Avatar'
import Card from '../components/common/Card'
import { Skeleton } from '../components/common/Skeleton'
import KanbanBoard from '../components/kanban/KanbanBoard'
import { formatDate, formatHours, formatCurrency } from '../utils/formatters'
import { PROJECT_STATUSES } from '../utils/constants'

export default function ProjectDetail() {
  const { id } = useParams()
  const { isPM, isAdmin } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('board')

  useEffect(() => {
    fetchProject()
  }, [id])

  const fetchProject = async () => {
    try {
      const data = await projectsApi.getProject(id)
      setProject(data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton variant="button" />
          <Skeleton variant="title" className="w-64" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Project not found</h2>
        <Link to="/projects" className="text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    )
  }

  const status = PROJECT_STATUSES[project.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
              <Badge variant={status?.color || 'primary'}>{status?.label || project.status}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
              <span>{project.code}</span>
              {project.client_name && (
                <>
                  <span className="text-text-muted">|</span>
                  <span>{project.client_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isPM && (
          <Button variant="secondary" leftIcon={<Settings size={16} />}>
            Settings
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">
              {formatHours(project.stats?.actual_hours || 0, { compact: true })}
            </p>
            <p className="text-xs text-text-secondary">
              of {formatHours(project.stats?.estimated_hours || 0, { compact: true })} estimated
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <Calendar size={20} className="text-success" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">
              {project.stats?.completed_tasks || 0}/{project.stats?.total_tasks || 0}
            </p>
            <p className="text-xs text-text-secondary">Tasks completed</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <Users size={20} className="text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">
              {project.members?.length || 0}
            </p>
            <p className="text-xs text-text-secondary">Team members</p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Progress</span>
            <span className="text-sm font-bold text-text-primary">
              {project.stats?.progress || 0}%
            </span>
          </div>
          <ProgressBar value={project.stats?.progress || 0} />
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {['board', 'members', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'board' && <KanbanBoard projectId={parseInt(id)} />}

      {activeTab === 'members' && (
        <Card>
          <h3 className="font-semibold text-text-primary mb-4">Team Members</h3>
          <div className="space-y-3">
            {project.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={member.avatar_url} name={member.name} />
                  <div>
                    <p className="font-medium text-text-primary">{member.name}</p>
                    <p className="text-sm text-text-secondary">{member.designation}</p>
                  </div>
                </div>
                <Badge variant="primary">{member.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'settings' && isPM && (
        <Card>
          <h3 className="font-semibold text-text-primary mb-4">Project Settings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-secondary">Budget</p>
              <p className="font-medium">{formatCurrency(project.budget || 0)}</p>
            </div>
            <div>
              <p className="text-text-secondary">Hourly Rate</p>
              <p className="font-medium">{formatCurrency(project.hourly_rate || 0)}/hr</p>
            </div>
            <div>
              <p className="text-text-secondary">Start Date</p>
              <p className="font-medium">{formatDate(project.start_date) || 'Not set'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Due Date</p>
              <p className="font-medium">{formatDate(project.due_date) || 'Not set'}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
