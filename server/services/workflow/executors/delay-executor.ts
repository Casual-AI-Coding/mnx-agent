import type { WorkflowNode } from '../types.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'

export interface DelayExecutorDeps {
  executionLogId: string | null
  workflowId: string | null
  eventBus: IEventBus
}

export async function executeDelayNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: DelayExecutorDeps
): Promise<{ delayed: number }> {
  const { executionLogId, workflowId, eventBus } = deps
  const detailStartTime = Date.now()

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
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
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, result, Date.now() - detailStartTime)
    }

    return result
  } catch (error) {
    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }
    throw error
  }
}
