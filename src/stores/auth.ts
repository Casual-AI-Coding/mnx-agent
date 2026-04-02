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
  refreshToken: string | null
  isAuthenticated: boolean
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

// SECURITY NOTE: Tokens are persisted to localStorage for convenience.
// This is vulnerable to XSS attacks. For production with higher security requirements:
// 1. Use httpOnly cookies for refresh tokens (server-set via Set-Cookie header)
// 2. Keep access tokens in memory only (remove from persist)
// 3. Implement token rotation on each refresh
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      }),
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }),
    { name: 'auth-storage' }
  )
)