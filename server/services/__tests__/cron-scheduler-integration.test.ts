import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CronScheduler, getCronScheduler, resetCronScheduler } from '../cron-scheduler'
import { WorkflowEngine } from '../workflow-engine'
import { QueueProcessor } from '../queue-processor'
import type { DatabaseService } from '../../database/service-async'
import type { ServiceNodeRegistry } from '../service-node-registry'
import { cronEvents } from '../websocket-service'

describe('CronScheduler Integration with TaskExecutor', () => {
  let mockDb: Partial<DatabaseService>
  let mockRegistry: Partial<ServiceNodeRegistry>
  let mockTaskExecutor: {
    executeTask: ReturnType<typeof vi.fn>
  }
  let workflowEngine: WorkflowEngine
  let cronScheduler: CronScheduler

  beforeEach(() => {
    vi.clearAllMocks()
    resetCronScheduler()

    mockDb = {
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

    workflowEngine = new WorkflowEngine(mockDb as DatabaseService, mockRegistry as ServiceNodeRegistry, mockTaskExecutor as any)
    cronScheduler = new CronScheduler(mockDb as DatabaseService, workflowEngine as any, mockTaskExecutor as any, {
      maxConcurrent: 2,
      timezone: 'UTC',
      defaultTimeoutMs: 5000,
    })
  })

  afterEach(() => {
    cronScheduler?.stopAll()
    resetCronScheduler()
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

      mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
        id: 'wf-1',
        nodes_json: workflowJson,
        edges_json: '[]',
      })

      const result = await workflowEngine.executeWorkflow(workflowJson, 'log-1', mockTaskExecutor as any)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })
  })

  describe('getCronScheduler factory with TaskExecutor', () => {
    it('should accept TaskExecutor parameter', () => {
      const scheduler = getCronScheduler(
        mockDb as DatabaseService,
        workflowEngine as any,
        mockTaskExecutor as any,
        { timezone: 'UTC' }
      )

      expect(scheduler).toBeDefined()
    })
  })
})

describe('QueueProcessor Dead Letter Queue', () => {
  let mockDb: Partial<DatabaseService>
  let mockTaskExecutor: { executeTask: ReturnType<typeof vi.fn> }
  let mockCapacityChecker: {
    hasCapacity: ReturnType<typeof vi.fn>
    decrementCapacity: ReturnType<typeof vi.fn>
    getSafeExecutionLimit: ReturnType<typeof vi.fn>
  }
  let queueProcessor: QueueProcessor

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      getPendingTasks: vi.fn().mockResolvedValue([]),
      getPendingTasksByJob: vi.fn().mockResolvedValue([]),
      getPendingTasksByType: vi.fn().mockResolvedValue([]),
      updateTask: vi.fn().mockResolvedValue(undefined),
      markTaskRunning: vi.fn().mockResolvedValue({ id: 'task-1', status: 'running' }),
      markTaskCompleted: vi.fn().mockResolvedValue({ id: 'task-1', status: 'completed' }),
      markTaskFailed: vi.fn().mockResolvedValue({ id: 'task-1', status: 'failed' }),
      createDeadLetterQueueItem: vi.fn().mockResolvedValue({ id: 'dlq-1' }),
      getQueueStats: vi.fn().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }),
    }

    mockTaskExecutor = {
      executeTask: vi.fn(),
    }

    mockCapacityChecker = {
      hasCapacity: vi.fn().mockResolvedValue(true),
      decrementCapacity: vi.fn().mockResolvedValue(undefined),
      getSafeExecutionLimit: vi.fn().mockResolvedValue(10),
    }

    queueProcessor = new QueueProcessor(
      mockDb as DatabaseService,
      mockTaskExecutor as any,
      mockCapacityChecker as any
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

    mockDb.getPendingTasks = vi.fn().mockResolvedValue([failedTask])
    mockTaskExecutor.executeTask = vi.fn().mockRejectedValue(new Error('API Error'))

    const result = await queueProcessor.processQueue('job-1', { batchSize: 10 })

    expect(result.tasksExecuted).toBe(1)
    expect(result.tasksFailed).toBe(1)
    expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalledTimes(1)
    expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalledWith(
      expect.objectContaining({
        original_task_id: 'task-1',
        job_id: 'job-1',
        task_type: 'image',
        error_message: 'API Error',
        retry_count: 3,
        max_retries: 3,
      }),
      'user-1'
    )
  })

  it('should emit DLQ event when task is moved to dead letter queue', async () => {
    const emitSpy = vi.spyOn(cronEvents, 'emitTaskMovedToDLQ')

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

    mockDb.getPendingTasks = vi.fn().mockResolvedValue([failedTask])
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
    expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalled()
  })
})

describe('WorkflowEngine with TaskExecutor', () => {
  let mockDb: Partial<DatabaseService>
  let mockRegistry: Partial<ServiceNodeRegistry>
  let mockTaskExecutor: { executeTask: ReturnType<typeof vi.fn> }
  let workflowEngine: WorkflowEngine

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      getPendingTasksByJob: vi.fn().mockResolvedValue([]),
      getPendingTasksByType: vi.fn().mockResolvedValue([]),
      markTaskRunning: vi.fn().mockResolvedValue({ id: 'task-1', status: 'running' }),
      markTaskCompleted: vi.fn().mockResolvedValue({ id: 'task-1', status: 'completed' }),
      markTaskFailed: vi.fn().mockResolvedValue({ id: 'task-1', status: 'failed' }),
      createDeadLetterQueueItem: vi.fn().mockResolvedValue({ id: 'dlq-1' }),
    }

    mockRegistry = {
      call: vi.fn(),
    }

    mockTaskExecutor = {
      executeTask: vi.fn(),
    }

    workflowEngine = new WorkflowEngine(mockDb as DatabaseService, mockRegistry as ServiceNodeRegistry, mockTaskExecutor as any)
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

    mockDb.getPendingTasksByJob = vi.fn().mockResolvedValue([queueTask])
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
    const workflowEngineWithoutExecutor = new WorkflowEngine(mockDb as DatabaseService, mockRegistry as ServiceNodeRegistry)

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

    mockDb.getPendingTasksByJob = vi.fn().mockResolvedValue([queueTask])
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