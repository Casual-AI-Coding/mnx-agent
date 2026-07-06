import type { WorkflowNode, TaskResult } from '../types.js'
import type { ITaskExecutor } from '../../../types/task.js'
import type { ServiceNodeRegistry } from '../../service-node-registry.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { getTaskService } from '../../../service-registration.js'

export interface QueueExecutorDeps {
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
  const { taskExecutor, serviceRegistry, executionLogId, workflowId, eventBus } = deps
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
      tasks = await getTaskService().getPendingByJobId(jobId, limit)
    } else if (taskType) {
      tasks = await getTaskService().getPendingByType(taskType, limit)
    }

    const total = tasks.length
    let succeeded = 0
    let failed = 0

    for (const task of tasks) {
      try {
        await getTaskService().markRunning(task.id)

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

        await getTaskService().markCompleted(task.id, JSON.stringify(result))
        succeeded++
      } catch (error) {
        const errorMessage = (error as Error).message
        await getTaskService().markFailed(task.id, errorMessage)
        failed++

        const newRetryCount = task.retry_count + 1
        if (newRetryCount >= task.max_retries) {
          await getTaskService().moveToDeadLetter(task.id, errorMessage)
          continue
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
