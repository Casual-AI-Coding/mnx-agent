import { storeNodeToRFNode } from '@/components/workflow/utils/workflow-transforms'
import type { WorkflowTemplate } from './types'

type BuilderNode = {
  id: string
  type?: string
  position: unknown
  data: unknown
}

type BuilderEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export function serializeWorkflow(nodes: BuilderNode[], edges: BuilderEdge[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: (node.data as Record<string, unknown>).label as string || (node.type as string),
        config: node.data as Record<string, unknown>,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })),
  }
}

export function parseWorkflowTemplate(template: Pick<WorkflowTemplate, 'nodes_json' | 'edges_json'>) {
  const nodesData = typeof template.nodes_json === 'string'
    ? JSON.parse(template.nodes_json)
    : template.nodes_json
  const edgesData = template.edges_json
    ? (typeof template.edges_json === 'string' ? JSON.parse(template.edges_json) : template.edges_json)
    : []

  return {
    nodes: nodesData.map(storeNodeToRFNode),
    edges: edgesData,
  }
}
