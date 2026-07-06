import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CronScheduler } from '../cron-scheduler'
import { WorkflowEngine } from '../workflow/index'
import { QueueProcessor } from '../queue-processor'
import type { ServiceNodeRegistry } from '../service-node-registry'
import type { IConcurrencyManager } from '../interfaces/concurrency-manager.interface'
import type { IRetryManager } from '../interfaces/retry-manager.interface'
import type { ITaskService } from '../domain/interfaces/index.js'
import type { TaskQueueItem } from '../../database/types.js'
import { getGlobalContainer, resetContainer } from '../../container.js'
import { TOKENS } from '../../service-registration.js'
import { createMockEventBus } from '../../__tests__/helpers/mock-event-bus'

interface SchedulerWorkflowMocks {
  getActiveCronJobs: ReturnType<typeof vi.fn>
  getCronJobById: ReturnType<typeof vi.fn>
  updateCronJob: ReturnType<typeof vi.fn>
  createExecutionLog: ReturnType<typeof vi.fn>
  updateExecutionLog: ReturnType<typeof vi.fn>
  getPendingTasksByJob: ReturnType<typeof vi.fn>
  getPendingTasksByType: ReturnType<typeof vi.fn>
  markTaskRunning: ReturnType<typeof vi.fn>
  markTaskCompleted: ReturnType<typeof vi.fn>
  markTaskFailed: ReturnType<typeof vi.fn>
  createDeadLetterQueueItem: ReturnType<typeof vi.fn>
  getWorkflowTemplateById: ReturnType<typeof vi.fn>
}

function createMockConcurrencyManager(): IConcurrencyManager {
  return {
    acquireSlot: vi.fn().mockResolvedValue(true),
    releaseSlot: vi.fn(),
    getRunningJobs: () => new Set<string>(),
    getRunningCount: () => 0,
    isShuttingDown: () => false,
    setShuttingDown: vi.fn(),
  }
}

function createMockRetryManager(): IRetryManager {
  return {
    getRetryDelay: vi.fn().mockReturnValue(1000),
    delay: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockTaskService(): ITaskService {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn().mockImplementation((id: string, data: Partial<TaskQueueItem>) => Promise.resolve({ id, ...data })),
    delete: vi.fn(),
    getAll: vi.fn(),
    getPending: vi.fn().mockResolvedValue([]),
    getByStatus: vi.fn().mockResolvedValue([]),
    moveToDeadLetter: vi.fn().mockResolvedValue(undefined),
    retryFromDeadLetter: vi.fn(),
    getDeadLetterQueue: vi.fn().mockResolvedValue([]),
    getDeadLetterItemById: vi.fn().mockResolvedValue(null),
    resolveDeadLetterItem: vi.fn(),
    incrementRetryCount: vi.fn(),
    getByJobId: vi.fn().mockResolvedValue([]),
    markRunning: vi.fn().mockResolvedValue({ id: 'task-1', status: 'running' }),
    markCompleted: vi.fn().mockResolvedValue({ id: 'task-1', status: 'completed' }),
    markFailed: vi.fn().mockResolvedValue({ id: 'task-1', status: 'failed' }),
    getPendingByJobId: vi.fn().mockResolvedValue([]),
    getPendingByType: vi.fn().mockResolvedValue([]),
    getQueueStats: vi.fn().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }),
  }
}

