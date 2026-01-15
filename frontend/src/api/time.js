import client from './client'

export const getTimeEntries = async (params = {}) => {
  const response = await client.get('/time-entries', { params })
  return response.data.data
}

export const createTimeEntry = async (data) => {
  const response = await client.post('/time-entries', data)
  return response.data.data
}

export const updateTimeEntry = async (id, data) => {
  const response = await client.put(`/time-entries/${id}`, data)
  return response.data.data
}

export const deleteTimeEntry = async (id) => {
  await client.delete(`/time-entries/${id}`)
}

export const approveTimeEntry = async (id) => {
  const response = await client.post(`/time-entries/${id}/approve`)
  return response.data
}

export const getTimer = async () => {
  const response = await client.get('/timer')
  return response.data.data
}

export const startTimer = async (taskId) => {
  const response = await client.post('/timer/start', { task_id: taskId })
  return response.data
}

export const stopTimer = async () => {
  const response = await client.post('/timer/stop')
  return response.data.data
}

export const getTimesheet = async (params = {}) => {
  const response = await client.get('/timesheet', { params })
  return response.data.data
}
