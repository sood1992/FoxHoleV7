import { useState, useEffect } from 'react'
import { Plus, Search, MoreVertical, Mail, Phone, Shield, Edit, Trash2, UserX } from 'lucide-react'
import * as usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import Card, { CardHeader, CardTitle } from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Modal from '../components/common/Modal'
import Avatar from '../components/common/Avatar'
import Badge from '../components/common/Badge'
import Dropdown from '../components/common/Dropdown'
import EmptyState from '../components/common/EmptyState'
import { SkeletonCard } from '../components/common/Skeleton'

function UserModal({ isOpen, onClose, user, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    designation: '',
    department: '',
    phone: '',
    hourly_rate: '',
    weekly_capacity: '40',
    password: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'employee',
        designation: user.designation || '',
        department: user.department || '',
        phone: user.phone || '',
        hourly_rate: user.hourly_rate?.toString() || '',
        weekly_capacity: user.weekly_capacity?.toString() || '40',
        password: '',
      })
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'employee',
        designation: '',
        department: '',
        phone: '',
        hourly_rate: '',
        weekly_capacity: '40',
        password: '',
      })
    }
  }, [user, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        weekly_capacity: parseInt(formData.weekly_capacity),
      }

      if (!user && !data.password) {
        alert('Password is required for new users')
        setLoading(false)
        return
      }

      if (user) {
        if (!data.password) delete data.password
        await usersApi.updateUser(user.id, data)
      } else {
        await usersApi.createUser(data)
      }

      onSaved()
      onClose()
    } catch (error) {
      console.error('Failed to save user:', error)
      alert(error.response?.data?.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'pm', label: 'Project Manager' },
    { value: 'employee', label: 'Employee' },
  ]

  const departmentOptions = [
    { value: '', label: 'Select department...' },
    { value: 'Production', label: 'Production' },
    { value: 'Post-Production', label: 'Post-Production' },
    { value: 'Creative', label: 'Creative' },
    { value: 'Management', label: 'Management' },
    { value: 'Operations', label: 'Operations' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit Team Member' : 'Add Team Member'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="John Doe"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="john@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={roleOptions}
            required
          />
          <Input
            label="Designation"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            placeholder="Senior Editor"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            options={departmentOptions}
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 234 567 890"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Hourly Rate"
            type="number"
            step="0.01"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            placeholder="50.00"
          />
          <Input
            label="Weekly Capacity (hours)"
            type="number"
            min="0"
            max="168"
            value={formData.weekly_capacity}
            onChange={(e) => setFormData({ ...formData, weekly_capacity: e.target.value })}
            required
          />
        </div>

        <Input
          label={user ? 'New Password (leave blank to keep current)' : 'Password'}
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required={!user}
          placeholder={user ? 'Leave blank to keep current' : 'Enter password'}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {user ? 'Save Changes' : 'Add Member'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function UserCard({ user, onEdit, onDeactivate, canManage }) {
  const roleColors = {
    admin: 'danger',
    pm: 'warning',
    employee: 'primary',
  }

  const roleLabels = {
    admin: 'Admin',
    pm: 'Project Manager',
    employee: 'Employee',
  }

  const dropdownItems = [
    { label: 'Edit', icon: <Edit size={14} />, onClick: () => onEdit(user) },
    { label: 'Deactivate', icon: <UserX size={14} />, onClick: () => onDeactivate(user), variant: 'danger' },
  ]

  return (
    <Card className="relative">
      {canManage && (
        <div className="absolute top-4 right-4">
          <Dropdown items={dropdownItems} align="right">
            <button className="p-1 rounded hover:bg-surface-secondary transition-colors">
              <MoreVertical size={16} className="text-text-muted" />
            </button>
          </Dropdown>
        </div>
      )}

      <div className="flex items-start gap-4">
        <Avatar src={user.avatar_url} name={user.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary truncate">{user.name}</h3>
            {!user.is_active && (
              <Badge variant="muted" size="sm">Inactive</Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">{user.designation || 'No designation'}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={roleColors[user.role]} size="sm">
              <Shield size={10} className="mr-1" />
              {roleLabels[user.role]}
            </Badge>
            {user.department && (
              <Badge variant="muted" size="sm">{user.department}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Mail size={14} />
          <a href={`mailto:${user.email}`} className="hover:text-primary truncate">
            {user.email}
          </a>
        </div>
        {user.phone && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Phone size={14} />
            <a href={`tel:${user.phone}`} className="hover:text-primary">
              {user.phone}
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-text-primary">{user.total_xp || 0}</p>
          <p className="text-xs text-text-secondary">XP</p>
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary">{user.tasks_count || 0}</p>
          <p className="text-xs text-text-secondary">Tasks</p>
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary">{user.level || 1}</p>
          <p className="text-xs text-text-secondary">Level</p>
        </div>
      </div>
    </Card>
  )
}

export default function Team() {
  const { isAdmin } = useAuth()
  const { showToast } = useNotifications()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleDeactivate = async (user) => {
    if (!confirm(`Are you sure you want to deactivate ${user.name}?`)) return

    try {
      await usersApi.updateUser(user.id, { is_active: false })
      showToast(`${user.name} has been deactivated`, 'success')
      fetchUsers()
    } catch (error) {
      showToast('Failed to deactivate user', 'error')
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSaved = () => {
    showToast(editingUser ? 'User updated successfully' : 'User added successfully', 'success')
    fetchUsers()
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admins' },
    { value: 'pm', label: 'Project Managers' },
    { value: 'employee', label: 'Employees' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-10 w-40 skeleton rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Team Management</h1>
        {isAdmin && (
          <Button leftIcon={<Plus size={18} />} onClick={() => setShowModal(true)}>
            Add Member
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={roleFilterOptions}
          className="w-48"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-text-primary">{users.length}</p>
          <p className="text-sm text-text-secondary">Total Members</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-danger">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-sm text-text-secondary">Admins</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-warning">{users.filter(u => u.role === 'pm').length}</p>
          <p className="text-sm text-text-secondary">Project Managers</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary">{users.filter(u => u.role === 'employee').length}</p>
          <p className="text-sm text-text-secondary">Employees</p>
        </Card>
      </div>

      {/* User grid */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No team members found"
          description={search ? 'Try adjusting your search terms' : 'Add team members to get started'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              canManage={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <UserModal
        isOpen={showModal}
        onClose={handleModalClose}
        user={editingUser}
        onSaved={handleSaved}
      />
    </div>
  )
}
