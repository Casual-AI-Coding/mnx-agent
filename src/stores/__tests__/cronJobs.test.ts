import { renderHook, waitFor, act } from '@testing-library/react'
import { useCronJobsStore } from '../cronJobs'

vi.mock('@/lib/api/cron', () => ({
  getCronJobs: vi.fn(),
  createCronJob: vi.fn(),
  updateCronJob: vi.fn(),
  deleteCronJob: vi.fn(),
  toggleCronJob: vi.fn(),
  runCronJob: vi.fn(),
  addJobTag: vi.fn(),
  removeJobTag: vi.fn(),
  getJobTags: vi.fn(),
  addJobDependency: vi.fn(),
  removeJobDependency: vi.fn(),
  getJobDependencies: vi.fn(),
}))

import {
  getCronJobs,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  toggleCronJob,
  runCronJob,
  addJobTag,
  removeJobTag,
  getJobTags,
  addJobDependency,
  removeJobDependency,
  getJobDependencies,
} from '@/lib/api/cron'

const mockBackendJob = {
  id: 'job-1',
  name: 'Test Job',
  description: 'Test description',
  cron_expression: '0 * * * *',
  is_active: 1,
  workflow_json: '{"nodes":[],"edges":[]}',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_run_at: null,
  next_run_at: '2024-01-02T00:00:00Z',
  total_runs: 0,
  total_failures: 0,
}

