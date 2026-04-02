import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConnectionStatus } from '@/lib/websocket-client'

export type ApiMode = 'direct' | 'proxy'
export const PROXY_BASE_URL = '/api'
export type ThemeState = 'system' | string

interface AppState {
  apiKey: string
  region: 'cn' | 'intl'
  theme: ThemeState
  apiMode: ApiMode
  wsStatus: ConnectionStatus
  hasCompletedOnboarding: boolean
  setApiKey: (key: string) => void
  setRegion: (region: 'cn' | 'intl') => void
  setTheme: (theme: ThemeState) => void
  setApiMode: (mode: ApiMode) => void
  setWsStatus: (status: ConnectionStatus) => void
  setHasCompletedOnboarding: (value: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      region: 'cn',
      theme: 'system',
      apiMode: 'direct',
      wsStatus: 'disconnected',
      hasCompletedOnboarding: false,
      setApiKey: (key) => set({ apiKey: key }),
      setRegion: (region) => set({ region: region }),
      setTheme: (theme) => set({ theme: theme }),
      setApiMode: (mode) => set({ apiMode: mode }),
      setWsStatus: (status) => set({ wsStatus: status }),
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
    }),
    {
      name: 'minimax-app-storage',
    }
  )
)