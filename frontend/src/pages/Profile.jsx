import { useState, useEffect } from 'react'
import { User, Mail, Phone, Lock, Bell, Moon, Save, Camera } from 'lucide-react'
import * as usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import Card, { CardHeader, CardTitle } from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Avatar from '../components/common/Avatar'
import Badge from '../components/common/Badge'
import XPProgress from '../components/gamification/XPProgress'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
  })
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    weekly_digest: true,
    dark_mode: false,
  })

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
        department: user.department || '',
      })
    }
    fetchPreferences()
  }, [user])

  const fetchPreferences = async () => {
    try {
      const data = await usersApi.getPreferences()
      if (data) setPreferences(data)
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await usersApi.updateProfile(profile)
      refreshUser()
      showToast('Profile updated successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (passwords.new_password !== passwords.confirm_password) {
      showToast('Passwords do not match', 'error')
      return
    }

    if (passwords.new_password.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }

    setLoading(true)

    try {
      await usersApi.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      })
      setPasswords({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      showToast('Password changed successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await usersApi.updatePreferences(preferences)
      showToast('Preferences saved', 'success')
    } catch (error) {
      showToast('Failed to save preferences', 'error')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'gamification', label: 'Achievements', icon: Moon },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Profile & Settings</h1>
      </div>

      {/* Profile header card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary to-secondary" />
        <div className="relative pt-12 pb-4">
          <div className="flex items-end gap-4">
            <div className="relative">
              <Avatar src={user?.avatar_url} name={user?.name} size="xl" />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-surface rounded-full border border-border flex items-center justify-center hover:bg-surface-secondary transition-colors">
                <Camera size={14} className="text-text-secondary" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-text-primary">{user?.name}</h2>
              <p className="text-text-secondary">{user?.designation || 'Team Member'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="primary">{user?.role?.toUpperCase()}</Badge>
                {user?.department && <Badge variant="muted">{user?.department}</Badge>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Level {user?.level || 1}</p>
              <p className="text-2xl font-bold text-primary">{user?.total_xp || 0} XP</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                leftIcon={<User size={16} />}
                required
              />
              <Input
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                leftIcon={<Mail size={16} />}
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                leftIcon={<Phone size={16} />}
              />
              <Input
                label="Designation"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={loading} leftIcon={<Save size={16} />}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <Input
              label="Current Password"
              type="password"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              required
              hint="Must be at least 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              required
            />
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={loading} leftIcon={<Lock size={16} />}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <form onSubmit={handlePreferencesSubmit} className="space-y-4">
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-text-primary">Email Notifications</p>
                  <p className="text-sm text-text-secondary">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-text-primary">Push Notifications</p>
                  <p className="text-sm text-text-secondary">Receive browser push notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.push_notifications}
                  onChange={(e) => setPreferences({ ...preferences, push_notifications: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-text-primary">Weekly Digest</p>
                  <p className="text-sm text-text-secondary">Receive weekly summary emails</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.weekly_digest}
                  onChange={(e) => setPreferences({ ...preferences, weekly_digest: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-text-primary">Dark Mode</p>
                  <p className="text-sm text-text-secondary">Use dark theme (coming soon)</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.dark_mode}
                  onChange={(e) => setPreferences({ ...preferences, dark_mode: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                  disabled
                />
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" loading={loading} leftIcon={<Save size={16} />}>
                Save Preferences
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'gamification' && (
        <div className="space-y-6">
          <XPProgress />
        </div>
      )}
    </div>
  )
}
