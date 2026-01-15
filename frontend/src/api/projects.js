import client from './client'

export const getProjects = async (status = null) => {
  const params = status ? { status } : {}
  const response = await client.get('/projects', { params })
  return response.data.data
}

export const getProject = async (id) => {
  const response = await client.get(`/projects/${id}`)
  return response.data.data
}

export const createProject = async (data) => {
  const response = await client.post('/projects', data)
  return response.data.data
}

export const updateProject = async (id, data) => {
  const response = await client.put(`/projects/${id}`, data)
  return response.data.data
}

export const deleteProject = async (id) => {
  await client.delete(`/projects/${id}`)
}

export const getProjectMembers = async (projectId) => {
  const response = await client.get(`/projects/${projectId}/members`)
  return response.data.data
}

export const addProjectMember = async (projectId, userId, role = 'member') => {
  const response = await client.post(`/projects/${projectId}/members`, {
    user_id: userId,
    role,
  })
  return response.data.data
}

export const removeProjectMember = async (projectId, userId) => {
  await client.delete(`/projects/${projectId}/members/${userId}`)
}

export const getProjectColumns = async (projectId) => {
  const response = await client.get(`/projects/${projectId}/columns`)
  return response.data.data
}

export const createColumn = async (projectId, data) => {
  const response = await client.post(`/projects/${projectId}/columns`, data)
  return response.data.data
}

export const getKanbanBoard = async (projectId) => {
  const response = await client.get(`/projects/${projectId}/kanban`)
  return response.data.data
}
