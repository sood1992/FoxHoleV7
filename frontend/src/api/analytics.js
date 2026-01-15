import client from './client'

export const getAdminDashboard = async () => {
  const response = await client.get('/dashboard/admin')
  return response.data.data
}

export const getPMDashboard = async () => {
  const response = await client.get('/dashboard/pm')
  return response.data.data
}

export const getEmployeeDashboard = async () => {
  const response = await client.get('/dashboard/employee')
  return response.data.data
}

export const getDashboard = async (params = {}) => {
  const response = await client.get('/analytics/dashboard', { params })
  return response.data.data
}

export const getUtilization = async (params = {}) => {
  const response = await client.get('/analytics/utilization', { params })
  return response.data.data
}

export const getROI = async () => {
  const response = await client.get('/analytics/roi')
  return response.data.data
}

export const getProjectROI = async (params = {}) => {
  const response = await client.get('/analytics/projects-roi', { params })
  return response.data.data
}

export const getCapacity = async (params = {}) => {
  const response = await client.get('/analytics/capacity', { params })
  return response.data.data
}

export const getTeamPerformance = async (params = {}) => {
  const response = await client.get('/analytics/team-performance', { params })
  return response.data.data
}
