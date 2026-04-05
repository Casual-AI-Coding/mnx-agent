/**
 * TaskService Implementation
 *
 * Domain service handling all task queue operations.
 * Delegates to DatabaseService for data access.
 */

import type { DatabaseService } from '../../database/service-async.js'
import type { TaskQueueItem, CreateTaskQueueItem, UpdateTaskQueueItem, DeadLetterQueueItem } from '../../database/types.js'
import type { TaskStatus } from '../../database/types.js'
import type { ITaskService } from './interfaces.js'

export class TaskService implements ITaskService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    return this.db.createTask(data, ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.db.getTaskById(id, ownerId)
  }

  async update(id: string, data: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    const result = await this.db.updateTask(id, data, ownerId)
    if (!result) {
      throw new Error(`Task not found: ${id}`)
    }
    return result
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.db.deleteTask(id, ownerId)
    if (!deleted) {
      throw new Error(`Task not found: ${id}`)
    }
  }

  async getPending(limit?: number): Promise<TaskQueueItem[]> {
    return this.db.getPendingTasksByJob(null, limit ?? 10)
  }

  async getByStatus(status: TaskStatus, ownerId?: string): Promise<TaskQueueItem[]> {
    const result = await this.db.getAllTasks({ status, ownerId, limit: 100 })
    return result.tasks
  }

  async moveToDeadLetter(taskId: string, error: string, ownerId?: string): Promise<void> {
    const task = await this.db.getTaskById(taskId, ownerId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    await this.db.createDeadLetterQueueItem({
      original_task_id: task.id,
      job_id: task.job_id ?? undefined,
      task_type: task.task_type,
      payload: typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload,
      error_message: error,
      retry_count: task.retry_count,
      max_retries: task.max_retries,
      owner_id: task.owner_id,
    })

    await this.db.deleteTask(taskId, ownerId)
  }

  async retryFromDeadLetter(taskId: string, ownerId?: string): Promise<TaskQueueItem> {
    const newTaskId = await this.db.retryDeadLetterQueueItem(taskId, ownerId)
    const newTask = await this.db.getTaskById(newTaskId)
    if (!newTask) {
      throw new Error(`Failed to retry task: ${taskId}`)
    }
    return newTask
  }

  async getDeadLetterQueue(ownerId?: string): Promise<DeadLetterQueueItem[]> {
    return this.db.getDeadLetterQueueItems(ownerId)
  }

  async incrementRetryCount(id: string): Promise<void> {
    const task = await this.db.getTaskById(id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }
    await this.db.updateTask(id, { retry_count: task.retry_count + 1 })
  }

  async getByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.db.getTasksByJobId(jobId, ownerId)
  }

  async markRunning(id: string): Promise<TaskQueueItem | null> {
    return this.db.markTaskRunning(id)
  }

  async markCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.db.markTaskCompleted(id, result, ownerId)
  }

  async markFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.db.markTaskFailed(id, error, ownerId)
  }
}
