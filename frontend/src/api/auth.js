import client, { setTokens, clearTokens, getRefreshToken } from './client'

export const login = async (email, password) => {
  const response = await client.post('/auth/login', { email, password })
  const { user, access_token, refresh_token } = response.data.data
  setTokens(access_token, refresh_token)
  return user
}

export const logout = async () => {
  try {
    await client.post('/auth/logout')
  } catch (error) {
    // Ignore errors on logout
  }
  clearTokens()
}

export const refreshSession = async () => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const response = await client.post('/auth/refresh', {
    refresh_token: refreshToken,
  })

  const { access_token, refresh_token } = response.data.data
  setTokens(access_token, refresh_token)
  return true
}

export const getCurrentUser = async () => {
  const response = await client.get('/auth/me')
  return response.data.data
}

export const changePassword = async (currentPassword, newPassword) => {
  const response = await client.put('/auth/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return response.data
}
