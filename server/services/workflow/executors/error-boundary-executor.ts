import type { TaskResult, WorkflowEdge, WorkflowNode } from '../types.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'

export interface ErrorBoundaryExecutorDeps {
  executionLogId: string | null
  workflowId: string | null
  workflowNodes: WorkflowNode[]
  workflowEdges: WorkflowEdge[]
  resolveNodeConfig: (config: Record<string, unknown>, nodeOutputs: Map<string, unknown>) => Record<string, unknown>
  executeNode: (node: WorkflowNode, config: Record<string, unknown>, nodeOutputs: Map<string, unknown>) => Promise<TaskResult>
  eventBus: IEventBus
}

export async function executeErrorBoundaryNode(
  node: WorkflowNode,
  _config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  deps: ErrorBoundaryExecutorDeps
): Promise<{ success: boolean; error?: { message: string; stack?: string } }> {
  const { executionLogId, workflowId, workflowNodes, workflowEdges, resolveNodeConfig, executeNode, eventBus } = deps
  const detailStartTime = Date.now()

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
  }

  try {
    const successNodes = findErrorBoundarySuccessNodes(node.id, workflowNodes, workflowEdges)

    if (successNodes.length === 0) {
      if (executionLogId) {
        eventBus.emitWorkflowNodeComplete(
          node.id,
          executionLogId,
          { success: true, message: 'No nodes to protect' },
          Date.now() - detailStartTime
        )
      }
      return { success: true }
    }

    for (const successNodeId of successNodes) {
      const successNode = workflowNodes.find((n) => n.id === successNodeId)
      if (!successNode) continue

      const resolvedConfig = resolveNodeConfig(successNode.data.config, nodeOutputs)
      const result = await executeNode(successNode, resolvedConfig, nodeOutputs)

      if (!result.success) {
        const errorInfo = {
          success: false,
          error: {
            message: result.error || 'Unknown error',
          },
        }

        nodeOutputs.set(node.id, errorInfo)

        if (executionLogId) {
          eventBus.emitWorkflowNodeComplete(node.id, executionLogId, errorInfo, Date.now() - detailStartTime)
        }

        return errorInfo
      }

      if (result.data !== undefined) {
        nodeOutputs.set(successNodeId, result.data)
      }
    }

    if (executionLogId) {
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, { success: true }, Date.now() - detailStartTime)
    }

    return { success: true }
  } catch (error) {
    const errorInfo = {
      success: false,
      error: {
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    }

    nodeOutputs.set(node.id, errorInfo)

    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }

    return errorInfo
  }
}

export function findErrorBoundarySuccessNodes(
  errorBoundaryNodeId: string,
  _workflowNodes: WorkflowNode[],
  workflowEdges: WorkflowEdge[]
): string[] {
  const successNodeIds: string[] = []

  for (const edge of workflowEdges) {
    if (edge.source === errorBoundaryNodeId && edge.sourceHandle === 'success') {
      successNodeIds.push(edge.target)
      const downstreamNodes = findAllDownstreamNodes(edge.target, workflowEdges)
      successNodeIds.push(...downstreamNodes)
    }
  }

  return [...new Set(successNodeIds)]
}

function findAllDownstreamNodes(startNodeId: string, workflowEdges: WorkflowEdge[]): string[] {
  const downstream: string[] = []
  const visited = new Set<string>()
  const queue = [startNodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    for (const edge of workflowEdges) {
      if (edge.source === currentId && !visited.has(edge.target)) {
        if (edge.sourceHandle !== 'error') {
          downstream.push(edge.target)
          queue.push(edge.target)
        }
      }
    }
  }

  return downstream
}
