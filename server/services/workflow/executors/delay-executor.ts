import type { WorkflowNode } from '../types.js'
import { cronEvents } from '../../websocket-service.js'

export interface DelayExecutorDeps {
  executionLogId: string | null
  workflowId: string | null
}

export async function executeDelayNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: DelayExecutorDeps
): Promise<{ delayed: number }> {
  const { executionLogId, workflowId } = deps
  const detailStartTime = Date.now()

  if (executionLogId) {
    cronEvents.emit('workflow_node_start', {
      executionId: executionLogId,
      nodeId: node.id,
      nodeType: 'delay',
      nodeLabel: node.data?.label || node.id,
      startedAt: new Date().toISOString(),
      workflowId,
    })
  }

  try {
    let delayMs = 0
    if (config.duration !== undefined) {
      delayMs = Math.max(0, config.duration as number)
    } else if (config.until !== undefined) {
      const targetTime = new Date(config.until as string).getTime()
      delayMs = Math.max(0, targetTime - Date.now())
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const result = { delayed: delayMs }

    if (executionLogId) {
      cronEvents.emit('workflow_node_complete', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'delay',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - detailStartTime,
        result,
        workflowId,
      })
    }

    return result
  } catch (error) {
    if (executionLogId) {
      cronEvents.emit('workflow_node_error', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'delay',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        errorMessage: (error as Error).message,
        workflowId,
      })
    }
    throw error
  }
}
