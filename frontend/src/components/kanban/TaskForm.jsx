import { useState, useEffect } from 'react'
import * as tasksApi from '../../api/tasks'
import * as usersApi from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import { PRIORITIES, COMPLEXITIES } from '../../utils/constants'

export default function TaskForm({ isOpen, onClose, projectId, columnId, onCreated, task }) {
  const { user, isPM } = useAuth()
  const { showToast } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    complexity: 'medium',
    owner_id: '',
    estimated_hours: '',
    start_date: '',
    due_date: '',
  })

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'medium',
          complexity: task.complexity || 'medium',
          owner_id: task.owner_id?.toString() || '',
          estimated_hours: task.estimated_hours?.toString() || '',
          start_date: task.start_date || '',
          due_date: task.due_date || '',
        })
      } else {
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          complexity: 'medium',
          owner_id: user.id.toString(),
          estimated_hours: '',
          start_date: '',
          due_date: '',
        })
      }

      // Fetch users for assignment
      if (isPM) {
        fetchUsers()
      }
    }
  }, [isOpen, task, user, isPM])

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getUsers()
      setUsers(data.filter((u) => u.is_active))
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...formData,
      project_id: projectId,
      column_id: columnId,
      owner_id: formData.owner_id ? parseInt(formData.owner_id) : null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
    }

    try {
      if (task) {
        await tasksApi.updateTask(task.id, payload)
        showToast('Task updated', 'success')
      } else {
        await tasksApi.createTask(payload)
        showToast('Task created', 'success')
      }
      onCreated()
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save task', 'error')
    } finally {
      setLoading(false)
    }
  }

  const priorityOptions = Object.entries(PRIORITIES).map(([value, { label }]) => ({
    value,
    label,
  }))

  const complexityOptions = Object.entries(COMPLEXITIES).map(([value, { label }]) => ({
    value,
    label,
  }))

  const userOptions = users.map((u) => ({
    value: u.id.toString(),
    label: u.name,
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task' : 'Create Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="Enter task title"
        />

        <div>
          <label className="label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input min-h-[100px]"
            placeholder="Task description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            options={priorityOptions}
          />
          <Select
            label="Complexity"
            value={formData.complexity}
            onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
            options={complexityOptions}
          />
        </div>

        {isPM && userOptions.length > 0 && (
          <Select
            label="Assign To"
            value={formData.owner_id}
            onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
            options={[{ value: '', label: 'Unassigned' }, ...userOptions]}
          />
        )}

        <Input
          label="Estimated Hours"
          type="number"
          step="0.5"
          min="0"
          value={formData.estimated_hours}
          onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
          placeholder="0"
        />

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
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
