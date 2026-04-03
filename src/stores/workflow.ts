import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkflowNode, WorkflowEdge, WorkflowState } from '../types/cron'
import { useWorkflowTemplatesStore } from './workflowTemplates'
import type { WorkflowTemplate } from '@/lib/api/workflows'

interface WorkflowEditorState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  isDirty: boolean
  currentWorkflowId: string | null
  isLoading: boolean
  addNode: (node: WorkflowNode) => void
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: WorkflowEdge) => void
  deleteEdge: (id: string) => void
  setSelectedNode: (id: string | null) => void
  reset: () => void
  loadFromJson: (json: string) => void
  exportToJson: () => string
  loadFromServer: (id: string) => Promise<boolean>
  saveToServer: (name: string, description?: string, isTemplate?: boolean) => Promise<boolean>
  loadFromTemplate: (template: WorkflowTemplate) => void
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
      currentWorkflowId: null,
      isLoading: false,

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

      loadFromServer: async (id: string) => {
        set({ isLoading: true })
        const store = useWorkflowTemplatesStore.getState()
        await store.fetchTemplate(id)
        const template = store.currentTemplate
        if (template) {
          const state: WorkflowState = {
            nodes: typeof template.nodes_json === 'string' 
              ? JSON.parse(template.nodes_json) 
              : template.nodes_json,
            edges: typeof template.edges_json === 'string' 
              ? JSON.parse(template.edges_json) 
              : template.edges_json,
          }
          set({
            nodes: state.nodes ?? [],
            edges: state.edges ?? [],
            selectedNodeId: null,
            isDirty: false,
            currentWorkflowId: template.id,
            isLoading: false,
          })
          return true
        }
        set({ isLoading: false })
        return false
      },

      saveToServer: async (name, description, isTemplate = false) => {
        set({ isLoading: true })
        const { nodes, edges, currentWorkflowId } = get()
        const nodesJson = JSON.stringify(nodes)
        const edgesJson = JSON.stringify(edges)

        const store = useWorkflowTemplatesStore.getState()
        let success = false

        if (currentWorkflowId) {
          success = await store.editTemplate(currentWorkflowId, {
            name,
            description,
            nodes_json: nodesJson,
            edges_json: edgesJson,
            is_template: isTemplate,
          })
        } else {
          success = await store.addTemplate({
            name,
            description,
            nodes_json: nodesJson,
            edges_json: edgesJson,
            is_template: isTemplate,
          })
          if (success && store.currentTemplate) {
            set({ currentWorkflowId: store.currentTemplate.id })
          }
        }

        if (success) {
          set({ isDirty: false, isLoading: false })
        } else {
          set({ isLoading: false })
        }
        return success
      },

      loadFromTemplate: (template: WorkflowTemplate) => {
        const state: WorkflowState = {
          nodes: typeof template.nodes_json === 'string' 
            ? JSON.parse(template.nodes_json) 
            : template.nodes_json,
          edges: typeof template.edges_json === 'string' 
            ? JSON.parse(template.edges_json) 
            : template.edges_json,
        }
        set({
          nodes: state.nodes ?? [],
          edges: state.edges ?? [],
          selectedNodeId: null,
          isDirty: false,
          currentWorkflowId: template.id,
        })
      },
    }),
    {
      name: 'minimax-workflow-editor',
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