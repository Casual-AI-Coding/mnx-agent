/**
 * Prompt Template Entity Types
 */

export type TemplateCategory = 'text' | 'image' | 'music' | 'video' | 'general'

export interface TemplateVariable {
  name: string
  description?: string
  required?: boolean
  default_value?: string
}

export interface PromptTemplate {
  id: string
  name: string
  description: string | null
  content: string
  category: TemplateCategory | null
  variables: TemplateVariable[]
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface PromptTemplateRow {
  id: string
  name: string
  description: string | null
  content: string
  category: string | null
  variables: string | null
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface CreatePromptTemplate {
  name: string
  description?: string | null
  content: string
  category?: TemplateCategory | null
  variables?: TemplateVariable[]
  is_builtin?: boolean
}

export interface UpdatePromptTemplate {
  name?: string
  description?: string | null
  content?: string
  category?: TemplateCategory | null
  variables?: TemplateVariable[]
}