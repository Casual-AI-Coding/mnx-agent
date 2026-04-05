import type { WorkflowNode, TaskResult } from '../types.js'
import type { DatabaseService } from '../../../database/service-async.js'
import type { ITaskExecutor } from '../../../types/task.js'
import type { ServiceNodeRegistry } from '../../service-node-registry.js'
import { cronEvents } from '../../websocket-service.js'

export interface QueueExecutorDeps {
  db: DatabaseService
  taskExecutor: ITaskExecutor | null
  serviceRegistry: ServiceNodeRegistry
  executionLogId: string | null
  workflowId: string | null
}

export async function executeQueueNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: QueueExecutorDeps
): Promise<{ total: number; succeeded: number; failed: number }> {
  const { db, taskExecutor, serviceRegistry, executionLogId, workflowId } = deps
  const jobId = config.jobId as string | undefined
  const taskType = config.taskType as string | undefined
  const limit = (config.limit as number) ?? 10

  const detailStartTime = Date.now()

  if (executionLogId) {
    cronEvents.emit('workflow_node_start', {
      executionId: executionLogId,
      nodeId: node.id,
      nodeType: 'queue',
      nodeLabel: node.data?.label || node.id,
      startedAt: new Date().toISOString(),
      workflowId,
    })
  }

  try {
    let tasks: {
      id: string
      task_type: string
      payload: string
      retry_count: number
      max_retries: number
    }[] = []

    if (jobId) {
      tasks = await db.getPendingTasksByJob(jobId, limit)
    } else if (taskType) {
      tasks = await db.getPendingTasksByType(taskType, limit)
    }

    const total = tasks.length
    let succeeded = 0
    let failed = 0

    for (const task of tasks) {
      try {
        await db.markTaskRunning(task.id)

        const payload = JSON.parse(task.payload)
        let result: TaskResult

        if (taskExecutor) {
          result = await taskExecutor.executeTask(task.task_type, payload)
        } else {
          result = (await serviceRegistry.call('task-executor', 'executeTask', [
            task.task_type,
            payload,
          ])) as TaskResult
        }

        await db.markTaskCompleted(task.id, JSON.stringify(result))
        succeeded++
      } catch (error) {
        const errorMessage = (error as Error).message
        await db.markTaskFailed(task.id, errorMessage)
        failed++

        const newRetryCount = task.retry_count + 1
        if (newRetryCount >= task.max_retries) {
          await db.createDeadLetterQueueItem({
            original_task_id: task.id,
            job_id: jobId ?? undefined,
            task_type: task.task_type,
            payload: JSON.parse(task.payload),
            error_message: errorMessage,
            retry_count: newRetryCount,
            max_retries: task.max_retries,
          })
        }
      }
    }

    const queueResult = { total, succeeded, failed }

    if (executionLogId) {
      cronEvents.emit('workflow_node_complete', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'queue',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - detailStartTime,
        result: queueResult,
        workflowId,
      })
    }

    return queueResult
  } catch (error) {
    if (executionLogId) {
      cronEvents.emit('workflow_node_error', {
        executionId: executionLogId,
        nodeId: node.id,
        nodeType: 'queue',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        errorMessage: (error as Error).message,
        workflowId,
      })
    }
    throw error
  }
}
