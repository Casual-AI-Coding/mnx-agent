import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkflowNode, WorkflowEdge } from '../types/cron'

interface WorkflowMetadataState {
  currentWorkflowId: string | null
  currentWorkflowName: string | null
  isDirty: boolean
  isLoading: boolean
  lastSavedAt: string | null

  setCurrentWorkflow: (id: string | null, name?: string | null) => void
  setDirty: (dirty: boolean) => void
  setLoading: (loading: boolean) => void
  markSaved: () => void
  reset: () => void
}

const initialState = {
  currentWorkflowId: null,
  currentWorkflowName: null,
  isDirty: false,
  isLoading: false,
  lastSavedAt: null,
}

export const useWorkflowStore = create<WorkflowMetadataState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentWorkflow: (id, name) => {
        set({
          currentWorkflowId: id,
          currentWorkflowName: name ?? null,
          isDirty: false,
        })
      },

      setDirty: (dirty) => {
        set({ isDirty: dirty })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      markSaved: () => {
        set({
          isDirty: false,
          lastSavedAt: new Date().toISOString(),
        })
      },

      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'minimax-workflow-metadata',
    }
  )
)

export const hasActionNode = (nodes: WorkflowNode[]): boolean =>
  nodes.some((node) => node.type === 'action')

export const isValidWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean => {
  if (nodes.length === 0) return false
  if (!hasActionNode(nodes)) return false

  const connectedNodes = new Set<string>()
  edges.forEach((edge) => {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  })

  return nodes.every((node) => connectedNodes.has(node.id))
}

export const serializeWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]): string => {
  return JSON.stringify({ nodes, edges }, null, 2)
}

export const deserializeWorkflow = (json: string): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null => {
  try {
    const parsed = JSON.parse(json)
    return {
      nodes: parsed.nodes ?? [],
      edges: parsed.edges ?? [],
    }
  } catch (err) {
    console.error('Failed to parse workflow JSON:', err)
    return null
  }
}
