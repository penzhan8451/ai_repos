const API_BASE_URL = 'http://localhost:3001/api'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
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

    const response = await fetch(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    return await response.json()
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
}

export default new ApiService()
