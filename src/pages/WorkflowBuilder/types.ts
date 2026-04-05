import type { Edge, Node } from '@xyflow/react'
import type { AvailableActionItem } from '@/components/workflow/builder'
import type { WorkflowVersion } from '@/lib/api/workflows'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ValidationSummary {
  total: number
  errors: number
  warnings: number
}

export interface SaveMessage {
  type: 'success' | 'error'
  text: string
}

export interface HistoryState {
  past: { nodes: Node[]; edges: Edge[] }[]
  future: { nodes: Node[]; edges: Edge[] }[]
}

export interface TestNodeResult {
  input?: unknown
  output?: unknown
  error?: string
  duration?: number
}

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'paused'

export interface NodeConfig {
  label: string
  config: Record<string, unknown>
}

export interface DragData {
  type: string
  actionData?: AvailableActionItem
}
