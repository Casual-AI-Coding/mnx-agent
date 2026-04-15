import type { WorkflowNode } from '../types.js'
import type { DatabaseService } from '../../../database/service-async.js'
import type { ServiceNodeRegistry } from '../../service-node-registry.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { toLocalISODateString } from '../../../lib/date-utils.js'

export interface ActionExecutorDeps {
  db: DatabaseService
  serviceRegistry: ServiceNodeRegistry
  executionLogId: string | null
  workflowId: string | null
  dryRun: boolean
  testData: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
  eventBus: IEventBus
}

export async function executeActionNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: ActionExecutorDeps
): Promise<unknown> {
  const { db, serviceRegistry, executionLogId, workflowId, dryRun, testData, eventBus } = deps
  const service = config.service as string
  const method = config.method as string
  const args = (config.args as unknown[]) ?? []

  const detailStartTime = Date.now()
  let detailId: string | null = null

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
  }

  if (dryRun) {
    const mockResponse =
      testData[node.id]?.mockResponse || {
        success: true,
        message: '[Dry Run] API call skipped',
        service,
        method,
        mockData: true,
      }

    eventBus.emitWorkflowNodeOutput(node.id, mockResponse, executionLogId || 'test-run')

    if (executionLogId) {
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, mockResponse, Date.now() - detailStartTime)
    }

    return mockResponse
  }

  if (executionLogId) {
    detailId = await db.createExecutionLogDetail({
      log_id: executionLogId,
      node_id: node.id,
      node_type: 'action',
      service_name: service,
      method_name: method,
      input_payload: JSON.stringify(args),
      started_at: toLocalISODateString(),
    })
  }

  try {
    const result = await serviceRegistry.call(service, method, args)

    if (detailId) {
      await db.updateExecutionLogDetail(detailId, {
        output_result: JSON.stringify(result),
        completed_at: toLocalISODateString(),
        duration_ms: Date.now() - detailStartTime,
      })
    }

    if (executionLogId) {
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, result, Date.now() - detailStartTime)
    }

    return result
  } catch (error) {
    if (detailId) {
      await db.updateExecutionLogDetail(detailId, {
        error_message: (error as Error).message,
        completed_at: toLocalISODateString(),
        duration_ms: Date.now() - detailStartTime,
      })
    }

    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }
    throw error
  }
}
