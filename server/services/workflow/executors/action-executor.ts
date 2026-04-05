import type { WorkflowNode } from '../types.js'
import type { DatabaseService } from '../../../database/service-async.js'
import type { ServiceNodeRegistry } from '../../service-node-registry.js'
import { cronEvents } from '../../websocket-service.js'

export interface ActionExecutorDeps {
  db: DatabaseService
  serviceRegistry: ServiceNodeRegistry
  executionLogId: string | null
  workflowId: string | null
  dryRun: boolean
  testData: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
}

export async function executeActionNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: ActionExecutorDeps
): Promise<unknown> {
  const { db, serviceRegistry, executionLogId, workflowId, dryRun, testData } = deps
  const service = config.service as string
  const method = config.method as string
  const args = (config.args as unknown[]) ?? []

  const detailStartTime = Date.now()
  let detailId: string | null = null

  if (executionLogId) {
    cronEvents.emit('workflow_node_start', {
      executionId: executionLogId,
      nodeId: node.id,
      nodeType: 'action',
      nodeLabel: node.data?.label || node.id,
      startedAt: new Date().toISOString(),
      workflowId,
    })
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

    cronEvents.emitWorkflowNodeOutput(node.id, mockResponse, executionLogId || 'test-run')

    if (executionLogId) {
      cronEvents.emit('workflow_node_complete', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'action',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - detailStartTime,
        result: mockResponse,
        workflowId,
      })
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
      started_at: new Date().toISOString(),
    })
  }

  try {
    const result = await serviceRegistry.call(service, method, args)

    if (detailId) {
      await db.updateExecutionLogDetail(detailId, {
        output_result: JSON.stringify(result),
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - detailStartTime,
      })
    }

    if (executionLogId) {
      cronEvents.emit('workflow_node_complete', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'action',
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
    if (detailId) {
      await db.updateExecutionLogDetail(detailId, {
        error_message: (error as Error).message,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - detailStartTime,
      })
    }

    if (executionLogId) {
      cronEvents.emit('workflow_node_error', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'action',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        errorMessage: (error as Error).message,
        workflowId,
      })
    }
    throw error
  }
}
