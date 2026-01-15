import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Users, Calendar, DollarSign, Target, Activity } from 'lucide-react'
import * as analyticsApi from '../api/analytics'
import { useAuth } from '../context/AuthContext'
import Card, { CardHeader, CardTitle } from '../components/common/Card'
import Select from '../components/common/Select'
import ProgressBar from '../components/common/ProgressBar'
import Avatar from '../components/common/Avatar'
import Badge from '../components/common/Badge'
import { Skeleton, SkeletonCard } from '../components/common/Skeleton'
import { formatHours, formatCurrency } from '../utils/formatters'

function StatCard({ icon: Icon, label, value, subValue, color = 'primary', trend }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {subValue && <p className="text-xs text-text-muted mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}/10`}>
          <Icon size={24} className={`text-${color}`} />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend > 0 ? 'text-success' : 'text-danger'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
    </Card>
  )
}

function CapacityHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No capacity data available
      </div>
    )
  }

  const getHeatColor = (utilization) => {
    if (utilization >= 100) return 'bg-danger'
    if (utilization >= 80) return 'bg-warning'
    if (utilization >= 50) return 'bg-success'
    return 'bg-info/50'
  }

  return (
    <div className="space-y-3">
      {data.map((member) => (
        <div key={member.id} className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-40 shrink-0">
            <Avatar src={member.avatar_url} name={member.name} size="sm" />
            <span className="text-sm font-medium text-text-primary truncate">{member.name}</span>
          </div>
          <div className="flex-1">
            <div className="flex gap-1">
              {member.weekly_capacity?.map((day, idx) => (
                <div
                  key={idx}
                  className={`h-8 flex-1 rounded ${getHeatColor(day.utilization)}`}
                  title={`${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][idx]}: ${day.hours}h (${day.utilization}%)`}
                />
              ))}
            </div>
          </div>
          <div className="w-20 text-right">
            <span className="text-sm font-medium text-text-primary">
              {member.total_hours}h
            </span>
            <span className="text-xs text-text-muted"> / {member.capacity}h</span>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-4 pt-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-info/50" /> &lt;50%
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-success" /> 50-80%
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning" /> 80-100%
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-danger" /> &gt;100%
        </div>
      </div>
    </div>
  )
}

function ProjectROI({ projects }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No project data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project.id} className="p-4 bg-surface-secondary rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-text-primary">{project.name}</h4>
              <p className="text-xs text-text-secondary">{project.client_name}</p>
            </div>
            <Badge
              variant={project.roi >= 0 ? 'success' : 'danger'}
              size="sm"
            >
              {project.roi >= 0 ? '+' : ''}{project.roi}% ROI
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Budget</p>
              <p className="font-medium text-text-primary">{formatCurrency(project.budget)}</p>
            </div>
            <div>
              <p className="text-text-muted">Cost</p>
              <p className="font-medium text-text-primary">{formatCurrency(project.cost)}</p>
            </div>
            <div>
              <p className="text-text-muted">Hours</p>
              <p className="font-medium text-text-primary">{formatHours(project.hours)}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary">Progress</span>
              <span className="text-text-primary">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} size="sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamPerformance({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No performance data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 text-text-secondary font-medium">Team Member</th>
            <th className="text-right py-3 text-text-secondary font-medium">Tasks</th>
            <th className="text-right py-3 text-text-secondary font-medium">Hours</th>
            <th className="text-right py-3 text-text-secondary font-medium">Efficiency</th>
            <th className="text-right py-3 text-text-secondary font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          {data.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <Avatar src={member.avatar_url} name={member.name} size="sm" />
                  <div>
                    <p className="font-medium text-text-primary">{member.name}</p>
                    <p className="text-xs text-text-muted">{member.designation}</p>
                  </div>
                </div>
              </td>
              <td className="text-right text-text-primary">{member.tasks_completed}</td>
              <td className="text-right text-text-primary">{formatHours(member.hours_logged)}</td>
              <td className="text-right">
                <Badge
                  variant={member.efficiency >= 100 ? 'success' : member.efficiency >= 80 ? 'warning' : 'danger'}
                  size="sm"
                >
                  {member.efficiency}%
                </Badge>
              </td>
              <td className="text-right text-primary font-medium">{member.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Analytics() {
  const { isAdmin, isPM } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week')
  const [dashboard, setDashboard] = useState(null)
  const [capacity, setCapacity] = useState([])
  const [projectROI, setProjectROI] = useState([])
  const [teamPerformance, setTeamPerformance] = useState([])

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const [dashboardData, capacityData, roiData, performanceData] = await Promise.all([
        analyticsApi.getDashboard({ range: dateRange }),
        analyticsApi.getCapacity({ range: dateRange }),
        analyticsApi.getProjectROI({ range: dateRange }),
        analyticsApi.getTeamPerformance({ range: dateRange }),
      ])
      setDashboard(dashboardData)
      setCapacity(capacityData)
      setProjectROI(roiData)
      setTeamPerformance(performanceData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const dateRangeOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-48" />
          <Skeleton variant="button" className="w-40" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Analytics & Reports</h1>
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          options={dateRangeOptions}
          className="w-40"
        />
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Active Projects"
          value={dashboard?.active_projects || 0}
          subValue={`${dashboard?.completed_projects || 0} completed`}
          color="primary"
        />
        <StatCard
          icon={Target}
          label="Tasks Completed"
          value={dashboard?.tasks_completed || 0}
          subValue={`${dashboard?.tasks_in_progress || 0} in progress`}
          color="success"
          trend={dashboard?.tasks_trend}
        />
        <StatCard
          icon={Clock}
          label="Hours Logged"
          value={formatHours(dashboard?.total_hours || 0)}
          subValue={`${formatHours(dashboard?.billable_hours || 0)} billable`}
          color="warning"
          trend={dashboard?.hours_trend}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(dashboard?.revenue || 0)}
          subValue={`${formatCurrency(dashboard?.cost || 0)} cost`}
          color="info"
          trend={dashboard?.revenue_trend}
        />
      </div>

      {/* Capacity Heatmap */}
      {(isAdmin || isPM) && (
        <Card>
          <CardHeader>
            <CardTitle>Team Capacity Heatmap</CardTitle>
          </CardHeader>
          <CapacityHeatmap data={capacity} />
        </Card>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project ROI */}
        {(isAdmin || isPM) && (
          <Card>
            <CardHeader>
              <CardTitle>Project ROI Analysis</CardTitle>
            </CardHeader>
            <ProjectROI projects={projectROI} />
          </Card>
        )}

        {/* Team Performance */}
        {(isAdmin || isPM) && (
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <TeamPerformance data={teamPerformance} />
          </Card>
        )}
      </div>

      {/* Utilization Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Utilization Trend</CardTitle>
        </CardHeader>
        <div className="h-64 flex items-center justify-center text-text-secondary">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
            <p>Chart visualization would go here</p>
            <p className="text-sm text-text-muted">Integrate with Chart.js or Recharts for full visualization</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
