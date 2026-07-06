/**
 * JobService Implementation
 * 
 * Domain service handling all CronJob-related operations.
 * Depends directly on JobRepository, not the DatabaseService God Facade.
 */

import type { CronJob, CreateCronJob, UpdateCronJob, RunStats } from '../../database/types.js'
import type { IJobService } from './interfaces/index.js'
import type { JobRepository } from '../../repositories/index.js'
import { validateCronExpression } from '../../utils/cron-validator.js'

export class JobService implements IJobService {
  constructor(private readonly jobRepo: JobRepository) {}

  async getAll(ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getAll(ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.getById(id, ownerId)
  }

  async create(data: CreateCronJob, ownerId?: string): Promise<CronJob> {
    if (!validateCronExpression(data.cron_expression)) {
      throw new Error('Invalid cron expression')
    }
    
    const existing = await this.jobRepo.getAll(ownerId)
    if (existing.some(j => j.name === data.name)) {
      throw new Error(`Job with name "${data.name}" already exists`)
    }
    
    return this.jobRepo.create(data, ownerId)
  }

  async update(id: string, data: UpdateCronJob, ownerId?: string): Promise<CronJob> {
    if (data.cron_expression && !validateCronExpression(data.cron_expression)) {
      throw new Error('Invalid cron expression')
    }
    
    const result = await this.jobRepo.update(id, data, ownerId)
    if (!result) {
      throw new Error(`CronJob not found: ${id}`)
    }
    return result
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.jobRepo.delete(id, ownerId)
    if (!deleted) {
      throw new Error(`CronJob not found: ${id}`)
    }
  }

  async toggle(id: string, ownerId?: string): Promise<CronJob> {
    const result = await this.jobRepo.toggleActive(id, ownerId)
    if (!result) {
      throw new Error(`CronJob not found: ${id}`)
    }
    return result
  }

  async toggleActive(id: string, active: boolean, ownerId?: string): Promise<CronJob | null> {
    const job = await this.jobRepo.getById(id, ownerId)
    if (!job) {
      throw new Error(`CronJob not found: ${id}`)
    }
    
    if (active) {
      const dependencies = await this.jobRepo.getDependencies(id)
      for (const depJobId of dependencies) {
        const depJob = await this.jobRepo.getById(depJobId, ownerId)
        if (!depJob?.is_active) {
          throw new Error(`Dependency ${depJobId} is not active`)
        }
      }
    }
    
    return this.jobRepo.toggleActive(id, ownerId)
  }

  async getActive(): Promise<CronJob[]> {
    return this.jobRepo.getActive()
  }

  async getWithTag(tag: string): Promise<CronJob[]> {
    return this.jobRepo.getByTag(tag)
  }

  async addTag(jobId: string, tag: string): Promise<void> {
    await this.jobRepo.addTag(jobId, tag)
  }

  async removeTag(jobId: string, tag: string): Promise<void> {
    await this.jobRepo.removeTag(jobId, tag)
  }

  async addDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    await this.jobRepo.addDependency(jobId, dependsOnJobId)
  }

  async removeDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    await this.jobRepo.removeDependency(jobId, dependsOnJobId)
  }

  async getTags(jobId: string): Promise<string[]> {
    return this.jobRepo.getTags(jobId)
  }

  async getDependencies(jobId: string): Promise<string[]> {
    return this.jobRepo.getDependencies(jobId)
  }

  async getDependents(jobId: string): Promise<string[]> {
    return this.jobRepo.getDependents(jobId)
  }

  async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
    const visited = new Set<string>()
    const queue = [dependsOnJobId]

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue
      if (current === jobId) {
        return true
      }
      if (visited.has(current)) {
        continue
      }
      visited.add(current)

      const dependencies = await this.jobRepo.getDependencies(current)
      if (dependencies?.length) {
        queue.push(...dependencies)
      }
    }

    return false
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    return this.jobRepo.getAllTags()
  }

  async updateRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.updateRunStats(id, stats, ownerId)
  }

  async updateLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.updateLastRun(id, nextRun, ownerId)
  }
}
