import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorkflowEngine } from '../workflow/index.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { TaskQueueItem } from '../../database/types.js'
import { createMockEventBus } from '../../__tests__/helpers/mock-event-bus.js'
import { getGlobalContainer, resetContainer } from '../../container.js'
import { TOKENS } from '../../service-registration.js'

interface QueueTaskMocks {
  getPendingTasksByJob: ReturnType<typeof vi.fn>
  getPendingTasksByType: ReturnType<typeof vi.fn>
  markTaskRunning: ReturnType<typeof vi.fn>
  markTaskCompleted: ReturnType<typeof vi.fn>
  markTaskFailed: ReturnType<typeof vi.fn>
  createDeadLetterQueueItem: ReturnType<typeof vi.fn>
}

describe('WorkflowEngine - Queue Node', () => {
  let engine: WorkflowEngine
  let queueTaskMocks: QueueTaskMocks
  let mockRegistry: Partial<ServiceNodeRegistry>

  beforeEach(() => {
    queueTaskMocks = {
      getPendingTasksByJob: vi.fn().mockResolvedValue([]),
      getPendingTasksByType: vi.fn().mockResolvedValue([]),
      markTaskRunning: vi.fn().mockImplementation(async (id: string) => ({
        id,
        status: 'running',
      })),
      markTaskCompleted: vi.fn().mockImplementation(async (id: string) => ({
        id,
        status: 'completed',
      })),
      markTaskFailed: vi.fn().mockImplementation(async (id: string) => ({
        id,
        status: 'failed',
      })),
      createDeadLetterQueueItem: vi.fn().mockResolvedValue({ id: 'dlq-1' }),
    }

    getGlobalContainer().register(TOKENS.TASK_SERVICE, {
      getPendingByJobId: (jobId: string, limit: number) =>
        (queueTaskMocks.getPendingTasksByJob as unknown as (jobId: string, limit: number) => Promise<TaskQueueItem[]>)(jobId, limit),
      getPendingByType: (taskType: string, limit: number) =>
        (queueTaskMocks.getPendingTasksByType as unknown as (taskType: string, limit: number) => Promise<TaskQueueItem[]>)(taskType, limit),
      markRunning: (id: string) =>
        (queueTaskMocks.markTaskRunning as unknown as (id: string) => Promise<TaskQueueItem>)(id),
      markCompleted: (id: string, result?: string) =>
        (queueTaskMocks.markTaskCompleted as unknown as (id: string, result?: string) => Promise<TaskQueueItem>)(id, result),
      markFailed: (id: string, error: string) =>
        (queueTaskMocks.markTaskFailed as unknown as (id: string, error: string) => Promise<TaskQueueItem>)(id, error),
      moveToDeadLetter: (id: string, error: string) =>
        (queueTaskMocks.createDeadLetterQueueItem as unknown as (data: { task_id: string; error_message: string }) => Promise<{ id: string }>)(
          { task_id: id, error_message: error }
        ),
    })

    mockRegistry = {
      call: vi.fn().mockResolvedValue({ success: true }),
    }

    engine = new WorkflowEngine(null, mockRegistry as ServiceNodeRegistry, undefined, createMockEventBus())
  })

  afterEach(() => {
    resetContainer()
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
