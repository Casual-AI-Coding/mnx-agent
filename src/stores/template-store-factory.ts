import { create } from 'zustand'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface IdentifiedTemplate {
  readonly id: string
}

function hasTemplateId(value: unknown): value is IdentifiedTemplate {
  return typeof value === 'object'
    && value !== null
    && 'id' in value
    && typeof value.id === 'string'
}

function isTemplateArray<TTemplate extends IdentifiedTemplate>(value: unknown): value is TTemplate[] {
  return Array.isArray(value) && value.every(hasTemplateId)
}

export interface TemplateStoreState<
  TTemplate extends IdentifiedTemplate,
  TListParams = void,
  TCreateInput = Partial<TTemplate>,
  TUpdateInput = Partial<TTemplate>,
> {
  templates: TTemplate[]
  currentTemplate: TTemplate | null
  isLoading: boolean
  error: string | null
  fetchTemplates: (params?: TListParams) => Promise<void>
  fetchTemplate: (id: string) => Promise<void>
  addTemplate: (data: TCreateInput) => Promise<boolean>
  editTemplate: (id: string, data: TUpdateInput) => Promise<boolean>
  removeTemplate: (id: string) => Promise<boolean>
  setCurrentTemplate: (template: TTemplate | null) => void
  clearError: () => void
}

export interface TemplateStoreConfig<
  TTemplate extends IdentifiedTemplate,
  TListParams = void,
  TCreateInput = Partial<TTemplate>,
  TUpdateInput = Partial<TTemplate>,
> {
  name: string
  listApi: (params?: TListParams) => Promise<ApiResponse<Record<string, unknown>>>
  getApi: (id: string) => Promise<ApiResponse<TTemplate>>
  createApi: (data: TCreateInput) => Promise<ApiResponse<TTemplate>>
  updateApi: (id: string, data: TUpdateInput) => Promise<ApiResponse<TTemplate>>
  deleteApi: (id: string) => Promise<ApiResponse<{ deleted: boolean }>>
  listKey?: string
}

export function createTemplateStore<
  TTemplate extends IdentifiedTemplate,
  TListParams = void,
  TCreateInput = Partial<TTemplate>,
  TUpdateInput = Partial<TTemplate>,
>(config: TemplateStoreConfig<TTemplate, TListParams, TCreateInput, TUpdateInput>) {
  return create<TemplateStoreState<TTemplate, TListParams, TCreateInput, TUpdateInput>>((set) => ({
    templates: [],
    currentTemplate: null,
    isLoading: false,
    error: null,

    fetchTemplates: async (params) => {
      set({ isLoading: true, error: null })
      const result = await config.listApi(params)
      if (result.success && result.data) {
        const key = config.listKey || 'templates'
        const items = result.data[key]
        if (isTemplateArray<TTemplate>(items)) {
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
        const createdTemplate = result.data
        set(state => ({
          templates: [createdTemplate, ...state.templates],
          isLoading: false,
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
        const updatedTemplate = result.data
        set(state => ({
          templates: state.templates.map(template => template.id === id ? updatedTemplate : template),
          currentTemplate: state.currentTemplate?.id === id ? updatedTemplate : state.currentTemplate,
          isLoading: false,
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
          templates: state.templates.filter(template => template.id !== id),
          currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
          isLoading: false,
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
    },
  }))
}
