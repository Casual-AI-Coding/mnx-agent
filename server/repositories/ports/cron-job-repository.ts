/**
 * CronJob Repository Port
 */

import type { CronJob, RunStats } from '@mnx/shared-types/entities'
import type { PaginationParams, PaginatedResult, RepositoryWithOwner } from './repository-port'

export type { PaginationParams, PaginatedResult }

export interface CronJobRepositoryPort extends RepositoryWithOwner<CronJob> {
  findActive(params?: PaginationParams): Promise<PaginatedResult<CronJob>>
  findByTag(tag: string, params?: PaginationParams): Promise<PaginatedResult<CronJob>>
  getAllTags(): Promise<{ tag: string; count: number }[]>
  toggleActive(id: string): Promise<CronJob | null>
  updateRunStats(id: string, stats: RunStats): Promise<CronJob | null>
  updateLastRun(id: string, nextRun: string): Promise<CronJob | null>
  addTag(jobId: string, tag: string): Promise<void>
  removeTag(jobId: string, tag: string): Promise<void>
  getTags(jobId: string): Promise<string[]>
  addDependency(jobId: string, dependsOnJobId: string): Promise<void>
  removeDependency(jobId: string, dependsOnJobId: string): Promise<void>
  getDependencies(jobId: string): Promise<string[]>
  getDependents(jobId: string): Promise<string[]>
  hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean>
}

export interface CreateCronJobPort {
  name: string
  description?: string | null
  cron_expression: string
  timezone?: string
  workflow_id?: string | null
  is_active?: boolean
  timeout_ms?: number
  owner_id?: string | null
}

export interface UpdateCronJobPort {
  name?: string
  description?: string | null
  cron_expression?: string
  timezone?: string
  workflow_id?: string | null
  is_active?: boolean
  last_run_at?: string | null
  next_run_at?: string | null
  total_runs?: number
  total_failures?: number
  timeout_ms?: number
}
