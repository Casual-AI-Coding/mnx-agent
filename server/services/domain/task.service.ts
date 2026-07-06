/**
 * TaskService Implementation
 *
 * Domain service handling all task queue and dead letter queue operations.
 * Depends directly on TaskRepository and DeadLetterRepository, not the DatabaseService God Facade.
 */

import type { TaskQueueItem, CreateTaskQueueItem, UpdateTaskQueueItem, DeadLetterQueueItem, CreateDeadLetterQueueItem } from '../../database/types.js'
import type { TaskStatus } from '../../database/types.js'
import type { ITaskService, TaskQueryFilter, TaskQueryResult } from './interfaces/index.js'
import type { DeadLetterRepository } from '../../repositories/index.js'
import type { TaskRepository } from '../../repositories/index.js'
import { toLocalISODateString } from '../../lib/date-utils.js'

export class TaskService implements ITaskService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly deadLetterRepo: DeadLetterRepository
  ) {}

  async create(data: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    return this.taskRepo.create(data, ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.getById(id, ownerId)
  }

  async update(id: string, data: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    const result = await this.taskRepo.update(id, data, ownerId)
    if (!result) {
      throw new Error(`Task not found: ${id}`)
    }
    return result
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.taskRepo.delete(id, ownerId)
    if (!deleted) {
      throw new Error(`Task not found: ${id}`)
    }
  }

  async getAll(filter: TaskQueryFilter): Promise<TaskQueryResult> {
    const result = await this.taskRepo.listTasks({
      status: filter.status,
      ownerId: filter.ownerId,
      jobId: filter.jobId,
      limit: filter.limit ?? 100,
      offset: filter.offset ?? 0,
    })
    return result
  }

  async getPending(limit?: number): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByJob(null, limit ?? 10)
  }

  async getByStatus(status: TaskStatus, ownerId?: string): Promise<TaskQueueItem[]> {
    const result = await this.taskRepo.listTasks({ status, ownerId, limit: 100 })
    return result.tasks
  }

  async moveToDeadLetter(taskId: string, error: string, ownerId?: string): Promise<void> {
    const task = await this.taskRepo.getById(taskId, ownerId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload
    const dlqData: CreateDeadLetterQueueItem = {
      original_task_id: task.id,
      job_id: task.job_id ?? undefined,
      task_type: task.task_type,
      payload: payload as Record<string, unknown>,
      error_message: error,
      retry_count: task.retry_count,
      max_retries: task.max_retries,
      owner_id: task.owner_id,
    }
    await this.deadLetterRepo.create(dlqData)
    await this.taskRepo.delete(taskId, ownerId)
  }

  async retryFromDeadLetter(taskId: string, ownerId?: string): Promise<TaskQueueItem> {
    const item = await this.deadLetterRepo.getById(taskId, ownerId)
    if (!item) {
      throw new Error(`Dead letter queue item not found: ${taskId}`)
    }

    const taskData: CreateTaskQueueItem = {
      job_id: item.job_id ?? undefined,
      task_type: item.task_type,
      payload: JSON.stringify(item.payload),
      priority: 0,
      max_retries: item.max_retries,
    }
    const newTask = await this.taskRepo.create(taskData, ownerId)
    await this.deadLetterRepo.markResolved(taskId, 'retried', ownerId)
    return newTask
  }

  async getDeadLetterQueue(ownerId?: string, limit?: number): Promise<DeadLetterQueueItem[]> {
    return this.deadLetterRepo.listItems(ownerId, limit ?? 50)
  }

  async getDeadLetterItemById(id: string, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    return this.deadLetterRepo.getById(id, ownerId)
  }

  async resolveDeadLetterItem(id: string, resolution: string, ownerId?: string): Promise<void> {
    await this.deadLetterRepo.update(id, {
      resolved_at: toLocalISODateString(),
      resolution,
    } as Record<string, unknown>, ownerId)
  }

  async incrementRetryCount(id: string): Promise<void> {
    const task = await this.taskRepo.getById(id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }
    await this.taskRepo.update(id, { retry_count: task.retry_count + 1 })
  }

  async getByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getByJobId(jobId, ownerId)
  }

  async markRunning(id: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markRunning(id)
  }

  async markCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markCompleted(id, result, ownerId)
  }

  async markFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markFailed(id, error, ownerId)
  }

  async getPendingByJobId(jobId: string, limit: number, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByJob(jobId, limit, ownerId)
  }

  async getPendingByType(taskType: string, limit: number, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByType(taskType, limit, ownerId)
  }

  async getQueueStats(jobId?: string): Promise<{
    pending: number; running: number; completed: number; failed: number; cancelled: number; total: number
  }> {
    return this.taskRepo.getQueueStats(jobId)
  }
}
