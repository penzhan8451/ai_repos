class CsrfService {
  constructor() {
    this.csrfToken = null
  }

  async getToken() {
    try {
      if (!this.csrfToken) {
        const response = await fetch('http://localhost:3001/api/csrf-token', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          this.csrfToken = data.csrfToken
        } else {
          throw new Error('Failed to get CSRF token')
        }
      }
      return this.csrfToken
    } catch (error) {
      console.error('CSRF token error:', error)
      this.csrfToken = null
      throw error
    }
  }

  resetToken() {
    this.csrfToken = null
  }

  async ensureToken() {
    try {
      return await this.getToken()
    } catch (error) {
      console.error('Ensure CSRF token error:', error)
      return null
    }
  }
}

export default new CsrfService()
