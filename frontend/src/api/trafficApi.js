// Smart Traffic API Client
// Centralized API utility for backend communication

// Use relative URL — Vite proxy forwards /api → http://localhost:5000
const API_BASE_URL = '/api'

// Get auth token from localStorage if available
const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Generic request handler
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    credentials: 'include',
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    throw error
  }
}

// ============ AUTH ENDPOINTS ============
export const authAPI = {
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  getMe: () => request('/auth/me'),

  updateProfile: (data) => request('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
}

// ============ INCIDENTS ENDPOINTS ============
export const incidentsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return request(`/incidents${queryString ? `?${queryString}` : ''}`)
  },

  getById: (id) => request(`/incidents/${id}`),

  create: (incidentData) => request('/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData),
  }),

  update: (id, data) => request(`/incidents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => request(`/incidents/${id}`, {
    method: 'DELETE',
  }),
}

// ============ TRAFFIC ENDPOINTS ============
export const trafficAPI = {
  getHeatmap: () => request('/traffic/heatmap'),

  predict: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return request(`/traffic/predict${queryString ? `?${queryString}` : ''}`)
  },

  getPeakAnalysis: (location) => request(`/traffic/peak-analysis${location ? `?location=${encodeURIComponent(location)}` : ''}`),
}

// ============ ROUTES ENDPOINTS ============
export const routesAPI = {
  suggest: (routeData) => request('/routes/suggest', {
    method: 'POST',
    body: JSON.stringify(routeData),
  }),

  getHistory: () => request('/routes/history'),
}

// ============ ALERTS ENDPOINTS ============
export const alertsAPI = {
  getAll: () => request('/alerts'),
}

// ============ CHAT ENDPOINTS ============
export const chatAPI = {
  send: (message) => request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  getHistory: () => request('/chat/history'),
}

// ============ ADMIN ENDPOINTS ============
export const adminAPI = {
  getUsers: () => request('/admin/users'),

  getStats: () => request('/admin/stats'),

  deleteUser: (id) => request(`/admin/users/${id}`, {
    method: 'DELETE',
  }),
}

// Export default object for convenience
export default {
  auth: authAPI,
  incidents: incidentsAPI,
  traffic: trafficAPI,
  routes: routesAPI,
  alerts: alertsAPI,
  chat: chatAPI,
  admin: adminAPI,
}
