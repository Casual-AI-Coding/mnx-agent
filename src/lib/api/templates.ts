import { internalAxios } from './client'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type TemplateCategory = 'text' | 'image' | 'music' | 'video' | 'general'

export interface PromptTemplate {
  id: string
  name: string
  description: string | null
  content: string
  category: TemplateCategory
  variables: TemplateVariable[] | null
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  name: string
  description?: string
  default?: string
  required?: boolean
}

export interface CreateTemplateData {
  name: string
  description?: string
  content: string
  category: TemplateCategory
  variables?: TemplateVariable[]
}

export interface UpdateTemplateData {
  name?: string
  description?: string
  content?: string
  category?: TemplateCategory
  variables?: TemplateVariable[]
}

export interface ListTemplatesParams {
  category?: TemplateCategory
}

export async function listTemplates(params?: ListTemplatesParams): Promise<ApiResponse<{ templates: PromptTemplate[] }>> {
  try {
    const response = await internalAxios.get('/templates', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getTemplate(id: string): Promise<ApiResponse<PromptTemplate>> {
  try {
    const response = await internalAxios.get(`/templates/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function createTemplate(data: CreateTemplateData): Promise<ApiResponse<PromptTemplate>> {
  try {
    const response = await internalAxios.post('/templates', data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function updateTemplate(id: string, data: UpdateTemplateData): Promise<ApiResponse<PromptTemplate>> {
  try {
    const response = await internalAxios.put(`/templates/${id}`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function deleteTemplate(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    const response = await internalAxios.delete(`/templates/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`
  })
}

export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map(m => m.slice(2, -2)))]
}