export const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

export const VALID_ROLES = ['user', 'pro', 'admin', 'super'] as const
export type UserRole = typeof VALID_ROLES[number]

export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface ActionNodeConfig {
  service: string
  method: string
  args?: unknown[]
}

export interface ConditionNodeConfig {
  condition: string
}

export interface LoopNodeConfig {
  items?: string
  maxIterations?: number
  condition?: string
}

export interface TransformNodeConfig {
  transformType: 'extract' | 'map' | 'filter' | 'format'
  inputPath?: string
  outputFormat?: string
}