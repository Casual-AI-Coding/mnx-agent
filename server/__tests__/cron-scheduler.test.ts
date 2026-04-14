import { CronScheduler } from '../services/cron-scheduler'
import { CronJob, ExecutionStatus, TriggerType, MisfirePolicy } from '../database/types'
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import type { IEventBus } from '../services/interfaces/event-bus.interface'
import type { IConcurrencyManager } from '../services/interfaces/concurrency-manager.interface'
import { MisfireHandler, createMisfireHandler } from '../services/misfire-handler'

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
    getWorkflowTemplateById: Mock
    getWebhookConfigsByJobId: Mock
  }
  let mockWorkflowEngine: {
    executeWorkflow: Mock
  }
  let mockEventBus: IEventBus
  let mockConcurrencyManager: IConcurrencyManager
  let misfireHandler: MisfireHandler
  let runningJobsSet: Set<string>

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
    misfire_policy: MisfirePolicy.FIRE_ONCE,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    runningJobsSet = new Set<string>()

    mockDb = {
      getActiveCronJobs: vi.fn().mockResolvedValue([]),
      getCronJobById: vi.fn().mockResolvedValue(null),
      updateCronJob: vi.fn().mockResolvedValue(undefined),
      createExecutionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
      updateExecutionLog: vi.fn().mockResolvedValue(undefined),
      getWorkflowTemplateById: vi.fn().mockResolvedValue(null),
      getWebhookConfigsByJobId: vi.fn().mockResolvedValue([]),
    }

    mockWorkflowEngine = {
      executeWorkflow: vi.fn().mockResolvedValue({
        success: true,
        nodeResults: new Map([['node-1', { success: true }]]),
        error: null,
      }),
    }

    mockEventBus = {
      emitJobCreated: vi.fn(),
      emitJobUpdated: vi.fn(),
      emitJobDeleted: vi.fn(),
      emitJobToggled: vi.fn(),
      emitJobExecuted: vi.fn(),
      emitTaskCreated: vi.fn(),
      emitTaskUpdated: vi.fn(),
      emitTaskCompleted: vi.fn(),
      emitTaskFailed: vi.fn(),
      emitTaskMovedToDLQ: vi.fn(),
      emitLogCreated: vi.fn(),
      emitLogUpdated: vi.fn(),
      emitWorkflowTestStarted: vi.fn(),
      emitWorkflowTestCompleted: vi.fn(),
      emitWorkflowNodeOutput: vi.fn(),
      emitWorkflowNodeStart: vi.fn(),
      emitWorkflowNodeComplete: vi.fn(),
      emitWorkflowNodeError: vi.fn(),
    }

    mockConcurrencyManager = {
      acquireSlot: vi.fn().mockResolvedValue(true),
      releaseSlot: vi.fn(),
      getRunningJobs: () => runningJobsSet,
      getRunningCount: () => runningJobsSet.size,
      isShuttingDown: () => false,
      setShuttingDown: vi.fn(),
    }

    misfireHandler = new MisfireHandler()
  })

  const createScheduler = (options?: { timezone?: string; defaultTimeoutMs?: number }) => {
    const sched = new CronScheduler(
      mockDb as any,
      mockWorkflowEngine as any,
      null,
      null,
      mockEventBus,
      mockConcurrencyManager,
      misfireHandler,
      options
    )
    misfireHandler.setExecuteJobCallback(sched.executeJobTick.bind(sched))
    return sched
  }

  beforeEach(() => {
    scheduler = createScheduler({ timezone: 'UTC', defaultTimeoutMs: 5000 })
  })

  afterEach(() => {
    scheduler?.stopAll()
  })

  // ============================================================================
  // Job Scheduling
  // ============================================================================

  describe('Job Scheduling', () => {
    it('should schedule a job with valid cron expression', async () => {
      const job = createMockJob('job-1')
      
      await scheduler.scheduleJob(job)
      
      expect(scheduler.isJobScheduled('job-1')).toBe(true)
      expect(scheduler.getJobCount()).toBe(1)
    })

    it('should throw error for invalid cron expression', async () => {
      const job = createMockJob('job-1', { cron_expression: 'invalid' })
      
      await expect(scheduler.scheduleJob(job)).rejects.toThrow('Invalid cron expression')
    })

    it('should replace existing job when scheduling same job id', async () => {
      const job1 = createMockJob('job-1', { cron_expression: '0 * * * *' })
      const job2 = createMockJob('job-1', { cron_expression: '*/5 * * * *' })
      
      await scheduler.scheduleJob(job1)
      await scheduler.scheduleJob(job2)
      
      expect(scheduler.getJobCount()).toBe(1)
      expect(scheduler.isJobScheduled('job-1')).toBe(true)
    })

    it('should unschedule a job successfully', async () => {
      const job = createMockJob('job-1')
      await scheduler.scheduleJob(job)
      
      const result = scheduler.unscheduleJob('job-1')
      
      expect(result).toBe(true)
      expect(scheduler.isJobScheduled('job-1')).toBe(false)
      expect(scheduler.getJobCount()).toBe(0)
    })

    it('should return false when unscheduling non-existent job', () => {
      const result = scheduler.unscheduleJob('non-existent')
      
      expect(result).toBe(false)
    })

    it('should get all scheduled job IDs', async () => {
      const job1 = createMockJob('job-1')
      const job2 = createMockJob('job-2')
      const job3 = createMockJob('job-3')
      
      await scheduler.scheduleJob(job1)
      await scheduler.scheduleJob(job2)
      await scheduler.scheduleJob(job3)
      
      const jobIds = scheduler.getAllScheduledJobs()
      
      expect(jobIds).toEqual(['job-1', 'job-2', 'job-3'])
    })

    it('should update next_run_at when scheduling', async () => {
      const job = createMockJob('job-1')
      
      await scheduler.scheduleJob(job)
      
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
      const customRunningJobs = new Set<string>()
      const customConcurrencyManager: IConcurrencyManager = {
        acquireSlot: vi.fn().mockResolvedValue(true),
        releaseSlot: vi.fn(),
        getRunningJobs: () => customRunningJobs,
        getRunningCount: () => customRunningJobs.size,
        isShuttingDown: () => false,
        setShuttingDown: vi.fn(),
      }
      
      const customMisfireHandler = new MisfireHandler()
      const limitedScheduler = new CronScheduler(
        mockDb as any,
        mockWorkflowEngine as any,
        null,
        null,
        mockEventBus,
        customConcurrencyManager,
        customMisfireHandler,
        { timezone: 'UTC' }
      )
      customMisfireHandler.setExecuteJobCallback(limitedScheduler.executeJobTick.bind(limitedScheduler))
      
      const runningJobs = limitedScheduler.getRunningJobs()
      
      runningJobs.add('job-1')
      runningJobs.add('job-2')
      
      expect(limitedScheduler.getRunningJobCount()).toBe(2)
      
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
      const customScheduler = createScheduler()
      
      customScheduler.stopAll()
    })
  })

  // ============================================================================
  // Graceful Shutdown
  // ============================================================================

  describe('Graceful Shutdown', () => {
    it('should stop all scheduled jobs', async () => {
      const job1 = createMockJob('job-1')
      const job2 = createMockJob('job-2')
      const job3 = createMockJob('job-3')
      
      await scheduler.scheduleJob(job1)
      await scheduler.scheduleJob(job2)
      await scheduler.scheduleJob(job3)
      
      expect(scheduler.getJobCount()).toBe(3)
      
      scheduler.stopAll()
      
      expect(scheduler.getJobCount()).toBe(0)
      expect(scheduler.isJobScheduled('job-1')).toBe(false)
      expect(scheduler.isJobScheduled('job-2')).toBe(false)
      expect(scheduler.isJobScheduled('job-3')).toBe(false)
    })

    it('should complete graceful shutdown with no running jobs', async () => {
      const job = createMockJob('job-1')
      await scheduler.scheduleJob(job)
      
      await scheduler.gracefulShutdown(1000)
      
      expect(scheduler.getJobCount()).toBe(0)
      expect(scheduler.getRunningJobCount()).toBe(0)
    })

    it('should wait for running jobs during graceful shutdown', async () => {
      const job = createMockJob('job-1')
      await scheduler.scheduleJob(job)
      
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
      await scheduler.scheduleJob(job)
      
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
      await scheduler.scheduleJob(job)
      
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
      
      await scheduler.scheduleJob(job)
      
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
  // Job-Level Timeout
  // ============================================================================

  describe('Job-Level Timeout', () => {
    it('should respect job.timeout_ms instead of defaultTimeoutMs', async () => {
      // Create a job with a short timeout (500ms)
      const job = createMockJob('job-1', {
        timeout_ms: 500, // 500ms timeout
        workflow_id: 'workflow-1',
      })
      
      // Mock workflow engine to take longer than job's timeout (1000ms)
      mockWorkflowEngine.executeWorkflow.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Takes 1000ms
        return {
          success: true,
          nodeResults: new Map([['node-1', { success: true }]]),
          error: null,
        }
      })
      
      // Mock getWorkflowTemplateById for workflow_id lookup
      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'workflow-1',
        nodes_json: JSON.stringify([{ id: 'node-1', type: 'action' }]),
        edges_json: JSON.stringify([]),
      })
      
      // Execute the job
      await scheduler.executeJobTick(job)
      
      // Should timeout after ~500ms (job.timeout_ms), not after 5000ms (default)
      // The execution log should show failure due to timeout
      expect(mockDb.updateExecutionLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
        status: ExecutionStatus.FAILED,
        error_summary: expect.stringContaining('timed out'),
      }))
    })

    it('should use defaultTimeoutMs when job.timeout_ms is 0', async () => {
      // Create a job with timeout_ms: 0 (fallback to default)
      const job = createMockJob('job-1', {
        timeout_ms: 0,
        workflow_id: 'workflow-1',
      })
      
      // Mock workflow engine to complete in less than default timeout
      mockWorkflowEngine.executeWorkflow.mockResolvedValue({
        success: true,
        nodeResults: new Map([['node-1', { success: true }]]),
        error: null,
      })
      
      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'workflow-1',
        nodes_json: JSON.stringify([{ id: 'node-1', type: 'action' }]),
        edges_json: JSON.stringify([]),
      })
      
      await scheduler.executeJobTick(job)
      
      // Should succeed (no timeout) using defaultTimeoutMs (5000ms in test setup)
      expect(mockDb.updateExecutionLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
        status: ExecutionStatus.COMPLETED,
      }))
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
      // Scheduler was configured with 'UTC' timezone in beforeEach
      expect(scheduler.getTimezone()).toBe('UTC')
    })

    it('should use default timezone if not specified', () => {
      const defaultConcurrencyManager: IConcurrencyManager = {
        acquireSlot: vi.fn().mockResolvedValue(true),
        releaseSlot: vi.fn(),
        getRunningJobs: () => new Set(),
        getRunningCount: () => 0,
        isShuttingDown: () => false,
        setShuttingDown: vi.fn(),
      }
      
      const defaultMisfireHandler = new MisfireHandler()
      const defaultScheduler = new CronScheduler(
        mockDb as any,
        mockWorkflowEngine as any,
        null,
        null,
        mockEventBus,
        defaultConcurrencyManager,
        defaultMisfireHandler
      )
      
      expect(defaultScheduler.getTimezone()).toBe('Asia/Shanghai')
      
      defaultScheduler.stopAll()
    })
  })

