import type { Node, Edge } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '@/types/cron'

export function storeNodeToRFNode(node: WorkflowNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      label: node.data?.label || node.id,
      config: node.data?.config || {},
    },
    selected: false,
  }
}

export function rfNodeToStoreNode(node: Node): WorkflowNode {
  return {
    id: node.id,
    type: node.type as WorkflowNode['type'],
    position: node.position,
    data: {
      label: (node.data as Record<string, unknown>).label as string || (node.type as string),
      config: node.data as Record<string, unknown>,
    },
  }
}

export function rfEdgesToStoreEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }))
}

export function storeEdgesToRFEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }))
}
