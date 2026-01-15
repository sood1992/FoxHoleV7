import client from './client'

export const getNotifications = async (params = {}) => {
  const response = await client.get('/notifications', { params })
  return response.data.data
}

export const markAsRead = async (id) => {
  const response = await client.put(`/notifications/${id}/read`)
  return response.data
}

export const markAllAsRead = async () => {
  const response = await client.put('/notifications/read-all')
  return response.data
}
