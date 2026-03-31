import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkflowNode, WorkflowEdge, WorkflowState } from '../types/cron'

interface WorkflowEditorState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  isDirty: boolean
  addNode: (node: WorkflowNode) => void
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: WorkflowEdge) => void
  deleteEdge: (id: string) => void
  setSelectedNode: (id: string | null) => void
  reset: () => void
  loadFromJson: (json: string) => void
  exportToJson: () => string
}

const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const initialNodes: WorkflowNode[] = []
const initialEdges: WorkflowEdge[] = []

export const useWorkflowStore = create<WorkflowEditorState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      selectedNodeId: null,
      isDirty: false,

      addNode: (node) => {
        set((state) => ({
          nodes: [...state.nodes, node],
          isDirty: true,
        }))
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, ...updates } : node
          ),
          isDirty: true,
        }))
      },

      deleteNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter(
            (edge) => edge.source !== id && edge.target !== id
          ),
          selectedNodeId:
            state.selectedNodeId === id ? null : state.selectedNodeId,
          isDirty: true,
        }))
      },

      addEdge: (edge) => {
        set((state) => ({
          edges: [...state.edges, edge],
          isDirty: true,
        }))
      },

      deleteEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
          isDirty: true,
        }))
      },

      setSelectedNode: (id) => {
        set({ selectedNodeId: id })
      },

      reset: () => {
        set({
          nodes: initialNodes,
          edges: initialEdges,
          selectedNodeId: null,
          isDirty: false,
        })
      },

      loadFromJson: (json) => {
        try {
          const state: WorkflowState = JSON.parse(json)
          set({
            nodes: state.nodes ?? [],
            edges: state.edges ?? [],
            selectedNodeId: null,
            isDirty: false,
          })
        } catch (err) {
          console.error('Failed to parse workflow JSON:', err)
        }
      },

      exportToJson: () => {
        const { nodes, edges } = get()
        return JSON.stringify({ nodes, edges }, null, 2)
      },
    }),
    {
      name: 'minimax-workflow-editor',
    }
  )
)

export const hasTriggerNode = (nodes: WorkflowNode[]): boolean =>
  nodes.some((node) => node.type === 'trigger')

export const hasActionNode = (nodes: WorkflowNode[]): boolean =>
  nodes.some((node) => node.type === 'action')

export const isValidWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean => {
  if (nodes.length === 0) return false
  if (!hasTriggerNode(nodes)) return false
  if (!hasActionNode(nodes)) return false

  const connectedNodes = new Set<string>()
  edges.forEach((edge) => {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  })

  return nodes.every((node) => connectedNodes.has(node.id))
}