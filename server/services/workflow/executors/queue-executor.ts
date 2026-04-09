import type { WorkflowNode, TaskResult } from '../types.js'
import type { DatabaseService } from '../../../database/service-async.js'
import type { ITaskExecutor } from '../../../types/task.js'
import type { ServiceNodeRegistry } from '../../service-node-registry.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'

export interface QueueExecutorDeps {
  db: DatabaseService
  taskExecutor: ITaskExecutor | null
  serviceRegistry: ServiceNodeRegistry
  executionLogId: string | null
  workflowId: string | null
  eventBus: IEventBus
}

export async function executeQueueNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  deps: QueueExecutorDeps
): Promise<{ total: number; succeeded: number; failed: number }> {
  const { db, taskExecutor, serviceRegistry, executionLogId, workflowId, eventBus } = deps
  const jobId = config.jobId as string | undefined
  const taskType = config.taskType as string | undefined
  const limit = (config.limit as number) ?? 10

  const detailStartTime = Date.now()

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
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
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, queueResult, Date.now() - detailStartTime)
    }

    return queueResult
  } catch (error) {
    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }
    throw error
  }
}
