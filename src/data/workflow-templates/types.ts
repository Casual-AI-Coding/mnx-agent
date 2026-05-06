export type TemplateCategory =
  | 'text'
  | 'image'
  | 'voice'
  | 'video'
  | 'music'
  | 'audio'
  | 'workflow'
  | 'code'
  | 'productivity'
  | 'education'
  | 'creative'
  | 'analytics'
  | 'automation'

export interface WorkflowNode {
  id: string
  type: 'action' | 'condition' | 'transform' | 'loop' | 'input' | 'output'
  subtype?: string
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    config?: Record<string, unknown>
    condition?: string
    transformType?: string
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  thumbnail?: string
  usageCount?: number
  rating?: number
  ratingCount?: number
  author?: string
  createdAt?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
}

export interface TemplateCategoryInfo {
  label: string
  icon: string
  color: string
}
