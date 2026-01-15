import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as timeApi from '../api/time'
import { useAuth } from './AuthContext'

const TimerContext = createContext(null)

export function TimerProvider({ children }) {
  const { user } = useAuth()
  const [activeTimer, setActiveTimer] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  // Fetch active timer on mount
  const fetchTimer = useCallback(async () => {
    if (!user) return

    try {
      const timer = await timeApi.getTimer()
      if (timer) {
        setActiveTimer(timer)
        setElapsedSeconds(timer.elapsed_seconds || 0)
      } else {
        setActiveTimer(null)
        setElapsedSeconds(0)
      }
    } catch (error) {
      console.error('Failed to fetch timer:', error)
    }
  }, [user])

  useEffect(() => {
    fetchTimer()
  }, [fetchTimer])

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [activeTimer])

  const startTimer = useCallback(async (taskId) => {
    setLoading(true)
    try {
      await timeApi.startTimer(taskId)
      await fetchTimer()
    } finally {
      setLoading(false)
    }
  }, [fetchTimer])

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return null

    setLoading(true)
    try {
      const entry = await timeApi.stopTimer()
      setActiveTimer(null)
      setElapsedSeconds(0)
      return entry
    } finally {
      setLoading(false)
    }
  }, [activeTimer])

  // Format elapsed time as HH:MM:SS
  const formattedTime = useCallback(() => {
    const hours = Math.floor(elapsedSeconds / 3600)
    const minutes = Math.floor((elapsedSeconds % 3600) / 60)
    const seconds = elapsedSeconds % 60

    return [hours, minutes, seconds]
      .map((v) => v.toString().padStart(2, '0'))
      .join(':')
  }, [elapsedSeconds])

  const value = {
    activeTimer,
    elapsedSeconds,
    formattedTime: formattedTime(),
    loading,
    startTimer,
    stopTimer,
    isRunning: !!activeTimer,
  }

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}
