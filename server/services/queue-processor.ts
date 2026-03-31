import type { DatabaseService } from '../database'
import { TaskStatus, TaskQueueRow } from '../database/types'
import type { TaskResult } from './workflow-engine'

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
}

export class QueueProcessor {
  private db: DatabaseService
  private taskExecutor: TaskExecutor
  private capacityChecker: CapacityChecker

  constructor(
    db: DatabaseService,
    taskExecutor: TaskExecutor,
    capacityChecker: CapacityChecker
  ) {
    this.db = db
    this.taskExecutor = taskExecutor
    this.capacityChecker = capacityChecker
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
            await this.requeueTask(task)
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

  async getPendingTasks(jobId: string, limit: number): Promise<TaskQueueRow[]> {
    return this.db.getPendingTasks(jobId, limit)
  }

  async cancelPendingTasks(jobId: string): Promise<number> {
    const pendingTasks = await this.db.getPendingTasks(jobId, 1000)
    let cancelledCount = 0

    for (const task of pendingTasks) {
      if (task.status === TaskStatus.PENDING) {
        await this.db.updateTaskStatus(task.id, TaskStatus.CANCELLED, {})
        cancelledCount++
      }
    }

    return cancelledCount
  }

  async retryFailedTasks(jobId: string): Promise<number> {
    const pendingTasks = await this.db.getPendingTasks(jobId, 1000)
    let retriedCount = 0

    for (const task of pendingTasks) {
      if (task.status === TaskStatus.FAILED) {
        this.db.updateTask(task.id, {
          status: TaskStatus.PENDING,
          retry_count: 0,
          error_message: null,
        })
        retriedCount++
      }
    }

    return retriedCount
  }

  private async executeTaskWithLifecycle(task: TaskQueueRow): Promise<TaskResult> {
    const startTime = Date.now()

    this.db.updateTask(task.id, {
      status: TaskStatus.RUNNING,
      started_at: new Date().toISOString(),
    })

    try {
      const payload = JSON.parse(task.payload)
      const result = await this.taskExecutor.executeTask(task.task_type, payload)

      this.db.updateTask(task.id, {
        status: TaskStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        result: JSON.stringify(result.data),
      })

      return result

    } catch (error) {
      const errorMessage = (error as Error).message

      this.db.updateTask(task.id, {
        status: TaskStatus.FAILED,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })

      return {
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async requeueTask(task: TaskQueueRow): Promise<void> {
    this.db.updateTask(task.id, {
      status: TaskStatus.PENDING,
      retry_count: task.retry_count + 1,
      started_at: null,
    })
  }

  async getQueueStats(jobId: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
  }> {
    const tasks = await this.db.getPendingTasks(jobId, 10000)

    const stats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }

    for (const task of tasks) {
      switch (task.status) {
        case TaskStatus.PENDING:
          stats.pending++
          break
        case TaskStatus.RUNNING:
          stats.running++
          break
        case TaskStatus.COMPLETED:
          stats.completed++
          break
        case TaskStatus.FAILED:
          stats.failed++
          break
        case TaskStatus.CANCELLED:
          stats.cancelled++
          break
      }
    }

    return stats
  }

  async processBatch(
    jobId: string,
    batch: TaskQueueRow[],
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
          await this.requeueTask(task)
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
}