import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryItem {
  id: string
  type: 'text' | 'voice' | 'image' | 'music' | 'video'
  timestamp: number
  input: string
  output?: string
  outputUrl?: string
  metadata?: Record<string, unknown>
}

interface HistoryState {
  items: HistoryItem[]
  maxItems: number
  addItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
  removeItem: (id: string) => void
  clearItems: (type?: HistoryItem['type']) => void
  getItemsByType: (type: HistoryItem['type']) => HistoryItem[]
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 50,

      addItem: (item) => {
        const newItem: HistoryItem = {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        }

        set((state) => ({
          items: [newItem, ...state.items].slice(0, state.maxItems),
        }))
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }))
      },

      clearItems: (type) => {
        set((state) => ({
          items: type
            ? state.items.filter((item) => item.type !== type)
            : [],
        }))
      },

      getItemsByType: (type) => {
        return get().items.filter((item) => item.type === type)
      },
    }),
    {
      name: 'minimax-history-storage',
    }
  )
)