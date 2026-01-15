import { useState, useEffect } from 'react'
import { Clock, Plus, Calendar, Check, X } from 'lucide-react'
import * as timeApi from '../api/time'
import * as tasksApi from '../api/tasks'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'
import { useNotifications } from '../context/NotificationContext'
import Card, { CardHeader, CardTitle } from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Modal from '../components/common/Modal'
import Badge from '../components/common/Badge'
import EmptyState from '../components/common/EmptyState'
import { formatDate, formatHours } from '../utils/formatters'

function TimeEntryModal({ isOpen, onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [formData, setFormData] = useState({
    task_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    notes: '',
    is_billable: true,
  })

  useEffect(() => {
    if (isOpen) {
      fetchTasks()
    }
  }, [isOpen])

  const fetchTasks = async () => {
    try {
      const data = await tasksApi.getMyTasks()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await timeApi.createTimeEntry({
        ...formData,
        task_id: parseInt(formData.task_id),
        hours: parseFloat(formData.hours),
      })
      onCreated()
      onClose()
      setFormData({
        task_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        notes: '',
        is_billable: true,
      })
    } catch (error) {
      console.error('Failed to create time entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const taskOptions = tasks.map((t) => ({
    value: t.id.toString(),
    label: `${t.title} (${t.project_name})`,
  }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Time">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Task"
          value={formData.task_id}
          onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
          options={taskOptions}
          required
          placeholder="Select a task..."
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={formData.hours}
            onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
            required
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="input min-h-[80px]"
            placeholder="What did you work on?"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_billable"
            checked={formData.is_billable}
            onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="is_billable" className="text-sm text-text-primary">
            Billable
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Log Time
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TimeTracking() {
  const { user, isPM } = useAuth()
  const { isRunning, formattedTime, activeTimer, stopTimer } = useTimer()
  const { showToast } = useNotifications()
  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    fetchTimesheet()
  }, [weekOffset])

  const fetchTimesheet = async () => {
    setLoading(true)
    try {
      // Calculate week dates
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const data = await timeApi.getTimesheet({
        start_date: monday.toISOString().split('T')[0],
        end_date: sunday.toISOString().split('T')[0],
      })
      setTimesheet(data)
    } catch (error) {
      console.error('Failed to fetch timesheet:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStopTimer = async () => {
    try {
      const entry = await stopTimer()
      showToast(`Logged ${formatHours(entry.hours)} to "${activeTimer.task_title}"`, 'success')
      fetchTimesheet()
    } catch (error) {
      showToast('Failed to stop timer', 'error')
    }
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Time Tracking</h1>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Log Time
        </Button>
      </div>

      {/* Active timer */}
      {isRunning && (
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock size={24} className="text-primary animate-pulse-soft" />
              </div>
              <div>
                <p className="font-bold text-2xl text-text-primary font-mono">
                  {formattedTime}
                </p>
                <p className="text-sm text-text-secondary">
                  {activeTimer?.task_title} | {activeTimer?.project_name}
                </p>
              </div>
            </div>
            <Button onClick={handleStopTimer} variant="danger">
              Stop Timer
            </Button>
          </div>
        </Card>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setWeekOffset(weekOffset - 1)}
        >
          Previous Week
        </Button>
        <span className="text-text-primary font-medium">
          {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} weeks ${weekOffset > 0 ? 'ahead' : 'ago'}`}
        </span>
        <Button
          variant="secondary"
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 0}
        >
          Next Week
        </Button>
      </div>

      {/* Summary */}
      {timesheet && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-text-primary">
              {formatHours(timesheet.summary?.total_hours || 0)}
            </p>
            <p className="text-sm text-text-secondary">Total Hours</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-success">
              {formatHours(timesheet.summary?.billable_hours || 0)}
            </p>
            <p className="text-sm text-text-secondary">Billable Hours</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-text-muted">
              {formatHours(timesheet.summary?.non_billable_hours || 0)}
            </p>
            <p className="text-sm text-text-secondary">Non-Billable</p>
          </Card>
        </div>
      )}

      {/* Entries by date */}
      {timesheet && (
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>

          {timesheet.entries?.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No time entries"
              description="Start tracking your time to see entries here"
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(timesheet.by_date || {}).map(([date, data]) => (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2 py-2 border-b border-border">
                    <span className="font-medium text-text-primary">
                      {formatDate(date, 'EEEE, MMM d')}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {formatHours(data.total)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-text-primary">
                            {entry.task_title}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {entry.project_name}
                            {entry.notes && ` - ${entry.notes}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {entry.is_billable ? (
                            <Badge variant="success" size="sm">Billable</Badge>
                          ) : (
                            <Badge variant="muted" size="sm">Non-billable</Badge>
                          )}
                          {entry.is_approved ? (
                            <Check size={16} className="text-success" />
                          ) : null}
                          <span className="font-medium text-text-primary">
                            {formatHours(entry.hours)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add time modal */}
      <TimeEntryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchTimesheet}
      />
    </div>
  )
}
