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
  owner_id: string | null
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
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface PromptTemplateVersion {
  readonly id: string
  readonly template_id: string
  readonly version_number: number
  readonly name: string
  readonly description: string | null
  readonly content: string
  readonly category: TemplateCategory | null
  readonly variables: TemplateVariable[]
  readonly change_summary: string | null
  readonly created_by: string | null
  readonly owner_id: string | null
  readonly created_at: string
  readonly is_active: boolean
}

export interface PromptTemplateVersionRow {
  readonly id: string
  readonly template_id: string
  readonly version_number: number
  readonly name: string
  readonly description: string | null
  readonly content: string
  readonly category: string | null
  readonly variables: string | TemplateVariable[] | null
  readonly change_summary: string | null
  readonly created_by: string | null
  readonly owner_id: string | null
  readonly created_at: string
  readonly is_active: number | boolean
}

export interface CreatePromptTemplateVersion {
  readonly template_id: string
  readonly version_number: number
  readonly name: string
  readonly description?: string | null
  readonly content: string
  readonly category?: TemplateCategory | null
  readonly variables?: TemplateVariable[]
  readonly change_summary?: string | null
  readonly created_by?: string | null
  readonly owner_id?: string | null
  readonly is_active?: boolean
}

export interface PromptTemplateVersionDiff {
  readonly field: 'name' | 'description' | 'content' | 'category' | 'variables'
  readonly from: string | TemplateCategory | TemplateVariable[] | null
  readonly to: string | TemplateCategory | TemplateVariable[] | null
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
