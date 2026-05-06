// Re-export types
export type {
  TemplateCategory,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTemplate,
  TemplateCategoryInfo,
} from './types'

// Re-export constants
export { TEMPLATE_CATEGORIES } from './constants'

// Re-export data
export { BUILTIN_TEMPLATES } from './templates'

// Import for helper functions
import type { WorkflowTemplate, TemplateCategory } from './types'
import { TEMPLATE_CATEGORIES } from './constants'
import { BUILTIN_TEMPLATES } from './templates'

// Helper functions
export function getTemplatesByCategory(category: TemplateCategory): WorkflowTemplate[] {
  return BUILTIN_TEMPLATES.filter((t) => t.category === category)
}

export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase()
  return BUILTIN_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

export function getAllCategories(): { id: TemplateCategory; label: string; count: number }[] {
  return Object.entries(TEMPLATE_CATEGORIES).map(([id, info]) => ({
    id: id as TemplateCategory,
    label: info.label,
    count: BUILTIN_TEMPLATES.filter((t) => t.category === id).length,
  }))
}
