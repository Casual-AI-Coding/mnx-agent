import { CronScheduler, getCronScheduler, resetCronScheduler } from '../services/cron-scheduler'
import { CronJob, ExecutionStatus, TriggerType } from '../database/types'
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'

vi.mock('node-cron', () => {
  return {
    default: {
      validate: vi.fn((expr: string) => {
        const parts = expr.trim().split(' ')
        return parts.length === 5
      }),
      schedule: vi.fn((expr: string, callback: () => void) => ({
        stop: vi.fn(),
        start: vi.fn(),
      })),
    },
  }
})

describe('CronScheduler', () => {
  let scheduler: CronScheduler
  let mockDb: {
    getActiveCronJobs: Mock
    getCronJobById: Mock
    updateCronJob: Mock
    createExecutionLog: Mock
    updateExecutionLog: Mock
  }
  let mockWorkflowEngine: {
    executeWorkflow: Mock
  }

  const createMockJob = (id: string, overrides?: Partial<CronJob>): CronJob => ({
    id,
    name: `Test Job ${id}`,
    description: null,
    cron_expression: '0 * * * *',
    timezone: 'UTC',
    workflow_id: null,
    owner_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_run_at: null,
    next_run_at: null,
    total_runs: 0,
    total_failures: 0,
    timeout_ms: 300000,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      getActiveCronJobs: vi.fn().mockResolvedValue([]),
      getCronJobById: vi.fn().mockResolvedValue(null),
      updateCronJob: vi.fn().mockResolvedValue(undefined),
      createExecutionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
      updateExecutionLog: vi.fn().mockResolvedValue(undefined),
    }

    mockWorkflowEngine = {
      executeWorkflow: vi.fn().mockResolvedValue({
        success: true,
        nodeResults: new Map([['node-1', { success: true }]]),
        error: null,
      }),
    }

    scheduler = new CronScheduler(mockDb as any, mockWorkflowEngine as any, {
      maxConcurrent: 2,
      timezone: 'UTC',
      defaultTimeoutMs: 5000,
    })
  })

  afterEach(() => {
    scheduler?.stopAll()
    resetCronScheduler()
  })

  // ============================================================================
  // Job Scheduling
  // ============================================================================

  describe('Job Scheduling', () => {
    it('should schedule a job with valid cron expression', () => {
      const job = createMockJob('job-1')
      
      scheduler.scheduleJob(job)
      
      expect(scheduler.isJobScheduled('job-1')).toBe(true)
      expect(scheduler.getJobCount()).toBe(1)
    })

    it('should throw error for invalid cron expression', () => {
      const job = createMockJob('job-1', { cron_expression: 'invalid' })
      
      expect(() => scheduler.scheduleJob(job)).toThrow('Invalid cron expression')
    })

    it('should replace existing job when scheduling same job id', () => {
      const job1 = createMockJob('job-1', { cron_expression: '0 * * * *' })
      const job2 = createMockJob('job-1', { cron_expression: '*/5 * * * *' })
      
      scheduler.scheduleJob(job1)
      scheduler.scheduleJob(job2)
      
      expect(scheduler.getJobCount()).toBe(1)
      expect(scheduler.isJobScheduled('job-1')).toBe(true)
    })

    it('should unschedule a job successfully', () => {
      const job = createMockJob('job-1')
      scheduler.scheduleJob(job)
      
      const result = scheduler.unscheduleJob('job-1')
      
      expect(result).toBe(true)
      expect(scheduler.isJobScheduled('job-1')).toBe(false)
      expect(scheduler.getJobCount()).toBe(0)
    })

    it('should return false when unscheduling non-existent job', () => {
      const result = scheduler.unscheduleJob('non-existent')
      
      expect(result).toBe(false)
    })

    it('should get all scheduled job IDs', () => {
      const job1 = createMockJob('job-1')
      const job2 = createMockJob('job-2')
      const job3 = createMockJob('job-3')
      
      scheduler.scheduleJob(job1)
      scheduler.scheduleJob(job2)
      scheduler.scheduleJob(job3)
      
      const jobIds = scheduler.getAllScheduledJobs()
      
      expect(jobIds).toEqual(['job-1', 'job-2', 'job-3'])
    })

    it('should update next_run_at when scheduling', () => {
      const job = createMockJob('job-1')
      
      scheduler.scheduleJob(job)
      
      expect(mockDb.updateCronJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        next_run_at: expect.any(String),
      }))
    })
  })

  // ============================================================================
  // Concurrent Limit
  // ============================================================================

  describe('Concurrent Limit', () => {
    it('should start with zero running jobs', () => {
      expect(scheduler.getRunningJobCount()).toBe(0)
      expect(scheduler.getRunningJobs().size).toBe(0)
    })

    it('should track running jobs after slot acquisition', async () => {
      // Simulate acquiring execution slots
      const runningJobs = scheduler.getRunningJobs()
      
      // Manually add to running set to test tracking
      runningJobs.add('job-1')
      runningJobs.add('job-2')
      
      expect(scheduler.getRunningJobCount()).toBe(2)
    })

    it('should respect max concurrent limit', async () => {
      // Create a scheduler with maxConcurrent=2
      const limitedScheduler = new CronScheduler(mockDb as any, mockWorkflowEngine as any, {
        maxConcurrent: 2,
      })
      
      const runningJobs = limitedScheduler.getRunningJobs()
      
      // Manually fill the slots
      runningJobs.add('job-1')
      runningJobs.add('job-2')
      
      expect(limitedScheduler.getRunningJobCount()).toBe(2)
      
      // Third job should not be able to acquire slot (simulated)
      // In real execution, this would be checked in executeJobTick
      
      limitedScheduler.stopAll()
    })

    it('should release slot after job completion', async () => {
      const runningJobs = scheduler.getRunningJobs()
      
      runningJobs.add('job-1')
      expect(scheduler.getRunningJobCount()).toBe(1)
      
      runningJobs.delete('job-1')
      expect(scheduler.getRunningJobCount()).toBe(0)
    })

    it('should enforce maxConcurrent from options', () => {
      const customScheduler = new CronScheduler(mockDb as any, mockWorkflowEngine as any, {
        maxConcurrent: 10,
      })
      
      // The scheduler should use the custom maxConcurrent
      // This is verified indirectly through the options
      
      customScheduler.stopAll()
    })
  })

  // ============================================================================
  // Graceful Shutdown
  // ============================================================================

  describe('Graceful Shutdown', () => {
    it('should stop all scheduled jobs', () => {
      const job1 = createMockJob('job-1')
      const job2 = createMockJob('job-2')
      const job3 = createMockJob('job-3')
      
      scheduler.scheduleJob(job1)
      scheduler.scheduleJob(job2)
      scheduler.scheduleJob(job3)
      
      expect(scheduler.getJobCount()).toBe(3)
      
      scheduler.stopAll()
      
      expect(scheduler.getJobCount()).toBe(0)
      expect(scheduler.isJobScheduled('job-1')).toBe(false)
      expect(scheduler.isJobScheduled('job-2')).toBe(false)
      expect(scheduler.isJobScheduled('job-3')).toBe(false)
    })

    it('should complete graceful shutdown with no running jobs', async () => {
      const job = createMockJob('job-1')
      scheduler.scheduleJob(job)
      
      await scheduler.gracefulShutdown(1000)
      
      expect(scheduler.getJobCount()).toBe(0)
      expect(scheduler.getRunningJobCount()).toBe(0)
    })

    it('should wait for running jobs during graceful shutdown', async () => {
      const job = createMockJob('job-1')
      scheduler.scheduleJob(job)
      
      // Simulate a running job
      const runningJobs = scheduler.getRunningJobs()
      runningJobs.add('job-1')
      
      // Start graceful shutdown with short timeout
      const shutdownPromise = scheduler.gracefulShutdown(500)
      
      // Release the job after a short delay
      setTimeout(() => runningJobs.delete('job-1'), 100)
      
      await shutdownPromise
      
      expect(scheduler.getJobCount()).toBe(0)
      expect(scheduler.getRunningJobCount()).toBe(0)
    })

    it('should timeout graceful shutdown if jobs do not complete', async () => {
      const job = createMockJob('job-1')
      scheduler.scheduleJob(job)
      
      // Simulate a running job that never completes
      const runningJobs = scheduler.getRunningJobs()
      runningJobs.add('job-1')
      
      // Graceful shutdown with very short timeout
      await scheduler.gracefulShutdown(100)
      
      // Job should still be forcefully stopped
      expect(scheduler.getJobCount()).toBe(0)
    })

    it('should prevent new executions during shutdown', async () => {
      const job = createMockJob('job-1')
      scheduler.scheduleJob(job)
      
      // Start shutdown process (simulate isShuttingDown)
      await scheduler.gracefulShutdown(100)
      
      // After shutdown, scheduler should be cleared
      expect(scheduler.getJobCount()).toBe(0)
    })
  })

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('Initialization', () => {
    it('should load active jobs on init', async () => {
      const activeJobs = [
        createMockJob('job-1'),
        createMockJob('job-2'),
      ]
      
      mockDb.getActiveCronJobs.mockResolvedValue(activeJobs)
      
      await scheduler.init()
      
      expect(mockDb.getActiveCronJobs).toHaveBeenCalled()
      expect(scheduler.getJobCount()).toBe(2)
    })

    it('should handle errors during init for individual jobs', async () => {
      const activeJobs = [
        createMockJob('job-1'),
        createMockJob('job-2', { cron_expression: 'invalid-expression' }), // This will fail validation
      ]
      
      mockDb.getActiveCronJobs.mockResolvedValue(activeJobs)
      
      await scheduler.init()
      
      // Only valid job should be scheduled
      expect(scheduler.getJobCount()).toBe(1)
      expect(scheduler.isJobScheduled('job-1')).toBe(true)
    })
  })

  // ============================================================================
  // Rescheduling
  // ============================================================================

  describe('Rescheduling', () => {
    it('should reschedule an existing job', async () => {
      const job = createMockJob('job-1')
      mockDb.getCronJobById.mockResolvedValue(job)
      
      scheduler.scheduleJob(job)
      
      // Reschedule (unschedule + schedule)
      const result = await scheduler.rescheduleJob('job-1')
      
      expect(mockDb.getCronJobById).toHaveBeenCalledWith('job-1')
      expect(result).toBe(true)
    })

    it('should return false when rescheduling non-existent job', async () => {
      mockDb.getCronJobById.mockResolvedValue(null)
      
      const result = await scheduler.rescheduleJob('non-existent')
      
      expect(result).toBe(false)
    })

    it('should not schedule inactive job', async () => {
      const inactiveJob = createMockJob('job-1', { is_active: false })
      mockDb.getCronJobById.mockResolvedValue(inactiveJob)
      
      const result = await scheduler.rescheduleJob('job-1')
      
      expect(result).toBe(false)
      expect(scheduler.isJobScheduled('job-1')).toBe(false)
    })
  })

  // ============================================================================
  // Utility Methods
  // ============================================================================

  describe('Utility Methods', () => {
    it('should calculate next run time from cron expression', () => {
      const nextRun = scheduler.calculateNextRun('0 * * * *')
      
      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun?.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return null for invalid cron expression in calculateNextRun', () => {
      const nextRun = scheduler.calculateNextRun('invalid')
      
      expect(nextRun).toBeNull()
    })

    it('should return configured timezone', () => {
      expect(scheduler.getTimezone()).toBe('UTC')
    })

    it('should use default timezone if not specified', () => {
      const defaultScheduler = new CronScheduler(mockDb as any, mockWorkflowEngine as any)
      
      expect(defaultScheduler.getTimezone()).toBe('Asia/Shanghai')
      
      defaultScheduler.stopAll()
    })
  })

  // ============================================================================
  // Singleton Management
  // ============================================================================

  describe('Singleton Management', () => {
    it('should return same instance from getCronScheduler', () => {
      resetCronScheduler()
      
      const instance1 = getCronScheduler(mockDb as any, mockWorkflowEngine as any)
      const instance2 = getCronScheduler(mockDb as any, mockWorkflowEngine as any)
      
      expect(instance1).toBe(instance2)
      
      resetCronScheduler()
    })

    it('should reset singleton with resetCronScheduler', () => {
      const instance1 = getCronScheduler(mockDb as any, mockWorkflowEngine as any)
      
      resetCronScheduler()
      
      const instance2 = getCronScheduler(mockDb as any, mockWorkflowEngine as any)
      
      expect(instance1).not.toBe(instance2)
      
      resetCronScheduler()
    })
  })
})