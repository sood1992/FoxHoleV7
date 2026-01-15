import client from './client'

export const getUsers = async () => {
  const response = await client.get('/users')
  return response.data.data
}

export const getUser = async (id) => {
  const response = await client.get(`/users/${id}`)
  return response.data.data
}

export const createUser = async (data) => {
  const response = await client.post('/users', data)
  return response.data.data
}

export const updateUser = async (id, data) => {
  const response = await client.put(`/users/${id}`, data)
  return response.data.data
}

export const deleteUser = async (id) => {
  await client.delete(`/users/${id}`)
}

// Profile functions (for current user)
export const updateProfile = async (data) => {
  const response = await client.put('/me/profile', data)
  return response.data.data
}

export const changePassword = async (data) => {
  const response = await client.put('/me/password', data)
  return response.data.data
}

export const getPreferences = async () => {
  const response = await client.get('/me/preferences')
  return response.data.data
}

export const updatePreferences = async (data) => {
  const response = await client.put('/me/preferences', data)
  return response.data.data
}

// Stats and gamification
export const getMyStats = async () => {
  const response = await client.get('/me/stats')
  return response.data.data
}

export const getMyXPHistory = async () => {
  const response = await client.get('/me/xp')
  return response.data.data
}

export const getMyBadges = async () => {
  const response = await client.get('/me/badges')
  return response.data.data
}

export const getUserXP = async (id) => {
  const response = await client.get(`/users/${id}/xp`)
  return response.data.data
}

export const getUserBadges = async (id) => {
  const response = await client.get(`/users/${id}/badges`)
  return response.data.data
}

export const getLeaderboard = async () => {
  const response = await client.get('/leaderboard')
  return response.data.data
}
