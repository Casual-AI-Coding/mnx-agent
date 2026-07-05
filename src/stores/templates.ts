import { create } from 'zustand'
import type { TemplateStoreState } from './template-store-factory'
export { createTemplateStore } from './template-store-factory'
export type { TemplateStoreState, TemplateStoreConfig } from './template-store-factory'
import type {
  PromptTemplate,
  TemplateCategory,
  CreateTemplateData,
  UpdateTemplateData,
  PromptTemplateVersion,
  PromptTemplateVersionDiff,
} from '@/lib/api/templates'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplateVersions,
  createTemplateVersion,
  compareTemplateVersions,
  rollbackTemplateVersion,
} from '@/lib/api/templates'

export type { PromptTemplate, TemplateCategory, CreateTemplateData, UpdateTemplateData, PromptTemplateVersion, PromptTemplateVersionDiff }

export interface PromptTemplateStoreState extends TemplateStoreState<
  PromptTemplate,
  Parameters<typeof listTemplates>[0],
  CreateTemplateData,
  UpdateTemplateData
> {
  versions: PromptTemplateVersion[]
  versionDiffs: PromptTemplateVersionDiff[]
  isVersionLoading: boolean
  fetchTemplateVersions: (id: string) => Promise<void>
  createTemplateVersion: (id: string, changeSummary?: string | null) => Promise<boolean>
  compareTemplateVersions: (id: string, from: number, to: number) => Promise<void>
  rollbackTemplateVersion: (id: string, versionId: string) => Promise<boolean>
}

export const useTemplatesStore = create<PromptTemplateStoreState>((set) => ({
  templates: [],
  currentTemplate: null,
  versions: [],
  versionDiffs: [],
  isLoading: false,
  isVersionLoading: false,
  error: null,

  fetchTemplates: async (params?: Parameters<typeof listTemplates>[0]) => {
    set({ isLoading: true, error: null })
    const result = await listTemplates(params)
    if (result.success && result.data) {
      if (Array.isArray(result.data.templates)) {
        set({ templates: result.data.templates, isLoading: false })
        return
      }
      set({ error: 'Invalid response format from prompt-templates API', isLoading: false })
      return
    }
    set({ error: result.error || 'Failed to fetch prompt-templates', isLoading: false })
  },

  fetchTemplate: async (id) => {
    set({ isLoading: true, error: null })
    const result = await getTemplate(id)
    if (result.success && result.data) {
      set({ currentTemplate: result.data, isLoading: false })
      return
    }
    set({ error: result.error || 'Failed to fetch prompt-templates', isLoading: false })
  },

  addTemplate: async (data: CreateTemplateData) => {
    set({ isLoading: true, error: null })
    const result = await createTemplate(data)
    if (result.success && result.data) {
      const createdTemplate = result.data
      set(state => ({ templates: [createdTemplate, ...state.templates], isLoading: false }))
      return true
    }
    set({ error: result.error || 'Failed to create prompt-templates', isLoading: false })
    return false
  },

  editTemplate: async (id, data: UpdateTemplateData) => {
    set({ isLoading: true, error: null })
    const result = await updateTemplate(id, data)
    if (result.success && result.data) {
      const updatedTemplate = result.data
      set(state => ({
        templates: state.templates.map(template => template.id === id ? updatedTemplate : template),
        currentTemplate: state.currentTemplate?.id === id ? updatedTemplate : state.currentTemplate,
        isLoading: false,
      }))
      return true
    }
    set({ error: result.error || 'Failed to update prompt-templates', isLoading: false })
    return false
  },

  removeTemplate: async (id) => {
    set({ isLoading: true, error: null })
    const result = await deleteTemplate(id)
    if (result.success) {
      set(state => ({
        templates: state.templates.filter(template => template.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        isLoading: false,
      }))
      return true
    }
    set({ error: result.error || 'Failed to delete prompt-templates', isLoading: false })
    return false
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template })
  },

  clearError: () => {
    set({ error: null })
  },

  fetchTemplateVersions: async (id) => {
    set({ isVersionLoading: true, error: null })
    const result = await listTemplateVersions(id)
    if (result.success && result.data) {
      set({ versions: result.data.versions, isVersionLoading: false })
      return
    }
    set({ error: result.error || 'Failed to fetch template versions', isVersionLoading: false })
  },

  createTemplateVersion: async (id, changeSummary) => {
    set({ isVersionLoading: true, error: null })
    const result = await createTemplateVersion(id, { change_summary: changeSummary })
    if (result.success && result.data) {
      const createdVersion = result.data
      set(state => ({ versions: [createdVersion, ...state.versions], isVersionLoading: false }))
      return true
    }
    set({ error: result.error || 'Failed to create template version', isVersionLoading: false })
    return false
  },

  compareTemplateVersions: async (id, from, to) => {
    set({ isVersionLoading: true, error: null })
    const result = await compareTemplateVersions(id, from, to)
    if (result.success && result.data) {
      set({ versionDiffs: result.data.diffs, isVersionLoading: false })
      return
    }
    set({ error: result.error || 'Failed to compare template versions', isVersionLoading: false })
  },

  rollbackTemplateVersion: async (id, versionId) => {
    set({ isVersionLoading: true, error: null })
    const result = await rollbackTemplateVersion(id, versionId)
    if (result.success && result.data) {
      const rolledBackTemplate = result.data
      set(state => ({
        templates: state.templates.map(template => template.id === id ? rolledBackTemplate : template),
        currentTemplate: state.currentTemplate?.id === id ? rolledBackTemplate : state.currentTemplate,
        isVersionLoading: false,
      }))
      return true
    }
    set({ error: result.error || 'Failed to rollback template version', isVersionLoading: false })
    return false
  },
}))
