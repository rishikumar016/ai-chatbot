import { create } from 'zustand'

export interface AuthUser {
  _id: string
  firstName: string
  lastName: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string
  setUser: (user: AuthUser | null) => void
  setAccessToken: (accessToken: string) => void
  reset: () => void
}

// Access token lives only in memory — never persisted to cookies or localStorage
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: '',
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  reset: () => set({ user: null, accessToken: '' }),
}))