describe('useCronJobsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useCronJobsStore.setState({ jobs: [], loading: false, error: null })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCronJobsStore())
      expect(result.current.jobs).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchJobs', () => {
    it('should fetch jobs from API', async () => {
      ;(getCronJobs as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { jobs: [mockBackendJob], total: 1 },
      })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.fetchJobs()

      expect(getCronJobs).toHaveBeenCalled()
      expect(result.current.jobs).toHaveLength(1)
      expect(result.current.jobs[0].id).toBe('job-1')
      expect(result.current.jobs[0].name).toBe('Test Job')
      expect(result.current.jobs[0].cronExpression).toBe('0 * * * *')
      expect(result.current.jobs[0].isActive).toBe(true)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      ;(getCronJobs as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useCronJobsStore())
      const promise = result.current.fetchJobs()

      await waitFor(() => expect(result.current.loading).toBe(true))

      resolvePromise!({ success: true, data: { jobs: [], total: 0 } })
      await promise

      await waitFor(() => expect(result.current.loading).toBe(false))
    })

    it('should handle API errors gracefully', async () => {
      ;(getCronJobs as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.fetchJobs()

      expect(result.current.error).toBe('Network error')
      expect(result.current.loading).toBe(false)
      expect(result.current.jobs).toEqual([])
    })

    it('should handle null data response', async () => {
      ;(getCronJobs as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        data: null,
        error: 'No data available',
      })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.fetchJobs()

      expect(result.current.error).toBe('No data available')
    })

    it('should handle thrown errors', async () => {
      ;(getCronJobs as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      )

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.fetchJobs()

      expect(result.current.error).toBe('Connection refused')
    })
  })

  describe('createJob', () => {
    it('should create job via API', async () => {
      ;(createCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockBackendJob,
      })

      const { result } = renderHook(() => useCronJobsStore())
      const newJobData = {
        name: 'Test Job',
        description: 'Test description',
        cronExpression: '0 * * * *',
        workflowJson: '{"nodes":[],"edges":[]}',
      }

      const job = await result.current.createJob(newJobData)

      expect(createCronJob).toHaveBeenCalled()
      expect(job.id).toBe('job-1')
      expect(job.name).toBe('Test Job')
      expect(result.current.jobs).toHaveLength(1)
    })

    it('should throw on create error', async () => {
      ;(createCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Validation failed',
      })

      const { result } = renderHook(() => useCronJobsStore())
      const newJobData = {
        name: 'Test Job',
        description: 'Test description',
        cronExpression: 'invalid',
        workflowJson: '{}',
      }

      await expect(result.current.createJob(newJobData)).rejects.toThrow()
      expect(result.current.error).toBe('Validation failed')
    })
  })

  describe('updateJob', () => {
    it('should update job via API', async () => {
      // First set up existing job
      useCronJobsStore.setState({ jobs: [mockBackendJob] })

      const updatedBackendJob = {
        ...mockBackendJob,
        name: 'Updated Job',
        updated_at: '2024-01-02T00:00:00Z',
      }

      ;(updateCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: updatedBackendJob,
      })

      const { result } = renderHook(() => useCronJobsStore())
      const updatedJob = await result.current.updateJob('job-1', { name: 'Updated Job' })

      expect(updateCronJob).toHaveBeenCalledWith('job-1', { name: 'Updated Job' })
      expect(updatedJob.name).toBe('Updated Job')
      expect(result.current.jobs[0].name).toBe('Updated Job')
    })

    it('should throw on update error', async () => {
      useCronJobsStore.setState({ jobs: [mockBackendJob] })

      ;(updateCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Job not found',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(
        result.current.updateJob('job-1', { name: 'Updated' })
      ).rejects.toThrow()
      expect(result.current.error).toBe('Job not found')
    })
  })

  describe('deleteJob', () => {
    it('should delete job via API', async () => {
      useCronJobsStore.setState({ jobs: [mockBackendJob] })

      ;(deleteCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.deleteJob('job-1')

      expect(deleteCronJob).toHaveBeenCalledWith('job-1')
      expect(result.current.jobs).toHaveLength(0)
    })

    it('should throw on delete error', async () => {
      useCronJobsStore.setState({ jobs: [mockBackendJob] })

      ;(deleteCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Cannot delete running job',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.deleteJob('job-1')).rejects.toThrow()
      expect(result.current.error).toBe('Cannot delete running job')
    })
  })

  describe('toggleJob', () => {
    it('should toggle job active state', async () => {
      useCronJobsStore.setState({ jobs: [mockBackendJob] })

      ;(toggleCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { job: { ...mockBackendJob, is_active: 0 }, scheduled: false },
      })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.toggleJob('job-1')

      expect(toggleCronJob).toHaveBeenCalledWith('job-1')
      expect(result.current.jobs[0].isActive).toBe(false)
    })

    it('should handle toggle error', async () => {
      useCronJobsStore.setState({ jobs: [mockBackendJob] })

      ;(toggleCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Toggle failed',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.toggleJob('job-1')).rejects.toThrow()
      expect(result.current.error).toBe('Toggle failed')
    })

    it('should return early if job not found', async () => {
      useCronJobsStore.setState({ jobs: [] })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.toggleJob('non-existent')

      expect(toggleCronJob).not.toHaveBeenCalled()
    })
  })

  describe('runJobManually', () => {
    it('should run job manually', async () => {
      ;(runCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { message: 'Job started', logId: 'log-1' },
      })

      const { result } = renderHook(() => useCronJobsStore())
      await result.current.runJobManually('job-1')

      expect(runCronJob).toHaveBeenCalledWith('job-1')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle run error', async () => {
      ;(runCronJob as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Cannot run disabled job',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.runJobManually('job-1')).rejects.toThrow()
      expect(result.current.error).toBe('Cannot run disabled job')
    })
  })

  describe('WebSocket subscription', () => {
    it('should call subscribeToWebSocket without error', () => {
      const { result } = renderHook(() => useCronJobsStore())
      expect(() => result.current.subscribeToWebSocket()).not.toThrow()
    })

    it('should call unsubscribeFromWebSocket without error when not subscribed', () => {
      const { result } = renderHook(() => useCronJobsStore())
      expect(() => result.current.unsubscribeFromWebSocket()).not.toThrow()
    })
  })

  describe('addJobTag', () => {
    it('should add job tag via API', async () => {
      ;(addJobTag as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { tags: ['production', 'critical'] },
      })

      const { result } = renderHook(() => useCronJobsStore())
      const tags = await result.current.addJobTag('job-1', 'production')

      expect(addJobTag).toHaveBeenCalledWith('job-1', 'production')
      expect(tags).toEqual(['production', 'critical'])
      expect(result.current.loading).toBe(false)
    })

    it('should throw on add tag error', async () => {
      ;(addJobTag as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Tag limit exceeded',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.addJobTag('job-1', 'new-tag')).rejects.toThrow()
      expect(result.current.error).toBe('Tag limit exceeded')
    })
  })

  describe('removeJobTag', () => {
    it('should remove job tag via API', async () => {
      ;(removeJobTag as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { tags: ['production'] },
      })

      const { result } = renderHook(() => useCronJobsStore())
      const tags = await result.current.removeJobTag('job-1', 'staging')

      expect(removeJobTag).toHaveBeenCalledWith('job-1', 'staging')
      expect(tags).toEqual(['production'])
      expect(result.current.loading).toBe(false)
    })

    it('should throw on remove tag error', async () => {
      ;(removeJobTag as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Tag not found',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.removeJobTag('job-1', 'nonexistent')).rejects.toThrow()
      expect(result.current.error).toBe('Tag not found')
    })
  })

  describe('getJobTags', () => {
    it('should get job tags via API', async () => {
      ;(getJobTags as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { tags: ['production', 'nightly'] },
      })

      const { result } = renderHook(() => useCronJobsStore())
      const tags = await result.current.getJobTags('job-1')

      expect(getJobTags).toHaveBeenCalledWith('job-1')
      expect(tags).toEqual(['production', 'nightly'])
      expect(result.current.loading).toBe(false)
    })

    it('should throw on get tags error', async () => {
      ;(getJobTags as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Job not found',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.getJobTags('invalid')).rejects.toThrow()
      expect(result.current.error).toBe('Job not found')
    })
  })

  describe('addJobDependency', () => {
    it('should add job dependency via API', async () => {
      ;(addJobDependency as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { dependencies: ['job-2', 'job-3'] },
      })

      const { result } = renderHook(() => useCronJobsStore())
      const deps = await result.current.addJobDependency('job-1', 'job-2')

      expect(addJobDependency).toHaveBeenCalledWith('job-1', 'job-2')
      expect(deps).toEqual(['job-2', 'job-3'])
      expect(result.current.loading).toBe(false)
    })

    it('should throw on circular dependency error', async () => {
      ;(addJobDependency as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Circular dependency detected',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.addJobDependency('job-1', 'job-2')).rejects.toThrow()
      expect(result.current.error).toBe('Circular dependency detected')
    })
  })

  describe('removeJobDependency', () => {
    it('should remove job dependency via API', async () => {
      ;(removeJobDependency as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { dependencies: [] },
      })

      const { result } = renderHook(() => useCronJobsStore())
      const deps = await result.current.removeJobDependency('job-1', 'job-2')

      expect(removeJobDependency).toHaveBeenCalledWith('job-1', 'job-2')
      expect(deps).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('should throw on remove dependency error', async () => {
      ;(removeJobDependency as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Dependency not found',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.removeJobDependency('job-1', 'invalid')).rejects.toThrow()
      expect(result.current.error).toBe('Dependency not found')
    })
  })

  describe('getJobDependencies', () => {
    it('should get job dependencies via API', async () => {
      ;(getJobDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { dependencies: ['job-2', 'job-3', 'job-4'] },
      })

      const { result } = renderHook(() => useCronJobsStore())
      const deps = await result.current.getJobDependencies('job-1')

      expect(getJobDependencies).toHaveBeenCalledWith('job-1')
      expect(deps).toEqual(['job-2', 'job-3', 'job-4'])
      expect(result.current.loading).toBe(false)
    })

    it('should throw on get dependencies error', async () => {
      ;(getJobDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Job not found',
      })

      const { result } = renderHook(() => useCronJobsStore())

      await expect(result.current.getJobDependencies('invalid')).rejects.toThrow()
      expect(result.current.error).toBe('Job not found')
    })
  })
})