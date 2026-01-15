import client from './client'

export const getShoots = async (params = {}) => {
  const response = await client.get('/shoots', { params })
  return response.data.data
}

export const getShoot = async (id) => {
  const response = await client.get(`/shoots/${id}`)
  return response.data.data
}

export const createShoot = async (data) => {
  const response = await client.post('/shoots', data)
  return response.data.data
}

export const updateShoot = async (id, data) => {
  const response = await client.put(`/shoots/${id}`, data)
  return response.data.data
}

export const deleteShoot = async (id) => {
  await client.delete(`/shoots/${id}`)
}

export const addCrew = async (shootId, data) => {
  const response = await client.post(`/shoots/${shootId}/crew`, data)
  return response.data.data
}

export const updateCrewStatus = async (shootId, crewId, status) => {
  const response = await client.put(`/shoots/${shootId}/crew/${crewId}/status`, { status })
  return response.data
}

export const addEquipment = async (shootId, data) => {
  const response = await client.post(`/shoots/${shootId}/equipment`, data)
  return response.data.data
}

export const removeEquipment = async (shootId, equipmentId) => {
  await client.delete(`/shoots/${shootId}/equipment/${equipmentId}`)
}

export const sendNotifications = async (shootId) => {
  const response = await client.post(`/shoots/${shootId}/notify`)
  return response.data
}
