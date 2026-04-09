/**
 * TaskService Domain Interface
 *
 * Defines the contract for all task queue operations.
 */

import type { TaskQueueItem, CreateTaskQueueItem, UpdateTaskQueueItem, DeadLetterQueueItem, TaskStatus } from '../../../database/types.js'

export interface TaskQueryFilter {
  status?: TaskStatus
  ownerId?: string
  jobId?: string
  limit?: number
  offset?: number
}

export interface TaskQueryResult {
  tasks: TaskQueueItem[]
  total: number
}

export interface ITaskService {
  /**
   * Create a new task
   */
  create(data: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem>

  /**
   * Get a single task by ID
   */
  getById(id: string, ownerId?: string): Promise<TaskQueueItem | null>

  /**
   * Update an existing task
   */
  update(id: string, data: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem>

  /**
   * Delete a task
   */
  delete(id: string, ownerId?: string): Promise<void>

  /**
   * Get all tasks with pagination and filtering
   */
  getAll(filter: TaskQueryFilter): Promise<TaskQueryResult>

  /**
   * Get pending tasks, optionally limited
   */
  getPending(limit?: number): Promise<TaskQueueItem[]>

  /**
   * Get tasks by status, optionally filtered by owner
   */
  getByStatus(status: TaskStatus, ownerId?: string): Promise<TaskQueueItem[]>

  /**
   * Move a task to the dead letter queue
   */
  moveToDeadLetter(taskId: string, error: string, ownerId?: string): Promise<void>

  /**
   * Retry a task from the dead letter queue
   */
  retryFromDeadLetter(taskId: string, ownerId?: string): Promise<TaskQueueItem>

  /**
   * Get all items in the dead letter queue
   */
  getDeadLetterQueue(ownerId?: string, limit?: number): Promise<DeadLetterQueueItem[]>

  /**
   * Get a single dead letter queue item by ID
   */
  getDeadLetterItemById(id: string, ownerId?: string): Promise<DeadLetterQueueItem | null>

  /**
   * Resolve a dead letter queue item (mark as deleted or resolved)
   */
  resolveDeadLetterItem(id: string, resolution: string, ownerId?: string): Promise<void>

  /**
   * Increment the retry count for a task
   */
  incrementRetryCount(id: string): Promise<void>

  /**
   * Get tasks by job ID
   */
  getByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]>

  /**
   * Mark a task as running
   */
  markRunning(id: string): Promise<TaskQueueItem | null>

  /**
   * Mark a task as completed
   */
  markCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null>

  /**
   * Mark a task as failed
   */
  markFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null>
}
