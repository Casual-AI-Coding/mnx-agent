import type { WorkflowTemplate } from '@/data/workflow-templates'

export interface TemplateCardProps {
  template: WorkflowTemplate
  onPreview: (template: WorkflowTemplate) => void
  onUse: (template: WorkflowTemplate) => void
  onCopy: (template: WorkflowTemplate) => void
  copiedId: string | null
}

export interface TemplateListItemProps {
  template: WorkflowTemplate
  onPreview: (template: WorkflowTemplate) => void
  onUse: (template: WorkflowTemplate) => void
  onCopy: (template: WorkflowTemplate) => void
  copiedId: string | null
}

export interface TemplateFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onCreateWorkflow: () => void
}

export interface TemplateGridProps {
  templates: WorkflowTemplate[]
  viewMode: 'grid' | 'list'
  onPreview: (template: WorkflowTemplate) => void
  onUse: (template: WorkflowTemplate) => void
  onCopy: (template: WorkflowTemplate) => void
  copiedId: string | null
}

export interface TemplatePreviewProps {
  template: WorkflowTemplate | null
  isOpen: boolean
  onClose: () => void
  onUse: (template: WorkflowTemplate) => void
}
