/**
 * JobService Domain Interface
 * 
 * Defines the contract for all CronJob-related operations.
 */

import type { CronJob, CreateCronJob, UpdateCronJob, RunStats } from '../../database/types.js'

export interface IJobService {
  /**
   * Get all cron jobs, optionally filtered by owner
   */
  getAll(ownerId?: string): Promise<CronJob[]>

  /**
   * Get a single cron job by ID
   */
  getById(id: string, ownerId?: string): Promise<CronJob | null>

  /**
   * Create a new cron job
   */
  create(data: CreateCronJob, ownerId?: string): Promise<CronJob>

  /**
   * Update an existing cron job
   */
  update(id: string, data: UpdateCronJob, ownerId?: string): Promise<CronJob>

  /**
   * Delete a cron job
   */
  delete(id: string, ownerId?: string): Promise<void>

  /**
   * Toggle cron job active status
   */
  toggle(id: string, ownerId?: string): Promise<CronJob>

  /**
   * Get all active cron jobs
   */
  getActive(): Promise<CronJob[]>

  /**
   * Get cron jobs with a specific tag
   */
  getWithTag(tag: string): Promise<CronJob[]>

  /**
   * Add a tag to a job
   */
  addTag(jobId: string, tag: string): Promise<void>

  /**
   * Remove a tag from a job
   */
  removeTag(jobId: string, tag: string): Promise<void>

  /**
   * Add a dependency to a job
   */
  addDependency(jobId: string, dependsOnJobId: string): Promise<void>

  /**
   * Remove a dependency from a job
   */
  removeDependency(jobId: string, dependsOnJobId: string): Promise<void>

  /**
   * Get job tags
   */
  getTags(jobId: string): Promise<string[]>

  /**
   * Get job dependencies
   */
  getDependencies(jobId: string): Promise<string[]>

  /**
   * Get jobs that depend on a specific job
   */
  getDependents(jobId: string): Promise<string[]>

  /**
   * Check if adding a dependency would create a circular reference
   */
  hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean>

  /**
   * Get all unique tags with count
   */
  getAllTags(): Promise<{ tag: string; count: number }[]>

  /**
   * Update job run statistics
   */
  updateRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null>

  /**
   * Update job last run timestamp and next scheduled run
   */
  updateLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null>
}

/**
 * TaskService Domain Interface
 *
 * Defines the contract for all task queue operations.
 */

import type { TaskQueueItem, CreateTaskQueueItem, UpdateTaskQueueItem, DeadLetterQueueItem } from '../../database/types.js'
import type { TaskStatus } from '../../database/types.js'

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
  getDeadLetterQueue(ownerId?: string): Promise<DeadLetterQueueItem[]>

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

/**
 * LogService Domain Interface
 *
 * Defines the contract for all ExecutionLog-related operations.
 */

import type { ExecutionLog, ExecutionLogDetail, CreateExecutionLog, CreateExecutionLogDetail, UpdateExecutionLog } from '../../database/types.js'

export interface LogFilter {
  jobId?: string
  ownerId?: string
  limit?: number
  startDate?: string
  endDate?: string
}

export interface LogStats {
  totalExecutions: number
  successRate: number
  avgDuration: number
  errorCount: number
}

export interface ILogService {
  /**
   * Get all execution logs, optionally filtered
   */
  getAll(filter: LogFilter): Promise<ExecutionLog[]>

  /**
   * Get a single execution log by ID
   */
  getById(id: string, ownerId?: string): Promise<ExecutionLog | null>

  /**
   * Create a new execution log
   */
  create(data: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog>

  /**
   * Update an existing execution log
   */
  update(id: string, data: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog>

  /**
   * Create a new execution log detail entry
   */
  createDetail(data: CreateExecutionLogDetail): Promise<ExecutionLogDetail>

  /**
   * Get all detail entries for a specific execution log
   */
  getDetails(logId: string): Promise<ExecutionLogDetail[]>

  /**
   * Get aggregate statistics for execution logs
   */
  getStats(ownerId?: string): Promise<LogStats>
}
