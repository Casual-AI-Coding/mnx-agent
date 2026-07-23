import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { WorkflowEngine } from '../workflow/index.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { TaskQueueItem } from '../../database/types.js'
import type { ITaskService } from '../../services/domain/interfaces/task.interface.js'
import { createMockEventBus } from '../../__tests__/helpers/mock-event-bus.js'
import { createMockLogService, createMockTaskService } from '../../__tests__/helpers/mock-services.js'

type GetPendingByJobId = (jobId: string, limit: number) => Promise<TaskQueueItem[]>
type GetPendingByType = (taskType: string, limit: number) => Promise<TaskQueueItem[]>
type MarkRunning = (id: string) => Promise<TaskQueueItem>
type MarkCompleted = (id: string, result?: string) => Promise<TaskQueueItem>
type MarkFailed = (id: string, error: string) => Promise<TaskQueueItem>
type CreateDeadLetter = (data: { task_id: string; error_message: string }) => Promise<{ id: string }>

interface QueueTaskMocks {
  getPendingTasksByJob: Mock<GetPendingByJobId>
  getPendingTasksByType: Mock<GetPendingByType>
  markTaskRunning: Mock<MarkRunning>
  markTaskCompleted: Mock<MarkCompleted>
  markTaskFailed: Mock<MarkFailed>
  createDeadLetterQueueItem: Mock<CreateDeadLetter>
}

