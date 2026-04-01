import { create } from 'zustand'
import type { PromptTemplate, TemplateCategory, CreateTemplateData, UpdateTemplateData } from '@/lib/api/templates'
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from '@/lib/api/templates'

interface TemplatesState {
  templates: PromptTemplate[]
  currentTemplate: PromptTemplate | null
  isLoading: boolean
  error: string | null
  
  fetchTemplates: (category?: TemplateCategory) => Promise<void>
  fetchTemplate: (id: string) => Promise<void>
  addTemplate: (data: CreateTemplateData) => Promise<boolean>
  editTemplate: (id: string, data: UpdateTemplateData) => Promise<boolean>
  removeTemplate: (id: string) => Promise<boolean>
  setCurrentTemplate: (template: PromptTemplate | null) => void
  clearError: () => void
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async (category) => {
    set({ isLoading: true, error: null })
    const result = await listTemplates({ category })
    if (result.success && result.data) {
      set({ templates: result.data.templates, isLoading: false })
    } else {
      set({ error: result.error || 'Failed to fetch templates', isLoading: false })
    }
  },

  fetchTemplate: async (id) => {
    set({ isLoading: true, error: null })
    const result = await getTemplate(id)
    if (result.success && result.data) {
      set({ currentTemplate: result.data, isLoading: false })
    } else {
      set({ error: result.error || 'Failed to fetch template', isLoading: false })
    }
  },

  addTemplate: async (data) => {
    set({ isLoading: true, error: null })
    const result = await createTemplate(data)
    if (result.success && result.data) {
      set(state => ({
        templates: [result.data!, ...state.templates],
        isLoading: false
      }))
      return true
    }
    set({ error: result.error || 'Failed to create template', isLoading: false })
    return false
  },

  editTemplate: async (id, data) => {
    set({ isLoading: true, error: null })
    const result = await updateTemplate(id, data)
    if (result.success && result.data) {
      set(state => ({
        templates: state.templates.map(t => t.id === id ? result.data! : t),
        currentTemplate: state.currentTemplate?.id === id ? result.data! : state.currentTemplate,
        isLoading: false
      }))
      return true
    }
    set({ error: result.error || 'Failed to update template', isLoading: false })
    return false
  },

  removeTemplate: async (id) => {
    set({ isLoading: true, error: null })
    const result = await deleteTemplate(id)
    if (result.success) {
      set(state => ({
        templates: state.templates.filter(t => t.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        isLoading: false
      }))
      return true
    }
    set({ error: result.error || 'Failed to delete template', isLoading: false })
    return false
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template })
  },

  clearError: () => {
    set({ error: null })
  }
}))