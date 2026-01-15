import { useState, useEffect } from 'react'
import { Zap, Award, TrendingUp, Star } from 'lucide-react'
import * as usersApi from '../../api/users'
import Card from '../common/Card'
import Badge from '../common/Badge'
import ProgressBar from '../common/ProgressBar'

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Rookie' },
  { level: 2, xp: 100, title: 'Apprentice' },
  { level: 3, xp: 250, title: 'Contributor' },
  { level: 4, xp: 500, title: 'Skilled' },
  { level: 5, xp: 1000, title: 'Expert' },
  { level: 6, xp: 2000, title: 'Master' },
  { level: 7, xp: 3500, title: 'Grandmaster' },
  { level: 8, xp: 5000, title: 'Legend' },
  { level: 9, xp: 7500, title: 'Mythic' },
  { level: 10, xp: 10000, title: 'Transcendent' },
]

function getLevelInfo(xp) {
  let currentLevel = LEVEL_THRESHOLDS[0]
  let nextLevel = LEVEL_THRESHOLDS[1]

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      currentLevel = LEVEL_THRESHOLDS[i]
      nextLevel = LEVEL_THRESHOLDS[i + 1] || null
    }
  }

  const xpInLevel = xp - currentLevel.xp
  const xpToNextLevel = nextLevel ? nextLevel.xp - currentLevel.xp : 0
  const progress = nextLevel ? Math.round((xpInLevel / xpToNextLevel) * 100) : 100

  return { currentLevel, nextLevel, xpInLevel, xpToNextLevel, progress }
}

export default function XPProgress({ compact = false }) {
  const [stats, setStats] = useState(null)
  const [recentXP, setRecentXP] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchXPData()
  }, [])

  const fetchXPData = async () => {
    try {
      const [statsData, xpData, badgesData] = await Promise.all([
        usersApi.getMyStats(),
        usersApi.getMyXPHistory(),
        usersApi.getMyBadges(),
      ])
      setStats(statsData)
      setRecentXP(xpData?.slice(0, 5) || [])
      setBadges(badgesData || [])
    } catch (error) {
      console.error('Failed to fetch XP data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-secondary rounded w-1/3" />
          <div className="h-4 bg-surface-secondary rounded w-full" />
          <div className="h-20 bg-surface-secondary rounded" />
        </div>
      </Card>
    )
  }

  if (!stats) return null

  const { currentLevel, nextLevel, xpInLevel, xpToNextLevel, progress } = getLevelInfo(stats.total_xp || 0)

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Star size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Level {currentLevel.level}</p>
            <p className="text-sm font-bold text-text-primary">{currentLevel.title}</p>
          </div>
        </div>
        <div className="flex-1 min-w-[100px]">
          <ProgressBar value={progress} size="sm" />
        </div>
        <span className="text-xs text-text-muted">{stats.total_xp} XP</span>
      </div>
    )
  }

  return (
    <Card>
      {/* Level header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white font-bold text-lg">{currentLevel.level}</span>
          </div>
          <div>
            <h3 className="font-bold text-text-primary">{currentLevel.title}</h3>
            <p className="text-sm text-text-secondary">Level {currentLevel.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{stats.total_xp}</p>
          <p className="text-xs text-text-secondary">Total XP</p>
        </div>
      </div>

      {/* Progress to next level */}
      {nextLevel && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Progress to Level {nextLevel.level}</span>
            <span className="text-sm font-medium text-text-primary">
              {xpInLevel} / {xpToNextLevel} XP
            </span>
          </div>
          <ProgressBar value={progress} variant="primary" />
          <p className="text-xs text-text-muted mt-1">
            {xpToNextLevel - xpInLevel} XP needed to become {nextLevel.title}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface-secondary rounded-lg p-3 text-center">
          <Zap size={20} className="text-warning mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">{stats.tasks_completed || 0}</p>
          <p className="text-xs text-text-secondary">Tasks Done</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-3 text-center">
          <TrendingUp size={20} className="text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">{stats.current_streak || 0}</p>
          <p className="text-xs text-text-secondary">Day Streak</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-3 text-center">
          <Award size={20} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">{badges.length}</p>
          <p className="text-xs text-text-secondary">Badges</p>
        </div>
      </div>

      {/* Recent XP */}
      {recentXP.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">Recent XP Earned</h4>
          <div className="space-y-2">
            {recentXP.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-warning" />
                  <span className="text-sm text-text-primary">{entry.description}</span>
                </div>
                <Badge variant="success" size="sm">+{entry.amount} XP</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-text-secondary mb-2">Earned Badges</h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 bg-surface-secondary rounded-full px-3 py-1.5"
                title={badge.description}
              >
                <span className="text-lg">{badge.icon}</span>
                <span className="text-sm font-medium text-text-primary">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
