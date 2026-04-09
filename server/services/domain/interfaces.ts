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

/**
 * LogService Domain Interface
 *
 * Defines the contract for all ExecutionLog-related operations.
 */

import type { ExecutionLog, ExecutionLogDetail, CreateExecutionLog, CreateExecutionLogDetail, UpdateExecutionLog } from '../../database/types.js'

/**
 * MediaFilter
 */
export interface MediaFilter {
  type?: string
  source?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
  ownerId?: string
}

/**
 * MediaQueryResult
 */
export interface MediaQueryResult {
  records: MediaRecord[]
  total: number
}

/**
 * IMediaService Domain Interface
 *
 * Defines the contract for all MediaRecord-related operations.
 */
import type { MediaRecord, CreateMediaRecord } from '../../database/types.js'

export interface IMediaService {
  /**
   * Get a single media record by ID
   */
  getById(id: string, ownerId?: string): Promise<MediaRecord | null>

  /**
   * Get all media records with pagination and filtering
   */
  getAll(filter: MediaFilter): Promise<MediaQueryResult>

  /**
   * Create a new media record
   */
  create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord>

  /**
   * Update an existing media record
   */
  update(id: string, data: Partial<MediaRecord>, ownerId?: string): Promise<MediaRecord | null>

  /**
   * Soft delete a media record
   */
  softDelete(id: string, ownerId?: string): Promise<boolean>

  /**
   * Hard delete a media record
   */
  hardDelete(id: string, ownerId?: string): Promise<boolean>

  /**
   * Get multiple media records by IDs
   */
  getByIds(ids: string[], ownerId?: string): Promise<MediaRecord[]>
}

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

/**
 * WebhookService Domain Interface
 *
 * Defines the contract for all WebhookConfig and WebhookDelivery operations.
 */

import type { WebhookConfig, WebhookDelivery, CreateWebhookConfig, UpdateWebhookConfig, CreateWebhookDelivery } from '../../database/types.js'

export interface IWebhookService {
  /**
   * Get all webhook configs, optionally filtered by owner
   */
  getAll(ownerId?: string): Promise<WebhookConfig[]>

  /**
   * Get a single webhook config by ID
   */
  getById(id: string, ownerId?: string): Promise<WebhookConfig | null>

  /**
   * Get webhook configs by job ID
   */
  getByJobId(jobId: string, ownerId?: string): Promise<WebhookConfig[]>

  /**
   * Create a new webhook config
   */
  create(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig>

  /**
   * Update an existing webhook config
   */
  update(id: string, data: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig>

  /**
   * Delete a webhook config
   */
  delete(id: string, ownerId?: string): Promise<void>

  /**
   * Get deliveries for a webhook
   */
  getDeliveries(webhookId: string, limit?: number, ownerId?: string): Promise<WebhookDelivery[]>

  /**
   * Create a new webhook delivery record
   */
  createDelivery(data: CreateWebhookDelivery): Promise<WebhookDelivery>
}

/**
 * WorkflowService Domain Interface
 *
 * Defines the contract for all WorkflowTemplate-related operations.
 */

import type { WorkflowTemplate, WorkflowVersion, CreateWorkflowTemplate, UpdateWorkflowTemplate, CreateWorkflowVersion } from '../../database/types.js'

export interface IWorkflowService {
  /**
   * Get a single workflow template by ID
   */
  getById(id: string, ownerId?: string): Promise<WorkflowTemplate | null>

  /**
   * Get all workflow templates, optionally filtered by owner
   */
  getAll(ownerId?: string): Promise<WorkflowTemplate[]>

  /**
   * Get workflow templates with pagination
   */
  getPaginated(page: number, limit: number, ownerId?: string): Promise<{ templates: WorkflowTemplate[]; total: number }>

  /**
   * Get marked (public) workflow templates
   */
  getMarked(ownerId?: string): Promise<WorkflowTemplate[]>

  /**
   * Create a new workflow template
   */
  create(data: CreateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate>

  /**
   * Update an existing workflow template
   */
  update(id: string, data: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null>

  /**
   * Delete a workflow template
   */
  delete(id: string, ownerId?: string): Promise<void>

  /**
   * Get all versions for a workflow template
   */
  getVersions(templateId: string): Promise<WorkflowVersion[]>

  /**
   * Get the active version for a workflow template
   */
  getActiveVersion(templateId: string): Promise<WorkflowVersion | null>

  /**
   * Create a new workflow version
   */
  createVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion>

  /**
   * Activate a workflow version
   */
  activateVersion(versionId: string): Promise<WorkflowVersion | null>

  /**
   * Delete a workflow version
   */
  deleteVersion(versionId: string): Promise<void>
}

/**
 * CapacityService Domain Interface
 *
 * Defines the contract for all CapacityRecord-related operations.
 */

import type { CapacityRecord, UpdateCapacityRecord } from '../../database/types.js'

export interface ICapacityService {
  /**
   * Get all capacity records
   */
  getAll(): Promise<CapacityRecord[]>

  /**
   * Get a capacity record by service type
   */
  getByService(serviceType: string): Promise<CapacityRecord | null>

  /**
   * Upsert a capacity record
   */
  upsert(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord>

  /**
   * Update capacity remaining quota
   */
  updateCapacity(serviceType: string, remaining: number): Promise<void>

  /**
   * Decrement capacity by amount
   */
  decrementCapacity(serviceType: string, amount?: number): Promise<CapacityRecord | null>
}
