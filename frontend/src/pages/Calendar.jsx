import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Users } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import * as shootsApi from '../api/shoots'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import SlidePane from '../components/common/SlidePane'
import Avatar from '../components/common/Avatar'
import { formatDate, formatTime } from '../utils/formatters'

function ShootDetailPane({ shoot, isOpen, onClose }) {
  if (!shoot) return null

  return (
    <SlidePane
      isOpen={isOpen}
      onClose={onClose}
      title={shoot.title}
      width="500px"
    >
      <div className="space-y-6">
        {/* Project */}
        <div>
          <p className="text-sm text-text-secondary">Project</p>
          <p className="font-medium text-text-primary">{shoot.project_name}</p>
        </div>

        {/* Date and time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-secondary">Date</p>
            <p className="font-medium text-text-primary">
              {formatDate(shoot.shoot_date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Call Time</p>
            <p className="font-medium text-text-primary">
              {shoot.call_time || 'Not set'}
            </p>
          </div>
        </div>

        {/* Location */}
        {shoot.location_name && (
          <div>
            <p className="text-sm text-text-secondary mb-1 flex items-center gap-1">
              <MapPin size={14} />
              Location
            </p>
            <p className="font-medium text-text-primary">{shoot.location_name}</p>
            {shoot.location_address && (
              <p className="text-sm text-text-secondary mt-1">{shoot.location_address}</p>
            )}
          </div>
        )}

        {/* Crew */}
        {shoot.crew?.length > 0 && (
          <div>
            <p className="text-sm text-text-secondary mb-2 flex items-center gap-1">
              <Users size={14} />
              Crew ({shoot.crew.length})
            </p>
            <div className="space-y-2">
              {shoot.crew.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={member.avatar_url}
                      name={member.user_name || member.external_name}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-text-primary">
                        {member.user_name || member.external_name}
                      </p>
                      <p className="text-sm text-text-secondary">{member.role_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.call_time && (
                      <span className="text-xs text-text-muted">{member.call_time}</span>
                    )}
                    <Badge
                      variant={
                        member.status === 'confirmed'
                          ? 'success'
                          : member.status === 'declined'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {member.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {shoot.equipment?.length > 0 && (
          <div>
            <p className="text-sm text-text-secondary mb-2">Equipment</p>
            <div className="space-y-1">
              {shoot.equipment.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm p-2 bg-surface-secondary rounded"
                >
                  <span>{item.equipment_name}</span>
                  <span className="text-text-secondary">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {shoot.notes && (
          <div>
            <p className="text-sm text-text-secondary mb-1">Notes</p>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{shoot.notes}</p>
          </div>
        )}
      </div>
    </SlidePane>
  )
}

export default function Calendar() {
  const { isPM } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shoots, setShoots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShoot, setSelectedShoot] = useState(null)

  useEffect(() => {
    fetchShoots()
  }, [currentDate])

  const fetchShoots = async () => {
    setLoading(true)
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
      const data = await shootsApi.getShoots({ start_date: start, end_date: end })
      setShoots(data)
    } catch (error) {
      console.error('Failed to fetch shoots:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShootClick = async (shoot) => {
    try {
      const data = await shootsApi.getShoot(shoot.id)
      setSelectedShoot(data)
    } catch (error) {
      console.error('Failed to fetch shoot details:', error)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add padding days
  const startDay = monthStart.getDay()
  const paddingDays = startDay === 0 ? 6 : startDay - 1

  const getShootsForDay = (date) => {
    return shoots.filter((s) => isSameDay(new Date(s.shoot_date), date))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Production Calendar</h1>
        {isPM && (
          <Button leftIcon={<Plus size={18} />}>
            Schedule Shoot
          </Button>
        )}
      </div>

      {/* Calendar */}
      <Card padding={false}>
        {/* Month navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-sm font-medium text-text-secondary"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Padding days */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[120px] p-2 border-b border-r border-border bg-surface-secondary" />
          ))}

          {/* Month days */}
          {days.map((day) => {
            const dayShots = getShootsForDay(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toString()}
                className={`min-h-[120px] p-2 border-b border-r border-border ${
                  isToday ? 'bg-primary/5' : ''
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-primary' : 'text-text-primary'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayShots.map((shoot) => (
                    <button
                      key={shoot.id}
                      onClick={() => handleShootClick(shoot)}
                      className="w-full text-left p-1.5 bg-primary/10 text-primary text-xs rounded hover:bg-primary/20 transition-colors truncate"
                    >
                      {shoot.call_time && (
                        <span className="font-medium">{shoot.call_time.slice(0, 5)} </span>
                      )}
                      {shoot.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Shoot detail pane */}
      <ShootDetailPane
        shoot={selectedShoot}
        isOpen={!!selectedShoot}
        onClose={() => setSelectedShoot(null)}
      />
    </div>
  )
}
