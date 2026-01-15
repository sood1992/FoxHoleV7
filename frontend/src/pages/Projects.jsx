import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, FolderKanban } from 'lucide-react'
import * as projectsApi from '../api/projects'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import { SkeletonCard } from '../components/common/Skeleton'
import { formatDate, formatCurrency } from '../utils/formatters'
import { PROJECT_STATUSES, WORKFLOW_TEMPLATES } from '../utils/constants'

function ProjectCard({ project }) {
  const status = PROJECT_STATUSES[project.status]

  return (
    <Link to={`/projects/${project.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary">{project.name}</h3>
            <p className="text-sm text-text-secondary">{project.code}</p>
          </div>
          <Badge variant={status?.color || 'primary'}>{status?.label || project.status}</Badge>
        </div>

        {project.client_name && (
          <p className="text-sm text-text-secondary mb-4">{project.client_name}</p>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-text-secondary">Progress</span>
            <span className="text-text-primary font-medium">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} size="sm" />
        </div>

        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>{project.task_count} tasks</span>
          {project.due_date && <span>Due {formatDate(project.due_date, 'MMM d')}</span>}
        </div>
      </Card>
    </Link>
  )
}

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    client_name: '',
    description: '',
    workflow_template: 'custom',
    budget: '',
    hourly_rate: '',
    start_date: '',
    due_date: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const project = await projectsApi.createProject(formData)
      onCreated(project)
      onClose()
      setFormData({
        name: '',
        code: '',
        client_name: '',
        description: '',
        workflow_template: 'custom',
        budget: '',
        hourly_rate: '',
        start_date: '',
        due_date: '',
      })
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setLoading(false)
    }
  }

  const workflowOptions = Object.entries(WORKFLOW_TEMPLATES).map(([value, label]) => ({
    value,
    label,
  }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Enter project name"
          />
          <Input
            label="Project Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="Auto-generated if empty"
          />
        </div>

        <Input
          label="Client Name"
          value={formData.client_name}
          onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
          placeholder="Enter client name"
        />

        <div>
          <label className="label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input min-h-[80px]"
            placeholder="Project description..."
          />
        </div>

        <Select
          label="Workflow Template"
          value={formData.workflow_template}
          onChange={(e) => setFormData({ ...formData, workflow_template: e.target.value })}
          options={workflowOptions}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Budget (INR)"
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Hourly Rate (INR)"
            type="number"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
          <Input
            label="Due Date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Projects() {
  const { isPM } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [filter])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const data = await projectsApi.getProjects(filter === 'all' ? null : filter)
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.code?.toLowerCase().includes(search.toLowerCase()) ||
    project.client_name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusOptions = [
    { value: 'all', label: 'All Projects' },
    ...Object.entries(PROJECT_STATUSES).map(([value, { label }]) => ({ value, label })),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
        {isPM && (
          <Button leftIcon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={statusOptions}
          className="w-48"
        />
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description={search ? 'Try a different search term' : 'Create your first project to get started'}
          action={isPM ? () => setShowCreateModal(true) : undefined}
          actionLabel={isPM ? 'Create Project' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(project) => {
          setProjects([project, ...projects])
        }}
      />
    </div>
  )
}
