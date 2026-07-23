import type { WorkflowNode } from '../types.js'
import type { ServiceNodeRegistry } from '../../service-node-registry.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import type { ILogService } from '../../../services/domain/interfaces/log.interface.js'
import { toLocalISODateString } from '../../../lib/date-utils.js'

export interface ActionExecutorDeps {
  serviceRegistry: ServiceNodeRegistry
  executionLogId: string | null
  workflowId: string | null
  dryRun: boolean
  testData: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
  eventBus: IEventBus
  /**
   * 日志服务，由 WorkflowEngine 通过 NodeExecutorDeps 显式注入。
   * 设计原因：消除 executors → service-registration → workflow/engine 的循环依赖（ADR-0013 Phase A）。
   */
  logService: ILogService
}

export async function executeActionNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: ActionExecutorDeps
): Promise<unknown> {
  const { serviceRegistry, executionLogId, workflowId, dryRun, testData, eventBus, logService } = deps
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
    const detail = await logService.createDetail({
      log_id: executionLogId,
      node_id: node.id,
      node_type: 'action',
      service_name: service,
      method_name: method,
      input_payload: JSON.stringify(args),
      started_at: toLocalISODateString(),
    })
    detailId = detail.id
  }

  try {
    const result = await serviceRegistry.call(service, method, args)

    if (detailId) {
      await logService.updateDetail(detailId, {
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
      await logService.updateDetail(detailId, {
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
