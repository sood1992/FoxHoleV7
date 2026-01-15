import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as notificationApi from '../api/notifications'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Toast notifications (in-app alerts)
  const [toasts, setToasts] = useState([])

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await notificationApi.getNotifications()
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user, fetchNotifications])

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  // Toast functions
  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    toasts,
    showToast,
    dismissToast,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