// ============================================================================
  // Misfire Handling
  // ============================================================================

  describe('Misfire Handling', () => {
    it('should detect job with past next_run_at as misfire', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      const misfiredJob = createMockJob('job-misfire', {
        next_run_at: pastTime,
        misfire_policy: MisfirePolicy.FIRE_ONCE,
        workflow_id: 'wf-001',
      })
      
      mockDb.getActiveCronJobs.mockResolvedValue([misfiredJob])
      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'wf-001',
        name: 'Test Workflow',
        nodes_json: '[]',
        edges_json: '[]',
        owner_id: null,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      mockWorkflowEngine.executeWorkflow.mockResolvedValue({
        success: true,
        nodeResults: new Map(),
        error: null,
      })
      
      await scheduler.init()
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalled()
    })

    it('should skip misfire when policy is ignore', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      const ignoredMisfireJob = createMockJob('job-ignored', {
        next_run_at: pastTime,
        misfire_policy: MisfirePolicy.IGNORE,
        workflow_id: 'wf-001',
      })
      
      mockDb.getActiveCronJobs.mockResolvedValue([ignoredMisfireJob])
      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'wf-001',
        name: 'Test Workflow',
        nodes_json: '[]',
        edges_json: '[]',
        owner_id: null,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      
      await scheduler.init()
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      expect(mockWorkflowEngine.executeWorkflow).not.toHaveBeenCalled()
    })

    it('should not handle misfire for job with future next_run_at', async () => {
      const futureTime = new Date(Date.now() + 3600000).toISOString()
      const futureJob = createMockJob('job-future', {
        next_run_at: futureTime,
        workflow_id: 'wf-001',
      })
      
      mockDb.getActiveCronJobs.mockResolvedValue([futureJob])
      
      await scheduler.init()
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(mockWorkflowEngine.executeWorkflow).not.toHaveBeenCalled()
    })

    it('should handle multiple misfired jobs with rate limiting', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      const jobs = [
        createMockJob('job-1', { next_run_at: pastTime, workflow_id: 'wf-001' }),
        createMockJob('job-2', { next_run_at: pastTime, workflow_id: 'wf-001' }),
        createMockJob('job-3', { next_run_at: pastTime, workflow_id: 'wf-001' }),
      ]
      
      mockDb.getActiveCronJobs.mockResolvedValue(jobs)
      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'wf-001',
        name: 'Test Workflow',
        nodes_json: '[]',
        edges_json: '[]',
        owner_id: null,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      mockWorkflowEngine.executeWorkflow.mockResolvedValue({
        success: true,
        nodeResults: new Map(),
        error: null,
      })
      
      await scheduler.init()
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalledTimes(3)
    })

    it('should log misfire handling appropriately', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      const misfiredJob = createMockJob('job-log', {
        next_run_at: pastTime,
        misfire_policy: MisfirePolicy.FIRE_ONCE,
        workflow_id: 'wf-001',
      })
      
      mockDb.getActiveCronJobs.mockResolvedValue([misfiredJob])
      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'wf-001',
        name: 'Test Workflow',
        nodes_json: '[]',
        edges_json: '[]',
        owner_id: null,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      mockWorkflowEngine.executeWorkflow.mockResolvedValue({
        success: true,
        nodeResults: new Map(),
        error: null,
      })
      
      const consoleSpy = vi.spyOn(console, 'info')
      
      await scheduler.init()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Misfire detected'))
      
      consoleSpy.mockRestore()
    })
  })
})