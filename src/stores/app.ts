import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  apiKey: string
  region: 'cn' | 'intl'
  theme: 'light' | 'dark' | 'system'
  setApiKey: (key: string) => void
  setRegion: (region: 'cn' | 'intl') => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      region: 'cn',
      theme: 'system',
      setApiKey: (key) => set({ apiKey: key }),
      setRegion: (region) => set({ region: region }),
      setTheme: (theme) => set({ theme: theme }),
    }),
    {
      name: 'minimax-app-storage',
    }
  )
)