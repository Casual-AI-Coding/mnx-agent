import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobService } from './job.service.js'
import type { CronJob, CreateCronJob, UpdateCronJob } from '../../database/types.js'

describe('JobService', () => {
  let service: JobService
  let mockRepo: {
    getAll: ReturnType<typeof vi.fn>
    getById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    toggleActive: ReturnType<typeof vi.fn>
    getActive: ReturnType<typeof vi.fn>
    getByTag: ReturnType<typeof vi.fn>
    addTag: ReturnType<typeof vi.fn>
    removeTag: ReturnType<typeof vi.fn>
    addDependency: ReturnType<typeof vi.fn>
    removeDependency: ReturnType<typeof vi.fn>
    getTags: ReturnType<typeof vi.fn>
    getDependencies: ReturnType<typeof vi.fn>
    getDependents: ReturnType<typeof vi.fn>
    getAllTags: ReturnType<typeof vi.fn>
    updateRunStats: ReturnType<typeof vi.fn>
    updateLastRun: ReturnType<typeof vi.fn>
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
    mockRepo = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      toggleActive: vi.fn(),
      getActive: vi.fn(),
      getByTag: vi.fn(),
      addTag: vi.fn(),
      removeTag: vi.fn(),
      addDependency: vi.fn(),
      removeDependency: vi.fn(),
      getTags: vi.fn(),
      getDependencies: vi.fn(),
      getDependents: vi.fn(),
      getAllTags: vi.fn(),
      updateRunStats: vi.fn(),
      updateLastRun: vi.fn(),
    }
    service = new JobService(mockRepo as any)
  })

  describe('getAll', () => {
    it('should return all jobs for owner', async () => {
      mockRepo.getAll.mockResolvedValue([mockJob])
      const result = await service.getAll('owner-1')
      expect(mockRepo.getAll).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual([mockJob])
    })
  })

  describe('getById', () => {
    it('should return job by id', async () => {
      mockRepo.getById.mockResolvedValue(mockJob)
      const result = await service.getById('job-1', 'owner-1')
      expect(mockRepo.getById).toHaveBeenCalledWith('job-1', 'owner-1')
      expect(result).toEqual(mockJob)
    })

    it('should return null if not found', async () => {
      mockRepo.getById.mockResolvedValue(null)
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
      mockRepo.getAll.mockResolvedValue([])
      mockRepo.create.mockResolvedValue({ ...mockJob, name: 'New Job' })
      const result = await service.create(createData, 'owner-1')
      expect(mockRepo.create).toHaveBeenCalledWith(createData, 'owner-1')
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
      mockRepo.getAll.mockResolvedValue([mockJob])
      await expect(service.create(createData, 'owner-1')).rejects.toThrow('Job with name "Test Job" already exists')
    })
  })

  describe('update', () => {
    it('should update an existing job', async () => {
      const updateData: UpdateCronJob = { name: 'Updated Job' }
      const updatedJob = { ...mockJob, name: 'Updated Job' }
      mockRepo.update.mockResolvedValue(updatedJob)
      const result = await service.update('job-1', updateData, 'owner-1')
      expect(mockRepo.update).toHaveBeenCalledWith('job-1', updateData, 'owner-1')
      expect(result).toEqual(updatedJob)
    })

    it('should throw if job not found', async () => {
      mockRepo.update.mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow('CronJob not found: nonexistent')
    })
  })

  describe('delete', () => {
    it('should delete a job', async () => {
      mockRepo.delete.mockResolvedValue(true)
      await service.delete('job-1', 'owner-1')
      expect(mockRepo.delete).toHaveBeenCalledWith('job-1', 'owner-1')
    })

    it('should throw if job not found', async () => {
      mockRepo.delete.mockResolvedValue(false)
      await expect(service.delete('nonexistent')).rejects.toThrow('CronJob not found: nonexistent')
    })
  })

  describe('toggle', () => {
    it('should toggle job active state', async () => {
      const toggledJob = { ...mockJob, is_active: false }
      mockRepo.toggleActive.mockResolvedValue(toggledJob)
      const result = await service.toggle('job-1', 'owner-1')
      expect(mockRepo.toggleActive).toHaveBeenCalledWith('job-1', 'owner-1')
      expect(result.is_active).toBe(false)
    })

    it('should throw if job not found', async () => {
      mockRepo.toggleActive.mockResolvedValue(null)
      await expect(service.toggle('nonexistent')).rejects.toThrow('CronJob not found: nonexistent')
    })
  })

  describe('toggleActive (business logic)', () => {
    it('should check dependencies before activating job', async () => {
      const jobBeingActivated = { ...mockJob, id: 'job-1', is_active: false }
      const inactiveDependency = { ...mockJob, id: 'job-2', is_active: false }
      
      mockRepo.getById.mockResolvedValueOnce(jobBeingActivated)
      mockRepo.getDependencies.mockResolvedValue(['job-2'])
      mockRepo.getById.mockResolvedValueOnce(inactiveDependency)
      
      await expect(service.toggleActive('job-1', true, 'owner-1')).rejects.toThrow('Dependency job-2 is not active')
    })

    it('should allow activating job when all dependencies are active', async () => {
      const jobBeingActivated = { ...mockJob, id: 'job-1', is_active: false }
      const activeDependency = { ...mockJob, id: 'job-2', is_active: true }
      const activatedJob = { ...mockJob, id: 'job-1', is_active: true }
      
      mockRepo.getById.mockResolvedValueOnce(jobBeingActivated)
      mockRepo.getDependencies.mockResolvedValue(['job-2'])
      mockRepo.getById.mockResolvedValueOnce(activeDependency)
      mockRepo.toggleActive.mockResolvedValue(activatedJob)
      
      const result = await service.toggleActive('job-1', true, 'owner-1')
      expect(result.is_active).toBe(true)
    })

    it('should allow activating job with no dependencies', async () => {
      const jobBeingActivated = { ...mockJob, id: 'job-1', is_active: false }
      const activatedJob = { ...mockJob, id: 'job-1', is_active: true }
      
      mockRepo.getById.mockResolvedValueOnce(jobBeingActivated)
      mockRepo.getDependencies.mockResolvedValue([])
      mockRepo.toggleActive.mockResolvedValue(activatedJob)
      
      const result = await service.toggleActive('job-1', true, 'owner-1')
      expect(result.is_active).toBe(true)
    })

    it('should throw if job not found when toggling active', async () => {
      mockRepo.getById.mockResolvedValue(null)
      await expect(service.toggleActive('nonexistent', true)).rejects.toThrow('CronJob not found: nonexistent')
    })

    it('should deactivate job without checking dependencies', async () => {
      const jobToDeactivate = { ...mockJob, id: 'job-1', is_active: true }
      const deactivatedJob = { ...mockJob, id: 'job-1', is_active: false }
      
      mockRepo.getById.mockResolvedValueOnce(jobToDeactivate)
      mockRepo.toggleActive.mockResolvedValue(deactivatedJob)
      
      const result = await service.toggleActive('job-1', false, 'owner-1')
      expect(result.is_active).toBe(false)
      expect(mockRepo.getDependencies).not.toHaveBeenCalled()
    })
  })

  describe('update (business logic)', () => {
    it('should validate cron expression when updating job', async () => {
      const updateData: UpdateCronJob = { cron_expression: 'invalid-expression' }
      mockRepo.update.mockResolvedValue(null)
      
      await expect(service.update('job-1', updateData, 'owner-1')).rejects.toThrow('Invalid cron expression')
    })
  })

  describe('getActive', () => {
    it('should return all active jobs', async () => {
      mockRepo.getActive.mockResolvedValue([mockJob])
      const result = await service.getActive()
      expect(mockRepo.getActive).toHaveBeenCalled()
      expect(result).toEqual([mockJob])
    })
  })

  describe('tag operations', () => {
    it('should get jobs by tag', async () => {
      mockRepo.getByTag.mockResolvedValue([mockJob])
      const result = await service.getWithTag('important')
      expect(mockRepo.getByTag).toHaveBeenCalledWith('important')
      expect(result).toEqual([mockJob])
    })

    it('should add tag to job', async () => {
      mockRepo.addTag.mockResolvedValue(undefined)
      await service.addTag('job-1', 'important')
      expect(mockRepo.addTag).toHaveBeenCalledWith('job-1', 'important')
    })

    it('should remove tag from job', async () => {
      mockRepo.removeTag.mockResolvedValue(undefined)
      await service.removeTag('job-1', 'important')
      expect(mockRepo.removeTag).toHaveBeenCalledWith('job-1', 'important')
    })

    it('should get job tags', async () => {
      mockRepo.getTags.mockResolvedValue(['tag1', 'tag2'])
      const result = await service.getTags('job-1')
      expect(result).toEqual(['tag1', 'tag2'])
    })
  })

  describe('dependency operations', () => {
    it('should add dependency', async () => {
      mockRepo.addDependency.mockResolvedValue(undefined)
      await service.addDependency('job-1', 'job-2')
      expect(mockRepo.addDependency).toHaveBeenCalledWith('job-1', 'job-2')
    })

    it('should remove dependency', async () => {
      mockRepo.removeDependency.mockResolvedValue(undefined)
      await service.removeDependency('job-1', 'job-2')
      expect(mockRepo.removeDependency).toHaveBeenCalledWith('job-1', 'job-2')
    })

    it('should check circular dependency', async () => {
      mockRepo.getDependencies.mockResolvedValue([])
      const result = await service.hasCircularDependency('job-1', 'job-2')
      expect(result).toBe(false)
    })
  })
})