describe('CronScheduler Integration with TaskExecutor', () => {
  let schedulerMocks: SchedulerWorkflowMocks
  let mockRegistry: Partial<ServiceNodeRegistry>
  let mockTaskExecutor: {
    executeTask: ReturnType<typeof vi.fn>
  }
  let mockEventBus: ReturnType<typeof createMockEventBus>
  let mockConcurrencyManager: IConcurrencyManager
  let workflowEngine: WorkflowEngine
  let cronScheduler: CronScheduler

  beforeEach(() => {
    vi.clearAllMocks()
    resetContainer()

    schedulerMocks = {
      getActiveCronJobs: vi.fn().mockResolvedValue([]),
      getCronJobById: vi.fn().mockResolvedValue(null),
      updateCronJob: vi.fn().mockResolvedValue(undefined),
      createExecutionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
      updateExecutionLog: vi.fn().mockResolvedValue(undefined),
      getPendingTasksByJob: vi.fn().mockResolvedValue([]),
      getPendingTasksByType: vi.fn().mockResolvedValue([]),
      markTaskRunning: vi.fn().mockResolvedValue({ id: 'task-1', status: 'running' }),
      markTaskCompleted: vi.fn().mockResolvedValue({ id: 'task-1', status: 'completed' }),
      markTaskFailed: vi.fn().mockResolvedValue({ id: 'task-1', status: 'failed' }),
      createDeadLetterQueueItem: vi.fn().mockResolvedValue({ id: 'dlq-1' }),
      getWorkflowTemplateById: vi.fn().mockResolvedValue(null),
    }

    mockRegistry = {
      call: vi.fn(),
    }

    mockTaskExecutor = {
      executeTask: vi.fn(),
    }

    mockEventBus = createMockEventBus()
    mockConcurrencyManager = createMockConcurrencyManager()
    
    workflowEngine = new WorkflowEngine(
      null,
      mockRegistry as ServiceNodeRegistry,
      mockTaskExecutor as any,
      mockEventBus
    )
    
    cronScheduler = new CronScheduler(
      workflowEngine as any,
      mockTaskExecutor as any,
      null, // notificationService
      mockEventBus,
      mockConcurrencyManager,
      undefined, // misfireHandler
      {
        timezone: 'UTC',
        defaultTimeoutMs: 5000,
      }
    )
  })

  afterEach(() => {
    cronScheduler?.stopAll()
    resetContainer()
  })

  describe('TaskExecutor integration', () => {
    it('should accept TaskExecutor in constructor', () => {
      expect(cronScheduler).toBeDefined()
    })

    it('should pass TaskExecutor to WorkflowEngine via executeWorkflow', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'node-1', type: 'condition', data: { label: 'Test', config: { condition: 'true' } } },
        ],
        edges: [],
      })

      schedulerMocks.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'wf-1',
        nodes_json: workflowJson,
        edges_json: '[]',
      })

      const result = await workflowEngine.executeWorkflow(workflowJson, 'log-1', mockTaskExecutor as any)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })
  })
})

describe('QueueProcessor Dead Letter Queue', () => {
  let mockTaskExecutor: { executeTask: ReturnType<typeof vi.fn> }
  let mockCapacityChecker: {
    hasCapacity: ReturnType<typeof vi.fn>
    reserveCapacity: ReturnType<typeof vi.fn>
    decrementCapacity: ReturnType<typeof vi.fn>
    getSafeExecutionLimit: ReturnType<typeof vi.fn>
  }
  let mockEventBus: ReturnType<typeof createMockEventBus>
  let mockRetryManager: IRetryManager
  let mockTaskService: ITaskService
  let queueProcessor: QueueProcessor

  beforeEach(() => {
    vi.clearAllMocks()

    mockTaskExecutor = {
      executeTask: vi.fn(),
    }

    mockCapacityChecker = {
      hasCapacity: vi.fn().mockResolvedValue(true),
      reserveCapacity: vi.fn().mockResolvedValue(true),
      decrementCapacity: vi.fn().mockResolvedValue(undefined),
      getSafeExecutionLimit: vi.fn().mockResolvedValue(10),
    }

    mockEventBus = createMockEventBus()
    mockRetryManager = createMockRetryManager()
    mockTaskService = createMockTaskService()

    queueProcessor = new QueueProcessor(
      mockTaskService,
      mockTaskExecutor as any,
      mockCapacityChecker as any,
      mockEventBus,
      mockRetryManager
    )
  })

  it('should call createDeadLetterQueueItem when task fails after max retries', async () => {
    const failedTask = {
      id: 'task-1',
      job_id: 'job-1',
      task_type: 'image',
      payload: JSON.stringify({ prompt: 'test image' }),
      priority: 1,
      status: 'pending' as const,
      retry_count: 3,
      max_retries: 3,
      result: null as unknown as string,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      owner_id: 'user-1',
    }

    mockTaskService.getPendingByJobId = vi.fn().mockResolvedValue([failedTask])
    mockTaskExecutor.executeTask = vi.fn().mockRejectedValue(new Error('API Error'))

    const result = await queueProcessor.processQueue('job-1', { batchSize: 10 })

    expect(result.tasksExecuted).toBe(1)
    expect(result.tasksFailed).toBe(1)
    expect(mockTaskService.moveToDeadLetter).toHaveBeenCalledTimes(1)
    expect(mockTaskService.moveToDeadLetter).toHaveBeenCalledWith('task-1', 'API Error', 'user-1')
  })

  it('should emit DLQ event when task is moved to dead letter queue', async () => {
    const emitSpy = vi.spyOn(mockEventBus, 'emitTaskMovedToDLQ')

    const failedTask = {
      id: 'task-2',
      job_id: 'job-1',
      task_type: 'voice_sync',
      payload: JSON.stringify({ text: 'Hello' }),
      priority: 1,
      status: 'pending' as const,
      retry_count: 3,
      max_retries: 3,
      result: null as unknown as string,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      owner_id: null,
    }

    mockTaskService.getPendingByJobId = vi.fn().mockResolvedValue([failedTask])
    mockTaskExecutor.executeTask = vi.fn().mockRejectedValue(new Error('Synthesis failed'))

    await queueProcessor.processQueue('job-1', { batchSize: 10 })

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-2',
        task_type: 'voice_sync',
      }),
      'Synthesis failed'
    )
  })

  it('should track failed tasks properly in processBatch', async () => {
    const failedTask = {
      id: 'task-3',
      job_id: 'job-1',
      task_type: 'text',
      payload: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      priority: 1,
      status: 'pending' as const,
      retry_count: 3,
      max_retries: 3,
      result: null as unknown as string,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      owner_id: null,
    }

    mockTaskExecutor.executeTask = vi.fn().mockRejectedValue(new Error('Processing failed'))

    const result = await queueProcessor.processBatch('job-1', [failedTask])

    expect(result.tasksExecuted).toBe(1)
    expect(result.tasksFailed).toBe(1)
    expect(mockTaskService.moveToDeadLetter).toHaveBeenCalled()
  })
})

