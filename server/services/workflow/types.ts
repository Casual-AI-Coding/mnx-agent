import { WorkflowNodeType } from '../../types/workflow.js'
import type { TaskResult } from '../../types/task.js'

// Re-export workflow types for convenience
export { WorkflowNodeType }
export type { WorkflowNode, WorkflowEdge, WorkflowGraph } from '../../types/workflow.js'
export type { TaskResult }

export interface WorkflowResult {
  success: boolean
  nodeResults: Map<string, TaskResult>
  totalDurationMs: number
  error?: string
}

export interface RetryPolicy {
  maxRetries: number
  backoffMultiplier: number
}

export interface WorkflowNodeData {
  label: string
  config: Record<string, unknown>
}

export interface WorkflowNodePosition {
  x: number
  y: number
}

export interface TestExecutionOptions {
  testData?: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
  dryRun?: boolean
}
