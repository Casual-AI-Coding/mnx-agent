import type { WorkflowEdge } from './types.js'

export function updateExcludedNodes(
  conditionNodeId: string,
  conditionResult: boolean,
  edges: WorkflowEdge[],
  excludedNodes: Set<string>
): void {
  const targetHandle = conditionResult ? 'false' : 'true'

  for (const edge of edges) {
    if (edge.source !== conditionNodeId) continue

    if (edge.sourceHandle === targetHandle) {
      excludeBranchNodes(edge.target, edges, excludedNodes)
    }
  }
}

export function excludeBranchNodes(startNodeId: string, edges: WorkflowEdge[], excludedNodes: Set<string>): void {
  const toExclude = new Set<string>([startNodeId])
  const queue = [startNodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()!

    for (const edge of edges) {
      if (edge.source === currentId && !toExclude.has(edge.target)) {
        toExclude.add(edge.target)
        queue.push(edge.target)
      }
    }
  }

  for (const nodeId of toExclude) {
    excludedNodes.add(nodeId)
  }
}

export function addLoopBodyNodesToExcluded(
  workflowNodes: { id: string }[],
  workflowEdges: WorkflowEdge[],
  excludedNodes: Set<string>
): void {
  for (const edge of workflowEdges) {
    if (edge.sourceHandle === 'body') {
      excludeBranchNodes(edge.target, workflowEdges, excludedNodes)
    }
  }
}

export function addErrorBoundarySuccessNodesToExcluded(
  workflowNodes: { id: string; type?: string }[],
  workflowEdges: WorkflowEdge[],
  excludedNodes: Set<string>
): void {
  for (const edge of workflowEdges) {
    if (edge.sourceHandle === 'success') {
      const sourceNode = workflowNodes.find((n) => n.id === edge.source)
      if (sourceNode?.type === 'errorBoundary') {
        excludeBranchNodes(edge.target, workflowEdges, excludedNodes)
      }
    }
  }
}

export function queueErrorBoundaryErrorNodes(
  errorBoundaryNodeId: string,
  workflowEdges: WorkflowEdge[],
  excludedNodes: Set<string>
): void {
  for (const edge of workflowEdges) {
    if (edge.source === errorBoundaryNodeId && edge.sourceHandle === 'error') {
      excludedNodes.delete(edge.target)
      for (const downstreamEdge of workflowEdges) {
        if (downstreamEdge.source === edge.target) {
          excludedNodes.delete(downstreamEdge.target)
        }
      }
    }
  }
}
