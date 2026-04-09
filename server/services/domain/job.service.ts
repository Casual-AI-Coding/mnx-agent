/**
 * JobService Implementation
 * 
 * Domain service handling all CronJob-related operations.
 * Delegates to DatabaseService for data access.
 */

import type { DatabaseService } from '../../database/service-async.js'
import type { CronJob, CreateCronJob, UpdateCronJob, RunStats } from '../../database/types.js'
import type { IJobService } from './interfaces/index.js'

export class JobService implements IJobService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(ownerId?: string): Promise<CronJob[]> {
    return this.db.getAllCronJobs(ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.db.getCronJobById(id, ownerId)
  }

  async create(data: CreateCronJob, ownerId?: string): Promise<CronJob> {
    return this.db.createCronJob(data, ownerId)
  }

  async update(id: string, data: UpdateCronJob, ownerId?: string): Promise<CronJob> {
    const result = await this.db.updateCronJob(id, data, ownerId)
    if (!result) {
      throw new Error(`CronJob not found: ${id}`)
    }
    return result
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.db.deleteCronJob(id, ownerId)
    if (!deleted) {
      throw new Error(`CronJob not found: ${id}`)
    }
  }

  async toggle(id: string, ownerId?: string): Promise<CronJob> {
    const result = await this.db.toggleCronJobActive(id, ownerId)
    if (!result) {
      throw new Error(`CronJob not found: ${id}`)
    }
    return result
  }

  async getActive(): Promise<CronJob[]> {
    return this.db.getActiveCronJobs()
  }

  async getWithTag(tag: string): Promise<CronJob[]> {
    return this.db.getJobsByTag(tag)
  }

  async addTag(jobId: string, tag: string): Promise<void> {
    await this.db.addJobTag(jobId, tag)
  }

  async removeTag(jobId: string, tag: string): Promise<void> {
    await this.db.removeJobTag(jobId, tag)
  }

  async addDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    await this.db.addJobDependency(jobId, dependsOnJobId)
  }

  async removeDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    await this.db.removeJobDependency(jobId, dependsOnJobId)
  }

  async getTags(jobId: string): Promise<string[]> {
    return this.db.getJobTags(jobId)
  }

  async getDependencies(jobId: string): Promise<string[]> {
    return this.db.getJobDependencies(jobId)
  }

  async getDependents(jobId: string): Promise<string[]> {
    return this.db.getJobDependents(jobId)
  }

  async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
    return this.db.hasCircularDependency(jobId, dependsOnJobId)
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    return this.db.getAllTags()
  }

  async updateRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null> {
    return this.db.updateCronJobRunStats(id, stats, ownerId)
  }

  async updateLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> {
    return this.db.updateCronJobLastRun(id, nextRun, ownerId)
  }
}
