import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: { email: string; full_name: string } | null
  setToken: (token: string) => void
  setUser: (user: { email: string; full_name: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => {
        set({ token })
        localStorage.setItem('access_token', token)
      },
      setUser: (user) => set({ user }),
      logout: () => {
        set({ token: null, user: null })
        localStorage.removeItem('access_token')
      },
    }),
    { name: 'geo-auth', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
)
