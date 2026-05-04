import { UserRole } from '@mnx/shared-types'

export { UserRole }

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.PRO]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER]: 3,
}

export const VALID_ROLES: UserRole[] = Object.values(UserRole)

export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
  Queue = 'queue',
  Delay = 'delay',
  ErrorBoundary = 'errorBoundary',
}

export interface RetryPolicy {
  maxRetries: number
  backoffMultiplier: number
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  timeout?: number
  retryPolicy?: RetryPolicy
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
  subNodes?: WorkflowNode[]
  subEdges?: WorkflowEdge[]
}

export interface TransformNodeConfig {
  transformType: 'extract' | 'map' | 'filter' | 'format'
  inputPath?: string
  outputFormat?: string
}

export interface QueueNodeConfig {
  jobId?: string
  taskType?: string
  limit?: number
}

export interface DelayNodeConfig {
  duration?: number   // milliseconds
  until?: string      // ISO timestamp to wait until
}

export interface ErrorBoundaryNodeConfig {
  label?: string
}