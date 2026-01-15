import client from './client'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const createReviewPortal = async (taskId, data = {}) => {
  const response = await client.post(`/tasks/${taskId}/review-portal`, data)
  return response.data.data
}

// Public endpoints - no auth required
export const getPublicReview = async (token, password = null) => {
  const params = password ? { password } : {}
  const response = await axios.get(`${API_URL}/review/${token}`, { params })
  return response.data.data
}

export const addPublicComment = async (token, data, password = null) => {
  const headers = password ? { 'X-Review-Password': password } : {}
  const response = await axios.post(`${API_URL}/review/${token}/comment`, data, { headers })
  return response.data.data
}

export const approveReview = async (token, versionId, action, password = null) => {
  const headers = password ? { 'X-Review-Password': password } : {}
  const response = await axios.put(
    `${API_URL}/review/${token}/approve`,
    { version_id: versionId, action },
    { headers }
  )
  return response.data
}

// Internal endpoints - auth required
export const getReviewPortal = async (id) => {
  const response = await client.get(`/review-portals/${id}`)
  return response.data.data
}

export const uploadVersion = async (portalId, data) => {
  const response = await client.post(`/review-portals/${portalId}/version`, data)
  return response.data.data
}
