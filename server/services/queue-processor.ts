import type { DatabaseService } from '../database/service-async.js'
import { TaskStatus, TaskQueueItem } from '../database/types'
import type { TaskResult } from './workflow-engine'
import { cronEvents } from './websocket-service'

export type { DatabaseService }

export interface QueueOptions {
  batchSize?: number
  maxConcurrent?: number
  skipFailed?: boolean
}

export interface QueueResult {
  success: boolean
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
  error?: string
}

export interface TaskExecutor {
  executeTask(taskType: string, payload: Record<string, unknown>): Promise<TaskResult>
}

export interface CapacityChecker {
  hasCapacity(serviceType: string): Promise<boolean>
  decrementCapacity(serviceType: string): Promise<void>
  getSafeExecutionLimit(serviceType: string): Promise<number>
}

export class QueueProcessor {
  private db: DatabaseService
  private taskExecutor: TaskExecutor
  private capacityChecker: CapacityChecker
  private readonly maxRetryDelayMs = 5 * 60 * 1000 // 5 minutes max delay

  constructor(
    db: DatabaseService,
    taskExecutor: TaskExecutor,
    capacityChecker: CapacityChecker
  ) {
    this.db = db
    this.taskExecutor = taskExecutor
    this.capacityChecker = capacityChecker
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s... capped at 5 minutes
    const baseDelay = 1000 * Math.pow(2, retryCount)
    const jitter = Math.random() * 1000 // Add up to 1s of random jitter
    return Math.min(baseDelay + jitter, this.maxRetryDelayMs)
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async processQueue(jobId: string, options?: QueueOptions): Promise<QueueResult> {
    const batchSize = options?.batchSize || 10
    const skipFailed = options?.skipFailed || false

    const stats = {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
    }

    let queueError: string | undefined

    try {
      const pendingTasks = await this.getPendingTasks(jobId, batchSize)

      if (pendingTasks.length === 0) {
        return {
          success: true,
          tasksExecuted: 0,
          tasksSucceeded: 0,
          tasksFailed: 0,
        }
      }

      for (const task of pendingTasks) {
        const hasCapacity = await this.capacityChecker.hasCapacity(task.task_type)
        if (!hasCapacity) {
          queueError = `Capacity exhausted for task type: ${task.task_type}`
          break
        }

        const taskResult = await this.executeTaskWithLifecycle(task)

        stats.tasksExecuted++

        if (taskResult.success) {
          stats.tasksSucceeded++
          await this.capacityChecker.decrementCapacity(task.task_type)
        } else {
          stats.tasksFailed++
          
          if (!skipFailed && task.retry_count < task.max_retries) {
            // Apply exponential backoff before requeuing
            const delayMs = this.calculateRetryDelay(task.retry_count)
            await this.sleep(delayMs)
            await this.requeueTask(task)
          } else if (task.retry_count >= task.max_retries) {
            // Move to dead letter queue
            await this.moveToDeadLetterQueue(task, taskResult.error || 'Max retries exceeded')
          }
        }
      }

    } catch (error) {
      queueError = (error as Error).message
    }

    return {
      success: !queueError && stats.tasksFailed === 0,
      tasksExecuted: stats.tasksExecuted,
      tasksSucceeded: stats.tasksSucceeded,
      tasksFailed: stats.tasksFailed,
      error: queueError,
    }
  }

  async getPendingTasks(jobId: string, limit: number): Promise<TaskQueueItem[]> {
    return await this.db.getPendingTasks(jobId, limit)
  }

  async cancelPendingTasks(jobId: string): Promise<number> {
    const pendingTasks = await this.db.getPendingTasks(jobId, 1000)
    const pendingTaskIds = pendingTasks
      .filter(task => task.status === TaskStatus.PENDING)
      .map(task => task.id)

    if (pendingTaskIds.length === 0) {
      return 0
    }

    return await this.db.updateTasksStatusBatch(pendingTaskIds, TaskStatus.CANCELLED)
  }

  async retryFailedTasks(jobId: string): Promise<number> {
    const pendingTasks = await this.db.getPendingTasks(jobId, 1000)
    let retriedCount = 0

    for (const task of pendingTasks) {
      if (task.status === TaskStatus.FAILED) {
        await this.db.updateTask(task.id, {
          status: TaskStatus.PENDING,
          retry_count: 0,
          error_message: null,
        })
        retriedCount++
      }
    }

    return retriedCount
  }

  private async executeTaskWithLifecycle(task: TaskQueueItem): Promise<TaskResult> {
    const startTime = Date.now()

    await this.db.updateTask(task.id, {
      status: TaskStatus.RUNNING,
      started_at: new Date().toISOString(),
    })

    try {
      const payload = JSON.parse(task.payload)
      const result = await this.taskExecutor.executeTask(task.task_type, payload)

      await this.db.updateTask(task.id, {
        status: TaskStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        result: JSON.stringify(result.data),
      })

      cronEvents.emitTaskCompleted(task)

      return result

    } catch (error) {
      const errorMessage = (error as Error).message

      await this.db.updateTask(task.id, {
        status: TaskStatus.FAILED,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })

      cronEvents.emitTaskFailed(task)

      return {
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async requeueTask(task: TaskQueueItem): Promise<void> {
    await this.db.updateTask(task.id, {
      status: TaskStatus.PENDING,
      retry_count: task.retry_count + 1,
      started_at: null,
    })
  }

  private async moveToDeadLetterQueue(task: TaskQueueItem, error: string): Promise<void> {
    try {
      const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload
      await this.db.createDeadLetterQueueItem({
        original_task_id: task.id,
        job_id: task.job_id ?? undefined,
        task_type: task.task_type,
        payload: payload,
        error_message: error,
        retry_count: task.retry_count,
        max_retries: task.max_retries,
      }, task.owner_id ?? undefined)
    } catch (err) {
      console.error(`[QueueProcessor] Failed to move task ${task.id} to dead letter queue:`, err)
    }
  }

  async getQueueStats(jobId: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
  }> {
    const stats = await this.db.getQueueStats(jobId)
    const { total: _total, ...result } = stats
    return result
  }

  async processBatch(
    jobId: string,
    batch: TaskQueueItem[],
    options?: QueueOptions
  ): Promise<QueueResult> {
    const skipFailed = options?.skipFailed || false

    const stats = {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
    }

    for (const task of batch) {
      const hasCapacity = await this.capacityChecker.hasCapacity(task.task_type)
      if (!hasCapacity) {
        return {
          success: false,
          tasksExecuted: stats.tasksExecuted,
          tasksSucceeded: stats.tasksSucceeded,
          tasksFailed: stats.tasksFailed,
          error: `Capacity exhausted for task type: ${task.task_type}`,
        }
      }

      const taskResult = await this.executeTaskWithLifecycle(task)

      stats.tasksExecuted++

      if (taskResult.success) {
        stats.tasksSucceeded++
        await this.capacityChecker.decrementCapacity(task.task_type)
      } else {
        stats.tasksFailed++
        
        if (!skipFailed && task.retry_count < task.max_retries) {
          const delayMs = this.calculateRetryDelay(task.retry_count)
          await this.sleep(delayMs)
          await this.requeueTask(task)
        } else if (task.retry_count >= task.max_retries) {
          await this.moveToDeadLetterQueue(task, taskResult.error || 'Max retries exceeded')
        }
      }
    }

    return {
      success: stats.tasksFailed === 0,
      tasksExecuted: stats.tasksExecuted,
      tasksSucceeded: stats.tasksSucceeded,
      tasksFailed: stats.tasksFailed,
    }
  }

  /**
   * Process image generation tasks based on remaining capacity.
   * This is the main method for the 23:30 scheduled workflow.
   * 
   * Flow:
   * 1. Check image API capacity
   * 2. Get pending image tasks limited by capacity
   * 3. Process each task (execute image generation, save media record)
   * 
   * @param ownerId Optional owner ID for data isolation
   * @returns Processing results with stats
   */
  async processImageQueueWithCapacity(ownerId?: string): Promise<QueueResult & { capacityUsed: number; capacityRemaining: number }> {
    const hasCapacity = await this.capacityChecker.hasCapacity('image')
    if (!hasCapacity) {
      return {
        success: true,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        capacityUsed: 0,
        capacityRemaining: 0,
      }
    }

    const safeLimit = await this.capacityChecker.getSafeExecutionLimit('image')
    const pendingTasks = await this.db.getPendingTasksByType('image_generation', safeLimit, ownerId)

    if (pendingTasks.length === 0) {
      return {
        success: true,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        capacityUsed: 0,
        capacityRemaining: safeLimit,
      }
    }

    const stats = {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
    }

    for (const task of pendingTasks) {
      const stillHasCapacity = await this.capacityChecker.hasCapacity('image')
      if (!stillHasCapacity) {
        break
      }

      const taskResult = await this.executeTaskWithLifecycle(task)
      stats.tasksExecuted++

      if (taskResult.success) {
        stats.tasksSucceeded++
        await this.capacityChecker.decrementCapacity('image')
      } else {
        stats.tasksFailed++
        
        if (task.retry_count < task.max_retries) {
          const delayMs = this.calculateRetryDelay(task.retry_count)
          await this.sleep(delayMs)
          await this.requeueTask(task)
        } else {
          await this.moveToDeadLetterQueue(task, taskResult.error || 'Max retries exceeded')
        }
      }
    }

    const remainingCapacity = await this.capacityChecker.getSafeExecutionLimit('image')

    return {
      success: stats.tasksFailed === 0,
      tasksExecuted: stats.tasksExecuted,
      tasksSucceeded: stats.tasksSucceeded,
      tasksFailed: stats.tasksFailed,
      capacityUsed: stats.tasksSucceeded,
      capacityRemaining: remainingCapacity,
    }
  }
}

export function createQueueProcessor(
  db: DatabaseService,
  taskExecutor: TaskExecutor,
  capacityChecker: CapacityChecker
): QueueProcessor {
  return new QueueProcessor(db, taskExecutor, capacityChecker)
}
