/**
 * Task Repository Port
 */

import type { TaskQueueItem } from '@mnx/shared-types/entities'
import { TaskStatus } from '@mnx/shared-types/entities'
import type { PaginationParams, PaginatedResult, RepositoryWithOwner } from './repository-port'

export type { PaginationParams, PaginatedResult }
export { TaskStatus }

export interface TaskRepositoryPort extends RepositoryWithOwner<TaskQueueItem> {
  findPending(params?: PaginationParams): Promise<PaginatedResult<TaskQueueItem>>
  findByStatus(status: TaskStatus, params?: PaginationParams): Promise<PaginatedResult<TaskQueueItem>>
  findByJobId(jobId: string, params?: PaginationParams): Promise<PaginatedResult<TaskQueueItem>>
  updateStatus(
    taskId: string,
    status: TaskStatus,
    updates?: {
      started_at?: string | null
      completed_at?: string | null
      error_message?: string | null
      result?: string | null
    }
  ): Promise<void>
  updateStatusBatch(taskIds: string[], status: TaskStatus): Promise<number>
  markRunning(taskId: string): Promise<TaskQueueItem | null>
  markCompleted(taskId: string, result?: string): Promise<TaskQueueItem | null>
  markFailed(taskId: string, error: string): Promise<TaskQueueItem | null>
  incrementRetryCount(taskId: string): Promise<TaskQueueItem | null>
  getPendingByJob(jobId: string | null, limit: number): Promise<TaskQueueItem[]>
  getPendingByType(taskType: string, limit: number): Promise<TaskQueueItem[]>
  getNextPending(limit?: number): Promise<TaskQueueItem[]>
  getCountsByStatus(): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }>
  getQueueStats(jobId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }>
  getPayload(id: string): Promise<{ payload: string; result: string | null } | null>
}

export interface TaskListOptions {
  status?: TaskStatus
  ownerId?: string
  jobId?: string
  limit?: number
  offset?: number
}
