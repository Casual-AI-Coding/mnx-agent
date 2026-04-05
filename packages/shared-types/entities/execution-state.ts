/**
 * Execution State Entity Types
 */

export type ExecutionStateStatus = 'pending' | 'running' | 'paused' | 'resumed' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionState {
  id: string
  execution_log_id: string
  workflow_id: string
  status: ExecutionStateStatus
  current_layer: number
  completed_nodes: string
  failed_nodes: string
  node_outputs: string
  context: string
  started_at: string
  updated_at: string
  paused_at: string | null
  resumed_at: string | null
  completed_at: string | null
  created_by: string | null
}

export interface ExecutionStateRow {
  id: string
  execution_log_id: string
  workflow_id: string
  status: string
  current_layer: number
  completed_nodes: string
  failed_nodes: string
  node_outputs: string
  context: string
  started_at: string
  updated_at: string
  paused_at: string | null
  resumed_at: string | null
  completed_at: string | null
  created_by: string | null
}

export interface CreateExecutionState {
  execution_log_id: string
  workflow_id: string
  status?: 'pending' | 'running'
  current_layer?: number
  completed_nodes?: string[]
  failed_nodes?: Array<{ nodeId: string; error: string }>
  node_outputs?: Record<string, unknown>
  context?: Record<string, unknown>
  created_by?: string | null
}

export interface UpdateExecutionState {
  status?: string
  current_layer?: number
  completed_nodes?: string
  failed_nodes?: string
  node_outputs?: string
  context?: string
  paused_at?: string | null
  resumed_at?: string | null
  completed_at?: string | null
  updated_at?: string
}