import type { DatabaseService } from '../database/service-async.js'
import { TaskStatus, TaskQueueItem } from '../database/types'
import type { TaskResult, ITaskExecutor } from '../types/task.js'
import type { IEventBus } from './interfaces/event-bus.interface.js'
import { RETRY_TIMEOUTS } from '../config/timeouts.js'

export type { DatabaseService }
export type { ITaskExecutor }

export interface AutoRetryConfig {
  enabled: boolean
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
  backoffMultiplier: number
}

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

export interface CapacityChecker {
  hasCapacity(serviceType: string): Promise<boolean>
  decrementCapacity(serviceType: string): Promise<void>
  getSafeExecutionLimit(serviceType: string): Promise<number>
}

export class QueueProcessor {
  private db: DatabaseService
  private taskExecutor: ITaskExecutor
  private capacityChecker: CapacityChecker
  private eventBus: IEventBus
  private readonly maxRetryDelayMs = RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS
  private autoRetryConfig: AutoRetryConfig
  private autoRetryTimer: NodeJS.Timeout | null = null

  constructor(
    db: DatabaseService,
    taskExecutor: ITaskExecutor,
    capacityChecker: CapacityChecker,
    eventBus: IEventBus,
    autoRetryConfig?: Partial<AutoRetryConfig>
  ) {
    this.db = db
    this.taskExecutor = taskExecutor
    this.capacityChecker = capacityChecker
    this.eventBus = eventBus
    this.autoRetryConfig = {
      enabled: autoRetryConfig?.enabled ?? true,
      initialDelayMs: autoRetryConfig?.initialDelayMs ?? RETRY_TIMEOUTS.BASE_DELAY_MS * 60,
      maxDelayMs: autoRetryConfig?.maxDelayMs ?? RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS,
      maxAttempts: autoRetryConfig?.maxAttempts ?? 3,
      backoffMultiplier: autoRetryConfig?.backoffMultiplier ?? 2,
    }
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

      this.eventBus.emitTaskCompleted(task)

      return result

    } catch (error) {
      const errorMessage = (error as Error).message

      await this.db.updateTask(task.id, {
        status: TaskStatus.FAILED,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })

      this.eventBus.emitTaskFailed(task)

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

      this.eventBus.emitTaskMovedToDLQ(task, error)
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

  startAutoRetry(): void {
    if (!this.autoRetryConfig.enabled || this.autoRetryTimer) {
      return
    }

    console.log('[QueueProcessor] Starting auto-retry scheduler')
    this.autoRetryTimer = setInterval(
      () => this.processDLQAutoRetry(),
      this.autoRetryConfig.initialDelayMs
    )
  }

  stopAutoRetry(): void {
    if (this.autoRetryTimer) {
      clearInterval(this.autoRetryTimer)
      this.autoRetryTimer = null
      console.log('[QueueProcessor] Stopped auto-retry scheduler')
    }
  }

  private async processDLQAutoRetry(): Promise<void> {
    try {
      const dlqItems = await this.db.getDeadLetterQueueItems(undefined, 10)
      
      for (const item of dlqItems) {
        if (item.resolved_at) continue
        
        const retryCount = item.retry_count ?? 0
        if (retryCount >= this.autoRetryConfig.maxAttempts) {
          console.log(`[QueueProcessor] DLQ item ${item.id} exceeded max attempts (${retryCount}/${this.autoRetryConfig.maxAttempts})`)
          continue
        }

        const delayMs = Math.min(
          this.autoRetryConfig.initialDelayMs * Math.pow(this.autoRetryConfig.backoffMultiplier, retryCount),
          this.autoRetryConfig.maxDelayMs
        )

        const failedAt = new Date(item.failed_at).getTime()
        const now = Date.now()
        if (now - failedAt < delayMs) {
          continue
        }

        console.log(`[QueueProcessor] Auto-retrying DLQ item ${item.id} (attempt ${retryCount + 1}/${this.autoRetryConfig.maxAttempts})`)
        
        try {
          const taskId = await this.db.retryDeadLetterQueueItem(item.id, item.owner_id ?? undefined)
          console.log(`[QueueProcessor] DLQ item ${item.id} requeued as task ${taskId}`)
        } catch (error) {
          console.error(`[QueueProcessor] Failed to retry DLQ item ${item.id}:`, error)
        }
      }
    } catch (error) {
      console.error('[QueueProcessor] Error in auto-retry processing:', error)
    }
  }

  async getAutoRetryStats(): Promise<{
    enabled: boolean
    dlqItemCount: number
    pendingRetryCount: number
    config: AutoRetryConfig
  }> {
    const dlqItems = await this.db.getDeadLetterQueueItems(undefined, 1000)
    const pendingRetry = dlqItems.filter(item => 
      !item.resolved_at && (item.retry_count ?? 0) < this.autoRetryConfig.maxAttempts
    )

    return {
      enabled: this.autoRetryConfig.enabled,
      dlqItemCount: dlqItems.length,
      pendingRetryCount: pendingRetry.length,
      config: this.autoRetryConfig,
    }
  }
}

export function createQueueProcessor(
  db: DatabaseService,
  taskExecutor: ITaskExecutor,
  capacityChecker: CapacityChecker,
  eventBus: IEventBus,
  autoRetryConfig?: Partial<AutoRetryConfig>
): QueueProcessor {
  return new QueueProcessor(db, taskExecutor, capacityChecker, eventBus, autoRetryConfig)
}

let queueProcessorInstance: QueueProcessor | null = null

export function getQueueProcessor(
  db: DatabaseService,
  taskExecutor: ITaskExecutor,
  capacityChecker: CapacityChecker,
  eventBus: IEventBus,
  autoRetryConfig?: Partial<AutoRetryConfig>
): QueueProcessor {
  if (!queueProcessorInstance) {
    queueProcessorInstance = createQueueProcessor(db, taskExecutor, capacityChecker, eventBus, autoRetryConfig)
  }
  return queueProcessorInstance
}

export function resetQueueProcessor(): void {
  queueProcessorInstance = null
}
