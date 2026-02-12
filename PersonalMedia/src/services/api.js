import csrfService from './csrfService'

const API_BASE_URL = 'http://localhost:3001/api'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // Get JWT token from localStorage
  getAuthToken() {
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          return parsed.state?.token || null
        } catch (e) {
          console.error('Error parsing auth storage:', e)
          return null
        }
      }
    }
    return null
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    // Get CSRF token
    let csrfToken = null
    try {
      csrfToken = await csrfService.getToken()
    } catch (error) {
      console.error('CSRF token error:', error)
    }

    // Get JWT token
    const authToken = this.getAuthToken()

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // Add CSRF token to headers
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    // Add JWT token to headers
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const config = {
      ...options,
      headers,
      credentials: 'include' // Include cookies
    }

    try {
      const response = await fetch(url, config)

      // Handle CSRF token error
      if (response.status === 403 && response.headers.get('X-CSRF-ERROR')) {
        // Reset token and retry
        csrfService.resetToken()
        csrfToken = await csrfService.getToken()
        config.headers['X-CSRF-Token'] = csrfToken
        
        const retryResponse = await fetch(url, config)
        if (!retryResponse.ok) {
          const error = await retryResponse.json()
          throw new Error(error.error || `HTTP error! status: ${retryResponse.status}`)
        }
        return await retryResponse.json()
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Media API
  async getAllMedia(type = null) {
    const query = type && type !== 'all' ? `?type=${type}` : ''
    return this.request(`/media${query}`)
  }

  async getMediaById(id) {
    return this.request(`/media/${id}`)
  }

  async uploadMedia(files) {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const csrfToken = await csrfService.getToken()
      const authToken = this.getAuthToken()
      const headers = {
        'X-CSRF-Token': csrfToken
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }
      
      const response = await fetch(`${this.baseUrl}/media/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  }

  async deleteMedia(id) {
    return this.request(`/media/${id}`, { method: 'DELETE' })
  }

  // Likes API
  async toggleLike(id, user) {
    return this.request(`/media/${id}/like`, {
      method: 'POST',
      body: JSON.stringify({ user })
    })
  }

  async getLikes(id) {
    return this.request(`/media/${id}/likes`)
  }

  // Comments API
  async addComment(id, content, author, replyTo = null) {
    return this.request(`/media/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, author, replyTo })
    })
  }

  async getComments(id) {
    return this.request(`/media/${id}/comments`)
  }

  async deleteComment(id, commentId, parentId = null) {
    const query = parentId ? `?parentId=${parentId}` : ''
    return this.request(`/media/${id}/comments/${commentId}${query}`, {
      method: 'DELETE'
    })
  }

  // Favorites API
  async toggleFavorite(id, user) {
    return this.request(`/media/${id}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ user })
    })
  }

  async getFavorites(id) {
    return this.request(`/media/${id}/favorites`)
  }

  async getUserFavorites(user) {
    return this.request(`/media/user/${user}/favorites`)
  }

  // Sync API
  async syncCache() {
    return this.request('/media/sync', { method: 'POST' })
  }

  // Health check
  async healthCheck() {
    return this.request('/health')
  }

  // Auth API (if needed)
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    })
  }
}

export default new ApiService()
