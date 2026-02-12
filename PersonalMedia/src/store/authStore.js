import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiService from '../services/api.js'

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
          const result = await apiService.login(email, password)
          set({
            user: result.user,
            token: result.token,
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
          const result = await apiService.register(username, email, password)
          set({
            user: result.user,
            token: result.token,
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
          const result = await apiService.getCurrentUser()
          set({ user: result.user })
        } catch (error) {
          console.error('Fetch user error:', error)
          // Token invalid, logout
          get().logout()
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        const { token } = get()
        if (!token) return { success: false, error: '未登录' }

        try {
          const result = await apiService.updateProfile(updates)
          set({ user: result.user })
          return { success: true }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        const { token } = get()
        if (!token) return { success: false, error: '未登录' }

        try {
          await apiService.changePassword(currentPassword, newPassword)
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
