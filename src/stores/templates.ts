import { create } from 'zustand'
import type { PromptTemplate, TemplateCategory, CreateTemplateData, UpdateTemplateData } from '@/lib/api/templates'
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from '@/lib/api/templates'

export type { PromptTemplate, TemplateCategory, CreateTemplateData, UpdateTemplateData }

// ===========================
// Generic Template Store Factory
// ===========================

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TemplateStoreState<T> {
  templates: T[]
  currentTemplate: T | null
  isLoading: boolean
  error: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchTemplates: (params?: any) => Promise<void>
  fetchTemplate: (id: string) => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addTemplate: (data: any) => Promise<boolean>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editTemplate: (id: string, data: any) => Promise<boolean>
  removeTemplate: (id: string) => Promise<boolean>
  setCurrentTemplate: (template: T | null) => void
  clearError: () => void
}

export interface TemplateStoreConfig<T> {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listApi: (params?: any) => Promise<ApiResponse<Record<string, unknown>>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getApi: (id: string) => Promise<ApiResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createApi: (data: any) => Promise<ApiResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateApi: (id: string, data: any) => Promise<ApiResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteApi: (id: string) => Promise<ApiResponse<{ deleted: boolean }>>
  listKey?: string
}

export function createTemplateStore<T>(config: TemplateStoreConfig<T>) {
  return create<TemplateStoreState<T>>((set) => ({
    templates: [],
    currentTemplate: null,
    isLoading: false,
    error: null,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchTemplates: async (params: any) => {
      set({ isLoading: true, error: null })
      const result = await config.listApi(params)
      if (result.success && result.data) {
        const key = config.listKey || 'templates'
        const items = result.data[key] as T[]
        if (items) {
          set({ templates: items, isLoading: false })
        } else {
          set({ error: `Invalid response format from ${config.name} API`, isLoading: false })
        }
      } else {
        set({ error: result.error || `Failed to fetch ${config.name}`, isLoading: false })
      }
    },

    fetchTemplate: async (id) => {
      set({ isLoading: true, error: null })
      const result = await config.getApi(id)
      if (result.success && result.data) {
        set({ currentTemplate: result.data, isLoading: false })
      } else {
        set({ error: result.error || `Failed to fetch ${config.name}`, isLoading: false })
      }
    },

    addTemplate: async (data) => {
      set({ isLoading: true, error: null })
      const result = await config.createApi(data)
      if (result.success && result.data) {
        set(state => ({
          templates: [result.data!, ...state.templates],
          isLoading: false
        }))
        return true
      }
      set({ error: result.error || `Failed to create ${config.name}`, isLoading: false })
      return false
    },

    editTemplate: async (id, data) => {
      set({ isLoading: true, error: null })
      const result = await config.updateApi(id, data)
      if (result.success && result.data) {
        set(state => ({
          templates: state.templates.map(t => (t as { id: string }).id === id ? result.data! : t),
          currentTemplate: (state.currentTemplate as { id: string } | null)?.id === id ? result.data! : state.currentTemplate,
          isLoading: false
        }))
        return true
      }
      set({ error: result.error || `Failed to update ${config.name}`, isLoading: false })
      return false
    },

    removeTemplate: async (id) => {
      set({ isLoading: true, error: null })
      const result = await config.deleteApi(id)
      if (result.success) {
        set(state => ({
          templates: state.templates.filter(t => (t as { id: string }).id !== id),
          currentTemplate: (state.currentTemplate as { id: string } | null)?.id === id ? null : state.currentTemplate,
          isLoading: false
        }))
        return true
      }
      set({ error: result.error || `Failed to delete ${config.name}`, isLoading: false })
      return false
    },

    setCurrentTemplate: (template) => {
      set({ currentTemplate: template })
    },

    clearError: () => {
      set({ error: null })
    }
  }))
}

export const useTemplatesStore = createTemplateStore<PromptTemplate>({
  name: 'prompt-templates',
  listApi: (params) => listTemplates(params as Parameters<typeof listTemplates>[0]),
  getApi: getTemplate,
  createApi: createTemplate,
  updateApi: updateTemplate,
  deleteApi: deleteTemplate,
})