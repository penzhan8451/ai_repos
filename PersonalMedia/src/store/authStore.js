import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || '登录失败')
          }

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false
          })

          return { success: true }
        } catch (error) {
          set({ error: error.message, isLoading: false })
          return { success: false, error: error.message }
        }
      },

      // Register
      register: async (username, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || '注册失败')
          }

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false
          })

          return { success: true }
        } catch (error) {
          set({ error: error.message, isLoading: false })
          return { success: false, error: error.message }
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
      },

      // Fetch current user
      fetchUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          const response = await fetch('http://localhost:3001/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            set({ user: data.user })
          } else {
            // Token invalid, logout
            get().logout()
          }
        } catch (error) {
          console.error('Fetch user error:', error)
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        const { token } = get()
        if (!token) return { success: false, error: '未登录' }

        try {
          const response = await fetch('http://localhost:3001/api/auth/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || '更新失败')
          }

          set({ user: data.user })
          return { success: true }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
)

export default useAuthStore