describe('WorkflowEngine with TaskExecutor', () => {
  let mockRegistry: Partial<ServiceNodeRegistry>
  let mockTaskExecutor: { executeTask: ReturnType<typeof vi.fn> }
  let mockEventBus: ReturnType<typeof createMockEventBus>
  let mockTaskService: ITaskService
  let workflowEngine: WorkflowEngine

  beforeEach(() => {
    vi.clearAllMocks()
    resetContainer()

    mockRegistry = {
      call: vi.fn(),
    }

    mockTaskExecutor = {
      executeTask: vi.fn(),
    }

    mockEventBus = createMockEventBus()
    mockTaskService = createMockTaskService()
    getGlobalContainer().register(TOKENS.TASK_SERVICE, mockTaskService)
    
    workflowEngine = new WorkflowEngine(
      null,
      mockRegistry as ServiceNodeRegistry,
      mockTaskExecutor as any,
      mockEventBus
    )
  })

  afterEach(() => {
    resetContainer()
  })

  it('should use TaskExecutor directly when available for queue nodes', async () => {
    const queueTask = {
      id: 'task-1',
      job_id: 'job-1',
      task_type: 'text',
      payload: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      priority: 1,
      status: 'pending' as const,
      retry_count: 0,
      max_retries: 3,
      result: null as unknown as string,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      owner_id: null,
    }

    mockTaskService.getPendingByJobId = vi.fn().mockResolvedValue([queueTask])
    mockTaskExecutor.executeTask = vi.fn().mockResolvedValue({
      success: true,
      data: { result: 'success' },
      durationMs: 100,
    })

    const workflowJson = JSON.stringify({
      nodes: [
        {
          id: 'queue-node',
          type: 'queue',
          data: {
            label: 'Process Queue',
            config: { jobId: 'job-1', limit: 10 },
          },
        },
      ],
      edges: [],
    })

    const result = await workflowEngine.executeWorkflow(workflowJson, 'log-1', mockTaskExecutor as any)

    expect(result.success).toBe(true)
    expect(mockTaskExecutor.executeTask).toHaveBeenCalledWith('text', { messages: [{ role: 'user', content: 'Hello' }] })
    expect(mockRegistry.call).not.toHaveBeenCalled()
  })

  it('should fall back to serviceRegistry when TaskExecutor is not available', async () => {
    const workflowEngineWithoutExecutor = new WorkflowEngine(
      null,
      mockRegistry as ServiceNodeRegistry,
      undefined,
      mockEventBus
    )

    const queueTask = {
      id: 'task-1',
      job_id: 'job-1',
      task_type: 'text',
      payload: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      priority: 1,
      status: 'pending' as const,
      retry_count: 0,
      max_retries: 3,
      result: null as unknown as string,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      owner_id: null,
    }

    mockTaskService.getPendingByJobId = vi.fn().mockResolvedValue([queueTask])
    mockRegistry.call = vi.fn().mockResolvedValue({ success: true, data: { result: 'success' }, durationMs: 100 })

    const workflowJson = JSON.stringify({
      nodes: [
        {
          id: 'queue-node',
          type: 'queue',
          data: {
            label: 'Process Queue',
            config: { jobId: 'job-1', limit: 10 },
          },
        },
      ],
      edges: [],
    })

    const result = await workflowEngineWithoutExecutor.executeWorkflow(workflowJson, 'log-1')

    expect(result.success).toBe(true)
    expect(mockRegistry.call).toHaveBeenCalledWith('task-executor', 'executeTask', ['text', { messages: [{ role: 'user', content: 'Hello' }] }])
  })
})
