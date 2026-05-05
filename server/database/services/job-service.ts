import type { CronJob, CreateCronJob, RunStats, UpdateCronJob } from '../types.js'
import type { JobRepository } from '../../repositories/index.js'

export class JobService {
  constructor(private readonly jobRepo: JobRepository) {}

  async getAllCronJobs(ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getAll(ownerId)
  }

  async getCronJobById(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.getById(id, ownerId)
  }

  async createCronJob(job: CreateCronJob, ownerId?: string): Promise<CronJob> {
    return this.jobRepo.create(job, ownerId)
  }

  async updateCronJob(id: string, updates: UpdateCronJob, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.update(id, updates, ownerId)
  }

  async deleteCronJob(id: string, ownerId?: string): Promise<boolean> {
    return this.jobRepo.delete(id, ownerId)
  }

  async toggleCronJobActive(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.toggleActive(id, ownerId)
  }

  async updateCronJobRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.updateRunStats(id, stats, ownerId)
  }

  async updateCronJobLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.updateLastRun(id, nextRun, ownerId)
  }

  async getActiveCronJobs(ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getActive(ownerId)
  }

  async addJobTag(jobId: string, tag: string): Promise<void> {
    return this.jobRepo.addTag(jobId, tag)
  }

  async removeJobTag(jobId: string, tag: string): Promise<void> {
    return this.jobRepo.removeTag(jobId, tag)
  }

  async getJobTags(jobId: string): Promise<string[]> {
    return this.jobRepo.getTags(jobId)
  }

  async getJobsByTag(tag: string, ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getByTag(tag, ownerId)
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    return this.jobRepo.getAllTags()
  }

  async addJobDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    return this.jobRepo.addDependency(jobId, dependsOnJobId)
  }

  async removeJobDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    return this.jobRepo.removeDependency(jobId, dependsOnJobId)
  }

  async getJobDependencies(jobId: string): Promise<string[]> {
    return this.jobRepo.getDependencies(jobId)
  }

  async getJobDependents(jobId: string): Promise<string[]> {
    return this.jobRepo.getDependents(jobId)
  }

  async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
    return this.jobRepo.hasCircularDependency(jobId, dependsOnJobId)
  }
}