describe('WorkflowEngine - Queue Node', () => {
  let engine: WorkflowEngine
  let queueTaskMocks: QueueTaskMocks
  let mockRegistry: Partial<ServiceNodeRegistry>

  beforeEach(() => {
    queueTaskMocks = {
      getPendingTasksByJob: vi.fn<GetPendingByJobId>().mockResolvedValue([]),
      getPendingTasksByType: vi.fn<GetPendingByType>().mockResolvedValue([]),
      markTaskRunning: vi.fn<MarkRunning>().mockImplementation(async (id) => ({
        id,
        status: 'running',
      } as TaskQueueItem)),
      markTaskCompleted: vi.fn<MarkCompleted>().mockImplementation(async (id) => ({
        id,
        status: 'completed',
      } as TaskQueueItem)),
      markTaskFailed: vi.fn<MarkFailed>().mockImplementation(async (id) => ({
        id,
        status: 'failed',
      } as TaskQueueItem)),
      createDeadLetterQueueItem: vi.fn<CreateDeadLetter>().mockResolvedValue({ id: 'dlq-1' }),
    }

    const mockTaskService: ITaskService = createMockTaskService({
      getPendingByJobId: (jobId, limit) => queueTaskMocks.getPendingTasksByJob(jobId, limit),
      getPendingByType: (taskType, limit) => queueTaskMocks.getPendingTasksByType(taskType, limit),
      markRunning: (id) => queueTaskMocks.markTaskRunning(id),
      markCompleted: (id, result) => queueTaskMocks.markTaskCompleted(id, result),
      markFailed: (id, error) => queueTaskMocks.markTaskFailed(id, error),
      moveToDeadLetter: (id, error) => {
        void queueTaskMocks.createDeadLetterQueueItem({ task_id: id, error_message: error })
        return Promise.resolve()
      },
    })

    mockRegistry = {
      call: vi.fn().mockResolvedValue({ success: true }),
    }

    engine = new WorkflowEngine(
      null,
      mockRegistry as ServiceNodeRegistry,
      undefined,
      createMockEventBus(),
      createMockLogService(),
      mockTaskService,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('queue processing', () => {
    it('should process pending tasks from queue', async () => {
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          job_id: 'job-1',
          task_type: 'text',
          payload: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 0,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
        {
          id: 'task-2',
          job_id: 'job-1',
          task_type: 'text',
          payload: JSON.stringify({ messages: [{ role: 'user', content: 'World' }] }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 0,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
      ]

      queueTaskMocks.getPendingTasksByJob = vi.fn().mockResolvedValue(mockTasks)

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { jobId: 'job-1', limit: 10 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(queueTaskMocks.getPendingTasksByJob).toHaveBeenCalledWith('job-1', 10)
      expect(queueTaskMocks.markTaskRunning).toHaveBeenCalledTimes(2)
      expect(queueTaskMocks.markTaskCompleted).toHaveBeenCalledTimes(2)
    })

    it('should process tasks by type when no jobId specified', async () => {
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          job_id: null,
          task_type: 'voice_sync',
          payload: JSON.stringify({ text: 'Hello' }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 0,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
      ]

      queueTaskMocks.getPendingTasksByType = vi.fn().mockResolvedValue(mockTasks)

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { taskType: 'voice_sync', limit: 5 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(queueTaskMocks.getPendingTasksByType).toHaveBeenCalledWith('voice_sync', 5)
    })

    it('should return summary of processed tasks', async () => {
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          job_id: 'job-1',
          task_type: 'text',
          payload: JSON.stringify({ messages: [] }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 0,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
      ]

      queueTaskMocks.getPendingTasksByJob = vi.fn().mockResolvedValue(mockTasks)

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { jobId: 'job-1', limit: 10 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      const queueResult = result.nodeResults.get('queue')
      expect(queueResult?.success).toBe(true)
      expect(queueResult?.data).toMatchObject({
        total: 1,
        succeeded: 1,
        failed: 0,
      })
    })
  })

  describe('task execution', () => {
    it('should execute task using service registry', async () => {
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          job_id: 'job-1',
          task_type: 'text',
          payload: JSON.stringify({ messages: [{ role: 'user', content: 'Test' }] }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 0,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
      ]

      queueTaskMocks.getPendingTasksByJob = vi.fn().mockResolvedValue(mockTasks)
      mockRegistry.call = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Response' } }] })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { jobId: 'job-1', limit: 10 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(mockRegistry.call).toHaveBeenCalledWith('task-executor', 'executeTask', [
        'text',
        { messages: [{ role: 'user', content: 'Test' }] },
      ])
    })

    it('should handle task execution failure', async () => {
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          job_id: 'job-1',
          task_type: 'text',
          payload: JSON.stringify({ messages: [] }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 2,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
      ]

      queueTaskMocks.getPendingTasksByJob = vi.fn().mockResolvedValue(mockTasks)
      mockRegistry.call = vi.fn().mockRejectedValue(new Error('Task failed'))

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { jobId: 'job-1', limit: 10 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(queueTaskMocks.markTaskFailed).toHaveBeenCalledWith('task-1', 'Task failed')
      const queueResult = result.nodeResults.get('queue')
      expect(queueResult?.data).toMatchObject({
        total: 1,
        succeeded: 0,
        failed: 1,
      })
    })
  })

  describe('dead letter queue', () => {
    it('should move task to DLQ after max retries', async () => {
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          job_id: 'job-1',
          task_type: 'text',
          payload: JSON.stringify({ messages: [] }),
          priority: 1,
          status: 'pending' as const,
          retry_count: 2,
          max_retries: 3,
          result: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          owner_id: null,
        },
      ]

      queueTaskMocks.getPendingTasksByJob = vi.fn().mockResolvedValue(mockTasks)
      mockRegistry.call = vi.fn().mockRejectedValue(new Error('Task failed'))

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { jobId: 'job-1', limit: 10 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(queueTaskMocks.markTaskFailed).toHaveBeenCalledWith('task-1', 'Task failed')
      expect(queueTaskMocks.createDeadLetterQueueItem).toHaveBeenCalled()
    })
  })

  describe('empty queue', () => {
    it('should handle empty queue gracefully', async () => {
      queueTaskMocks.getPendingTasksByJob = vi.fn().mockResolvedValue([])

      const workflow = JSON.stringify({
        nodes: [
          { id: 'queue', type: 'queue', data: { label: 'Process Queue', config: { jobId: 'job-1', limit: 10 } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      const queueResult = result.nodeResults.get('queue')
      expect(queueResult?.data).toMatchObject({
        total: 0,
        succeeded: 0,
        failed: 0,
      })
    })
  })
})
