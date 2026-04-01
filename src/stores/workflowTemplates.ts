import { create } from 'zustand'
import type { WorkflowTemplate, CreateWorkflowDTO, UpdateWorkflowDTO } from '@/lib/api/workflows'
import { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/api/workflows'

interface WorkflowTemplatesState {
  templates: WorkflowTemplate[]
  currentTemplate: WorkflowTemplate | null
  isLoading: boolean
  error: string | null

  fetchTemplates: (params?: { is_template?: boolean }) => Promise<void>
  fetchTemplate: (id: string) => Promise<void>
  addTemplate: (data: CreateWorkflowDTO) => Promise<boolean>
  editTemplate: (id: string, data: UpdateWorkflowDTO) => Promise<boolean>
  removeTemplate: (id: string) => Promise<boolean>
  setCurrentTemplate: (template: WorkflowTemplate | null) => void
  clearError: () => void
}

export const useWorkflowTemplatesStore = create<WorkflowTemplatesState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async (params) => {
    set({ isLoading: true, error: null })
    const result = await listWorkflows(params)
    if (result.success && result.data) {
      set({ templates: result.data.workflows, isLoading: false })
    } else {
      set({ error: result.error || 'Failed to fetch workflows', isLoading: false })
    }
  },

  fetchTemplate: async (id) => {
    set({ isLoading: true, error: null })
    const result = await getWorkflow(id)
    if (result.success && result.data) {
      set({ currentTemplate: result.data, isLoading: false })
    } else {
      set({ error: result.error || 'Failed to fetch workflow', isLoading: false })
    }
  },

  addTemplate: async (data) => {
    set({ isLoading: true, error: null })
    const result = await createWorkflow(data)
    if (result.success && result.data) {
      set(state => ({
        templates: [result.data!, ...state.templates],
        isLoading: false
      }))
      return true
    }
    set({ error: result.error || 'Failed to create workflow', isLoading: false })
    return false
  },

  editTemplate: async (id, data) => {
    set({ isLoading: true, error: null })
    const result = await updateWorkflow(id, data)
    if (result.success && result.data) {
      set(state => ({
        templates: state.templates.map(t => t.id === id ? result.data! : t),
        currentTemplate: state.currentTemplate?.id === id ? result.data! : state.currentTemplate,
        isLoading: false
      }))
      return true
    }
    set({ error: result.error || 'Failed to update workflow', isLoading: false })
    return false
  },

  removeTemplate: async (id) => {
    set({ isLoading: true, error: null })
    const result = await deleteWorkflow(id)
    if (result.success) {
      set(state => ({
        templates: state.templates.filter(t => t.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        isLoading: false
      }))
      return true
    }
    set({ error: result.error || 'Failed to delete workflow', isLoading: false })
    return false
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template })
  },

  clearError: () => {
    set({ error: null })
  }
}))