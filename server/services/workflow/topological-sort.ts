import type { WorkflowGraph, WorkflowNode } from './types.js'

export class CycleDetectedError extends Error {
  constructor(public readonly nodes: string[]) {
    super(`Workflow contains cycle involving nodes: ${nodes.join(', ')}`)
    this.name = 'CycleDetectedError'
  }
}

export function buildExecutionLayers(workflow: WorkflowGraph): string[][] {
  const nodes = workflow.nodes
  const edges = workflow.edges || []

  const dependencies = new Map<string, Set<string>>()

  for (const node of nodes) {
    dependencies.set(node.id, new Set())
  }

  for (const edge of edges) {
    dependencies.get(edge.target)?.add(edge.source)
  }

  const layers: string[][] = []
  const assigned = new Set<string>()

  while (assigned.size < nodes.length) {
    const readyNodes = nodes
      .filter((n) => {
        if (assigned.has(n.id)) return false
        const deps = dependencies.get(n.id)
        if (!deps) return false
        for (const dep of deps) {
          if (!assigned.has(dep)) return false
        }
        return true
      })
      .map((n) => n.id)

    if (readyNodes.length === 0) {
      const remaining = nodes.filter((n) => !assigned.has(n.id)).map((n) => n.id)
      throw new CycleDetectedError(remaining)
    }

    layers.push(readyNodes)
    for (const nodeId of readyNodes) {
      assigned.add(nodeId)
    }
  }

  return layers
}

export function buildExecutionOrder(workflow: WorkflowGraph): string[] {
  const layers = buildExecutionLayers(workflow)
  return layers.flat()
}

export function topologicalSort(nodes: WorkflowNode[], edges: WorkflowGraph['edges']): string[][] {
  const graphEdges = edges || []
  const dependencies = new Map<string, Set<string>>()

  for (const node of nodes) {
    dependencies.set(node.id, new Set())
  }

  for (const edge of graphEdges) {
    dependencies.get(edge.target)?.add(edge.source)
  }

  const layers: string[][] = []
  const assigned = new Set<string>()

  while (assigned.size < nodes.length) {
    const readyNodes = nodes
      .filter((n) => {
        if (assigned.has(n.id)) return false
        const deps = dependencies.get(n.id)
        if (!deps) return false
        for (const dep of deps) {
          if (!assigned.has(dep)) return false
        }
        return true
      })
      .map((n) => n.id)

    if (readyNodes.length === 0) {
      const remaining = nodes.filter((n) => !assigned.has(n.id)).map((n) => n.id)
      throw new CycleDetectedError(remaining)
    }

    layers.push(readyNodes)
    for (const nodeId of readyNodes) {
      assigned.add(nodeId)
    }
  }

  return layers
}
