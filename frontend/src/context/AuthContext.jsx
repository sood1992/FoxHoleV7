import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../api/auth'
import { getRefreshToken, clearTokens } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          await authApi.refreshSession()
          const currentUser = await authApi.getCurrentUser()
          setUser(currentUser)
        } catch (error) {
          console.error('Session restore failed:', error)
          clearTokens()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const loggedInUser = await authApi.login(email, password)
      setUser(loggedInUser)
      return loggedInUser
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      console.error('Failed to refresh user:', error)
      throw error
    }
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAdmin: user?.role === 'admin',
    isPM: user?.role === 'admin' || user?.role === 'pm',
    isEmployee: user?.role === 'employee',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
