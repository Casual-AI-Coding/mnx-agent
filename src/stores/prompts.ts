import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PromptCategory = 'text' | 'image' | 'music' | 'video'

export interface PromptItem {
  id: string
  title: string
  content: string
  category: PromptCategory
  createdAt: number
}

interface PromptsState {
  prompts: PromptItem[]
  addPrompt: (item: Omit<PromptItem, 'id' | 'createdAt'>) => void
  deletePrompt: (id: string) => void
  getPromptsByCategory: (category: PromptCategory) => PromptItem[]
}

export const usePromptsStore = create<PromptsState>()(
  persist(
    (set, get) => ({
      prompts: [],

      addPrompt: (item) => {
        const newPrompt: PromptItem = {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        }

        set((state) => ({
          prompts: [newPrompt, ...state.prompts],
        }))
      },

      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((prompt) => prompt.id !== id),
        }))
      },

      getPromptsByCategory: (category) => {
        return get().prompts.filter((prompt) => prompt.category === category)
      },
    }),
    {
      name: 'minimax-prompts',
    }
  )
)
