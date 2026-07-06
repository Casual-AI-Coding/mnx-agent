/**
 * Zustand Store 适配器 — 将 Zustand store 实现为 API Client 依赖注入接口
 */

import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/settings/store'
import type { AuthProvider, SettingsProvider, NavigationProvider } from './types'

/** useAuthStore → AuthProvider 适配器 */
export function createAuthProvider(): AuthProvider {
  return {
    isHydrated: () => useAuthStore.getState().isHydrated,
    isAuthenticated: () => useAuthStore.getState().isAuthenticated,
    getAccessToken: () => useAuthStore.getState().accessToken,
    updateAccessToken: (token: string) => useAuthStore.getState().updateAccessToken(token),
    logout: () => useAuthStore.getState().logout(),
  }
}

/** useSettingsStore → SettingsProvider 适配器 */
export function createSettingsProvider(): SettingsProvider {
  return {
    getApiKey: () => useSettingsStore.getState().settings.api.minimaxKey,
    getRegion: () => useSettingsStore.getState().settings.api.region as 'domestic' | 'international',
  }
}

/** 浏览器导航适配器 */
export function createBrowserNavigationProvider(): NavigationProvider {
  return {
    redirectToLogin: () => {
      window.location.href = '/login'
    },
  }
}
