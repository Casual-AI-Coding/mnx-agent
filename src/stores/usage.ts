import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TokenUsage, UsageHistory } from '@/types'

interface UsageState {
  usage: TokenUsage
  history: UsageHistory[]
  addUsage: (type: keyof Omit<TokenUsage, 'lastUpdated' | 'manualBalance'>, amount: number) => void
  setManualBalance: (balance: number) => void
  resetUsage: () => void
  getHistoryByDate: (date: string) => UsageHistory | undefined
}

const initialUsage: TokenUsage = {
  textTokens: 0,
  voiceCharacters: 0,
  imageRequests: 0,
  musicRequests: 0,
  videoRequests: 0,
  lastUpdated: new Date().toISOString(),
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      usage: initialUsage,
      history: [],

      addUsage: (type, amount) => {
        const today = new Date().toISOString().split('T')[0]
        
        set((state) => {
          const newUsage = {
            ...state.usage,
            [type]: state.usage[type] + amount,
            lastUpdated: new Date().toISOString(),
          }

          let newHistory = [...state.history]
          const todayIndex = newHistory.findIndex(h => h.date === today)
          
          if (todayIndex >= 0) {
            newHistory[todayIndex] = {
              ...newHistory[todayIndex],
              [type]: newHistory[todayIndex][type] + amount,
            }
          } else {
            const newEntry: UsageHistory = {
              date: today,
              textTokens: type === 'textTokens' ? amount : 0,
              voiceCharacters: type === 'voiceCharacters' ? amount : 0,
              imageRequests: type === 'imageRequests' ? amount : 0,
              musicRequests: type === 'musicRequests' ? amount : 0,
              videoRequests: type === 'videoRequests' ? amount : 0,
            }
            newHistory = [newEntry, ...newHistory].slice(0, 365)
          }

          return { usage: newUsage, history: newHistory }
        })
      },

      setManualBalance: (balance) => {
        set((state) => ({
          usage: { ...state.usage, manualBalance: balance },
        }))
      },

      resetUsage: () => {
        set({ usage: initialUsage, history: [] })
      },

      getHistoryByDate: (date) => {
        return get().history.find(h => h.date === date)
      },
    }),
    {
      name: 'minimax-usage-storage',
    }
  )
)