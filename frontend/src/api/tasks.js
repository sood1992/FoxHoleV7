import client from './client'

export const getProjectTasks = async (projectId) => {
  const response = await client.get(`/projects/${projectId}/tasks`)
  return response.data.data
}

export const getTask = async (id) => {
  const response = await client.get(`/tasks/${id}`)
  return response.data.data
}

export const createTask = async (data) => {
  const response = await client.post('/tasks', data)
  return response.data.data
}

export const updateTask = async (id, data) => {
  const response = await client.put(`/tasks/${id}`, data)
  return response.data.data
}

export const deleteTask = async (id) => {
  await client.delete(`/tasks/${id}`)
}

export const moveTask = async (id, columnId, position) => {
  const response = await client.put(`/tasks/${id}/move`, {
    column_id: columnId,
    position,
  })
  return response.data.data
}

export const updateTaskStatus = async (id, status) => {
  const response = await client.put(`/tasks/${id}/status`, { status })
  return response.data.data
}

export const getMyTasks = async () => {
  const response = await client.get('/my-tasks')
  return response.data.data
}

// Dependencies
export const getTaskDependencies = async (taskId) => {
  const response = await client.get(`/tasks/${taskId}/dependencies`)
  return response.data.data
}

export const addDependency = async (taskId, predecessorId, type = 'FS') => {
  const response = await client.post(`/tasks/${taskId}/dependencies`, {
    predecessor_id: predecessorId,
    type,
  })
  return response.data.data
}

export const removeDependency = async (dependencyId) => {
  await client.delete(`/dependencies/${dependencyId}`)
}

// Comments
export const getTaskComments = async (taskId) => {
  const response = await client.get(`/tasks/${taskId}/comments`)
  return response.data.data
}

export const addComment = async (taskId, content, parentId = null) => {
  const response = await client.post(`/tasks/${taskId}/comments`, {
    content,
    parent_comment_id: parentId,
  })
  return response.data.data
}

export const updateComment = async (commentId, content) => {
  const response = await client.put(`/comments/${commentId}`, { content })
  return response.data.data
}

export const deleteComment = async (commentId) => {
  await client.delete(`/comments/${commentId}`)
}
