/**
 * JobService Domain Interface
 * 
 * Defines the contract for all CronJob-related operations.
 */

import type { CronJob, CreateCronJob, UpdateCronJob, RunStats } from '../../../database/types.js'

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
   * @param id - Job ID
   * @param stats - Run statistics
   * @param ownerId - Owner ID (required for authorization)
   */
  updateRunStats(id: string, stats: RunStats, ownerId: string): Promise<CronJob | null>

  /**
   * Update job last run timestamp and next scheduled run
   */
  updateLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null>
}
