import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ApiMode = 'direct' | 'proxy'
export const PROXY_BASE_URL = '/api'

interface AppState {
  apiKey: string
  region: 'cn' | 'intl'
  theme: 'light' | 'dark' | 'system'
  apiMode: ApiMode
  setApiKey: (key: string) => void
  setRegion: (region: 'cn' | 'intl') => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setApiMode: (mode: ApiMode) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      region: 'cn',
      theme: 'system',
      apiMode: 'direct',
      setApiKey: (key) => set({ apiKey: key }),
      setRegion: (region) => set({ region: region }),
      setTheme: (theme) => set({ theme: theme }),
      setApiMode: (mode) => set({ apiMode: mode }),
    }),
    {
      name: 'minimax-app-storage',
    }
  )
)