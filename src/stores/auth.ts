import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'super' | 'admin' | 'pro' | 'user'

export interface AuthUser {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string
  role: UserRole
  is_active: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (user: AuthUser, accessToken: string) => void
  logout: () => void
  updateAccessToken: (accessToken: string) => void
  setHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,
      login: (user, accessToken) => set({
        user,
        accessToken,
        isAuthenticated: true,
        isHydrated: true,
      }),
      logout: () => set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isHydrated: false,
      }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      setHydrated: (value) => set({ isHydrated: value }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)