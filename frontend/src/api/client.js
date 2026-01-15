import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Create axios instance
const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
let accessToken = null
let refreshToken = null

export const setTokens = (access, refresh) => {
  accessToken = access
  refreshToken = refresh
  if (refresh) {
    localStorage.setItem('refreshToken', refresh)
  }
}

export const clearTokens = () => {
  accessToken = null
  refreshToken = null
  localStorage.removeItem('refreshToken')
}

export const getRefreshToken = () => {
  return refreshToken || localStorage.getItem('refreshToken')
}

// Request interceptor - add auth header
client.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const storedRefreshToken = getRefreshToken()

      if (storedRefreshToken) {
        try {
          // Try to refresh token
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: storedRefreshToken,
          })

          const { access_token, refresh_token } = response.data.data
          setTokens(access_token, refresh_token)

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return client(originalRequest)
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    return Promise.reject(error)
  }
)

export default client
