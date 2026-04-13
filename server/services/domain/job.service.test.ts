import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobService } from './job.service.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { CronJob, CreateCronJob, UpdateCronJob } from '../../database/types.js'

describe('JobService', () => {
  let service: JobService
  let mockDb: {
    getAllCronJobs: ReturnType<typeof vi.fn>
    getCronJobById: ReturnType<typeof vi.fn>
    createCronJob: ReturnType<typeof vi.fn>
    updateCronJob: ReturnType<typeof vi.fn>
    deleteCronJob: ReturnType<typeof vi.fn>
    toggleCronJobActive: ReturnType<typeof vi.fn>
    getActiveCronJobs: ReturnType<typeof vi.fn>
    getJobsByTag: ReturnType<typeof vi.fn>
    addJobTag: ReturnType<typeof vi.fn>
    removeJobTag: ReturnType<typeof vi.fn>
    addJobDependency: ReturnType<typeof vi.fn>
    removeJobDependency: ReturnType<typeof vi.fn>
    getJobTags: ReturnType<typeof vi.fn>
    getJobDependencies: ReturnType<typeof vi.fn>
    getJobDependents: ReturnType<typeof vi.fn>
    hasCircularDependency: ReturnType<typeof vi.fn>
    getAllTags: ReturnType<typeof vi.fn>
    updateCronJobRunStats: ReturnType<typeof vi.fn>
    updateCronJobLastRun: ReturnType<typeof vi.fn>
  }

  const mockJob: CronJob = {
    id: 'job-1',
    name: 'Test Job',
    cron_expression: '0 * * * *',
    description: null,
    workflow_id: null,
    owner_id: null,
    is_active: true,
    last_run_at: null,
    next_run_at: null,
    total_runs: 0,
    total_failures: 0,
    timeout_ms: 300000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    timezone: 'UTC',
    misfire_policy: 'fire_once',
  }

  beforeEach(() => {
    mockDb = {
      getAllCronJobs: vi.fn(),
      getCronJobById: vi.fn(),
      createCronJob: vi.fn(),
      updateCronJob: vi.fn(),
      deleteCronJob: vi.fn(),
      toggleCronJobActive: vi.fn(),
      getActiveCronJobs: vi.fn(),
      getJobsByTag: vi.fn(),
      addJobTag: vi.fn(),
      removeJobTag: vi.fn(),
      addJobDependency: vi.fn(),
      removeJobDependency: vi.fn(),
      getJobTags: vi.fn(),
      getJobDependencies: vi.fn(),
      getJobDependents: vi.fn(),
      hasCircularDependency: vi.fn(),
      getAllTags: vi.fn(),
      updateCronJobRunStats: vi.fn(),
      updateCronJobLastRun: vi.fn(),
    }
    service = new JobService(mockDb as unknown as DatabaseService)
  })

  describe('getAll', () => {
    it('should return all jobs for owner', async () => {
      mockDb.getAllCronJobs.mockResolvedValue([mockJob])
      const result = await service.getAll('owner-1')
      expect(mockDb.getAllCronJobs).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual([mockJob])
    })
  })

  describe('getById', () => {
    it('should return job by id', async () => {
      mockDb.getCronJobById.mockResolvedValue(mockJob)
      const result = await service.getById('job-1', 'owner-1')
      expect(mockDb.getCronJobById).toHaveBeenCalledWith('job-1', 'owner-1')
      expect(result).toEqual(mockJob)
    })

    it('should return null if not found', async () => {
      mockDb.getCronJobById.mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new job', async () => {
      const createData: CreateCronJob = {
        name: 'New Job',
        cron_expression: '0 * * * *',
      }
      mockDb.getAllCronJobs.mockResolvedValue([])
      mockDb.createCronJob.mockResolvedValue({ ...mockJob, name: 'New Job' })
      const result = await service.create(createData, 'owner-1')
      expect(mockDb.createCronJob).toHaveBeenCalledWith(createData, 'owner-1')
      expect(result.name).toBe('New Job')
    })

    it('should validate cron expression before creating job', async () => {
      const createData: CreateCronJob = {
        name: 'New Job',
        cron_expression: 'invalid-expression',
      }
      await expect(service.create(createData, 'owner-1')).rejects.toThrow('Invalid cron expression')
    })

    it('should check duplicate names before creating job', async () => {
      const createData: CreateCronJob = {
        name: 'Test Job',
        cron_expression: '0 * * * *',
      }
      mockDb.getAllCronJobs.mockResolvedValue([mockJob])
      await expect(service.create(createData, 'owner-1')).rejects.toThrow('Job with name "Test Job" already exists')
    })
  })

  describe('update', () => {
    it('should update an existing job', async () => {
      const updateData: UpdateCronJob = { name: 'Updated Job' }
      const updatedJob = { ...mockJob, name: 'Updated Job' }
      mockDb.updateCronJob.mockResolvedValue(updatedJob)
      const result = await service.update('job-1', updateData, 'owner-1')
      expect(mockDb.updateCronJob).toHaveBeenCalledWith('job-1', updateData, 'owner-1')
      expect(result).toEqual(updatedJob)
    })

    it('should throw if job not found', async () => {
      mockDb.updateCronJob.mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow('CronJob not found: nonexistent')
    })
  })

  describe('delete', () => {
    it('should delete a job', async () => {
      mockDb.deleteCronJob.mockResolvedValue(true)
      await service.delete('job-1', 'owner-1')
      expect(mockDb.deleteCronJob).toHaveBeenCalledWith('job-1', 'owner-1')
    })

    it('should throw if job not found', async () => {
      mockDb.deleteCronJob.mockResolvedValue(false)
      await expect(service.delete('nonexistent')).rejects.toThrow('CronJob not found: nonexistent')
    })
  })

  describe('toggle', () => {
    it('should toggle job active state', async () => {
      const toggledJob = { ...mockJob, is_active: false }
      mockDb.toggleCronJobActive.mockResolvedValue(toggledJob)
      const result = await service.toggle('job-1', 'owner-1')
      expect(mockDb.toggleCronJobActive).toHaveBeenCalledWith('job-1', 'owner-1')
      expect(result.is_active).toBe(false)
    })

    it('should throw if job not found', async () => {
      mockDb.toggleCronJobActive.mockResolvedValue(null)
      await expect(service.toggle('nonexistent')).rejects.toThrow('CronJob not found: nonexistent')
    })
  })

  describe('toggleActive (business logic)', () => {
    it('should check dependencies before activating job', async () => {
      const jobBeingActivated = { ...mockJob, id: 'job-1', is_active: false }
      const inactiveDependency = { ...mockJob, id: 'job-2', is_active: false }
      
      mockDb.getCronJobById.mockResolvedValueOnce(jobBeingActivated)
      mockDb.getJobDependencies.mockResolvedValue(['job-2'])
      mockDb.getCronJobById.mockResolvedValueOnce(inactiveDependency)
      
      await expect(service.toggleActive('job-1', true, 'owner-1')).rejects.toThrow('Dependency job-2 is not active')
    })

    it('should allow activating job when all dependencies are active', async () => {
      const jobBeingActivated = { ...mockJob, id: 'job-1', is_active: false }
      const activeDependency = { ...mockJob, id: 'job-2', is_active: true }
      const activatedJob = { ...mockJob, id: 'job-1', is_active: true }
      
      mockDb.getCronJobById.mockResolvedValueOnce(jobBeingActivated)
      mockDb.getJobDependencies.mockResolvedValue(['job-2'])
      mockDb.getCronJobById.mockResolvedValueOnce(activeDependency)
      mockDb.toggleCronJobActive.mockResolvedValue(activatedJob)
      
      const result = await service.toggleActive('job-1', true, 'owner-1')
      expect(result.is_active).toBe(true)
    })

    it('should allow activating job with no dependencies', async () => {
      const jobBeingActivated = { ...mockJob, id: 'job-1', is_active: false }
      const activatedJob = { ...mockJob, id: 'job-1', is_active: true }
      
      mockDb.getCronJobById.mockResolvedValueOnce(jobBeingActivated)
      mockDb.getJobDependencies.mockResolvedValue([])
      mockDb.toggleCronJobActive.mockResolvedValue(activatedJob)
      
      const result = await service.toggleActive('job-1', true, 'owner-1')
      expect(result.is_active).toBe(true)
    })
  })

  describe('update (business logic)', () => {
    it('should validate cron expression when updating job', async () => {
      const updateData: UpdateCronJob = { cron_expression: 'invalid-expression' }
      mockDb.updateCronJob.mockResolvedValue(null)
      
      await expect(service.update('job-1', updateData, 'owner-1')).rejects.toThrow('Invalid cron expression')
    })
  })

  describe('getActive', () => {
    it('should return all active jobs', async () => {
      mockDb.getActiveCronJobs.mockResolvedValue([mockJob])
      const result = await service.getActive()
      expect(mockDb.getActiveCronJobs).toHaveBeenCalled()
      expect(result).toEqual([mockJob])
    })
  })

  describe('tag operations', () => {
    it('should get jobs by tag', async () => {
      mockDb.getJobsByTag.mockResolvedValue([mockJob])
      const result = await service.getWithTag('important')
      expect(mockDb.getJobsByTag).toHaveBeenCalledWith('important')
      expect(result).toEqual([mockJob])
    })

    it('should add tag to job', async () => {
      mockDb.addJobTag.mockResolvedValue(undefined)
      await service.addTag('job-1', 'important')
      expect(mockDb.addJobTag).toHaveBeenCalledWith('job-1', 'important')
    })

    it('should remove tag from job', async () => {
      mockDb.removeJobTag.mockResolvedValue(undefined)
      await service.removeTag('job-1', 'important')
      expect(mockDb.removeJobTag).toHaveBeenCalledWith('job-1', 'important')
    })

    it('should get job tags', async () => {
      mockDb.getJobTags.mockResolvedValue(['tag1', 'tag2'])
      const result = await service.getTags('job-1')
      expect(result).toEqual(['tag1', 'tag2'])
    })
  })

  describe('dependency operations', () => {
    it('should add dependency', async () => {
      mockDb.addJobDependency.mockResolvedValue(undefined)
      await service.addDependency('job-1', 'job-2')
      expect(mockDb.addJobDependency).toHaveBeenCalledWith('job-1', 'job-2')
    })

    it('should remove dependency', async () => {
      mockDb.removeJobDependency.mockResolvedValue(undefined)
      await service.removeDependency('job-1', 'job-2')
      expect(mockDb.removeJobDependency).toHaveBeenCalledWith('job-1', 'job-2')
    })

    it('should check circular dependency', async () => {
      mockDb.hasCircularDependency.mockResolvedValue(false)
      const result = await service.hasCircularDependency('job-1', 'job-2')
      expect(result).toBe(false)
    })
  })
})