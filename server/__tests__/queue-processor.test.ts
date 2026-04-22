import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { QueueProcessor } from '../services/queue-processor'
import { TaskStatus, TaskQueueRow } from '../database/types'
import type { DatabaseService } from '../database'
import type { IEventBus } from '../services/interfaces/event-bus.interface'
import type { IRetryManager } from '../services/interfaces/retry-manager.interface'
import type { ITaskExecutor } from '../types/task'

interface MockDatabaseService {
  getPendingTasks: ReturnType<typeof vi.fn>
  getQueueStats: ReturnType<typeof vi.fn>
  updateTask: ReturnType<typeof vi.fn>
  updateTaskStatus: ReturnType<typeof vi.fn>
  getDatabase: ReturnType<typeof vi.fn>
  createDeadLetterQueueItem: ReturnType<typeof vi.fn>
  updateTasksStatusBatch: ReturnType<typeof vi.fn>
}

interface MockCapacityChecker {
  hasCapacity: ReturnType<typeof vi.fn>
  reserveCapacity: ReturnType<typeof vi.fn>
  decrementCapacity: ReturnType<typeof vi.fn>
}

const createMockTask = (retryCount: number = 0, maxRetries: number = 3, id: string = 'task-1'): TaskQueueRow => ({
  id,
  job_id: 'job-1',
  task_type: 'text',
  payload: JSON.stringify({ message: 'test' }),
  priority: 1,
  status: TaskStatus.PENDING,
  retry_count: retryCount,
  max_retries: maxRetries,
  created_at: new Date().toISOString(),
  started_at: null,
  completed_at: null,
  result: null,
  owner_id: null
})

describe('QueueProcessor', () => {
  let processor: QueueProcessor
  let mockDb: MockDatabaseService
  let mockTaskExecutor: ITaskExecutor
  let mockCapacityChecker: MockCapacityChecker
  let mockEventBus: IEventBus
  let mockRetryManager: IRetryManager
  let mockDatabaseRun: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockDatabaseRun = vi.fn()
    mockDb = {
      getPendingTasks: vi.fn().mockResolvedValue([]),
      getQueueStats: vi.fn().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }),
      updateTask: vi.fn().mockResolvedValue(undefined),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      getDatabase: vi.fn().mockReturnValue({
        prepare: vi.fn().mockReturnValue({
          run: mockDatabaseRun
        })
      }),
      createDeadLetterQueueItem: vi.fn().mockResolvedValue({ id: 'dlq-1' }),
      updateTasksStatusBatch: vi.fn().mockResolvedValue(1),
    }

    mockTaskExecutor = {
      executeTask: vi.fn().mockResolvedValue({
        success: true,
        data: { result: 'ok' },
        durationMs: 100
      })
    }

    mockCapacityChecker = {
      hasCapacity: vi.fn().mockResolvedValue(true),
      reserveCapacity: vi.fn().mockResolvedValue(true),
      decrementCapacity: vi.fn().mockResolvedValue(undefined),
      getSafeExecutionLimit: vi.fn().mockResolvedValue(10),
    }

    mockEventBus = {
      emit: vi.fn(),
      emitTaskCompleted: vi.fn(),
      emitTaskFailed: vi.fn(),
      emitTaskMovedToDLQ: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }

    mockRetryManager = {
      getRetryDelay: vi.fn().mockReturnValue(1000),
      delay: vi.fn().mockResolvedValue(undefined),
    }

    processor = new QueueProcessor(
      mockDb as any as DatabaseService,
      mockTaskExecutor,
      mockCapacityChecker as any,
      mockEventBus,
      mockRetryManager
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Exponential Backoff', () => {
    it('should use retryManager for retry delay', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Task failed',
        durationMs: 100
      })
      mockRetryManager.getRetryDelay = vi.fn().mockReturnValue(2000)

      await processor.processQueue('job-1')

      expect(mockRetryManager.getRetryDelay).toHaveBeenCalledWith(0)
      expect(mockRetryManager.delay).toHaveBeenCalledWith(2000)
    })
  })

  describe('Retry Logic', () => {
    it('should requeue task with incremented retry count on failure', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Task failed',
        durationMs: 100
      })

      const result = await processor.processQueue('job-1')

      expect(result.tasksFailed).toBe(1)
      expect(mockDb.updateTask).toHaveBeenCalledWith('task-1', {
        status: TaskStatus.PENDING,
        retry_count: 1,
        started_at: null
      })
    })

    it('should not requeue when skipFailed is true', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Task failed',
        durationMs: 100
      })

      const result = await processor.processQueue('job-1', { skipFailed: true })

      expect(result.tasksFailed).toBe(1)
      expect(mockDb.updateTask).not.toHaveBeenCalledWith('task-1', expect.objectContaining({
        retry_count: expect.any(Number)
      }))
    })

    it('should not requeue when max retries reached', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Task failed',
        durationMs: 100
      })

      const result = await processor.processQueue('job-1')

      expect(result.tasksFailed).toBe(1)
      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalled()
    })

    it('should mark task as RUNNING when execution starts', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      await processor.processQueue('job-1')

      expect(mockDb.updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({
        status: TaskStatus.RUNNING,
        started_at: expect.any(String)
      }))
    })

    it('should mark task as COMPLETED on success', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      await processor.processQueue('job-1')

      expect(mockDb.updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({
        status: TaskStatus.COMPLETED,
        completed_at: expect.any(String),
        result: expect.any(String)
      }))
    })

    it('should reserve capacity on successful task', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      await processor.processQueue('job-1')

      expect(mockCapacityChecker.reserveCapacity).toHaveBeenCalledWith('text')
    })

    it('should reserve capacity atomically before executing task', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      await processor.processQueue('job-1')

      expect(mockCapacityChecker.reserveCapacity).toHaveBeenCalledWith('text')
      expect(mockCapacityChecker.hasCapacity).not.toHaveBeenCalled()
      expect(mockCapacityChecker.decrementCapacity).not.toHaveBeenCalled()
    })

    it('should NOT decrement capacity on failed task', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockCapacityChecker.decrementCapacity).not.toHaveBeenCalled()
      expect(mockCapacityChecker.reserveCapacity).toHaveBeenCalledWith('text')
    })
  })

  describe('Dead Letter Queue', () => {
    it('should move task to dead letter queue after max retries exceeded', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Task failed after retries',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalled()
    })

    it('should include error message in dead letter queue entry', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Specific error message',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'Specific error message'
        }),
        undefined
      )
    })

    it('should use default error message when task has no error', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'Max retries exceeded'
        }),
        undefined
      )
    })

    it('should include retry count in dead letter queue entry', async () => {
      const task = createMockTask(5, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          retry_count: 5
        }),
        undefined
      )
    })

    it('should handle database error when moving to dead letter queue gracefully', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })
      mockDb.createDeadLetterQueueItem.mockRejectedValueOnce(new Error('Database error'))

      const result = await processor.processQueue('job-1')
      
      expect(result.tasksFailed).toBe(1)
    })
  })

  describe('Queue Processing', () => {
    it('should return empty result when no pending tasks', async () => {
      mockDb.getPendingTasks.mockResolvedValueOnce([])

      const result = await processor.processQueue('job-1')

      expect(result).toEqual({
        success: true,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0
      })
    })

    it('should process tasks in FIFO order (by pending tasks order)', async () => {
      const task1 = createMockTask(0, 3, 'task-1')
      const task2 = createMockTask(0, 3, 'task-2')
      const task3 = createMockTask(0, 3, 'task-3')
      
      mockDb.getPendingTasks.mockResolvedValueOnce([task1, task2, task3])
      const executionOrder: string[] = []
      
      mockTaskExecutor.executeTask = vi.fn().mockImplementation(async (_type, payload) => {
        executionOrder.push(payload.message)
        return { success: true, durationMs: 100 }
      })

      await processor.processQueue('job-1')

      expect(executionOrder).toEqual(['test', 'test', 'test'])
    })

    it('should respect batchSize option', async () => {
      const tasks = [
        createMockTask(0, 3, 'task-1'),
        createMockTask(0, 3, 'task-2'),
        createMockTask(0, 3, 'task-3'),
        createMockTask(0, 3, 'task-4'),
        createMockTask(0, 3, 'task-5')
      ]
      
      mockDb.getPendingTasks.mockResolvedValueOnce(tasks.slice(0, 2))

      const result = await processor.processQueue('job-1', { batchSize: 2 })

      expect(result.tasksExecuted).toBe(2)
    })

    it('should stop processing when capacity exhausted', async () => {
      const task1 = createMockTask(0, 3, 'task-1')
      const task2 = createMockTask(0, 3, 'task-2')
      
      mockDb.getPendingTasks.mockResolvedValueOnce([task1, task2])
      mockCapacityChecker.reserveCapacity = vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const result = await processor.processQueue('job-1')

      expect(result.tasksExecuted).toBe(1)
      expect(result.error).toContain('Capacity exhausted')
      expect(result.success).toBe(false)
    })

    it('should return success when all tasks succeed', async () => {
      const task = createMockTask(0, 3, 'task-1')
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      const result = await processor.processQueue('job-1')

      expect(result.success).toBe(true)
      expect(result.tasksSucceeded).toBe(1)
      expect(result.tasksFailed).toBe(0)
    })

    it('should return failure when some tasks fail', async () => {
      const task = createMockTask(0, 3, 'task-1')
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      const result = await processor.processQueue('job-1', { skipFailed: true })

      expect(result.success).toBe(false)
      expect(result.tasksSucceeded).toBe(0)
      expect(result.tasksFailed).toBe(1)
    })

    it('should handle task execution errors gracefully', async () => {
      const task = createMockTask(0, 3, 'task-1')
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask = vi.fn().mockRejectedValueOnce(new Error('Execution error'))

      const result = await processor.processQueue('job-1')

      expect(result.tasksFailed).toBe(1)
    })
  })

  describe('Queue Stats', () => {
    it('should return correct queue statistics', async () => {
      mockDb.getQueueStats.mockResolvedValueOnce({
        pending: 1,
        running: 1,
        completed: 1,
        failed: 1,
        cancelled: 1,
        total: 5
      })

      const stats = await processor.getQueueStats('job-1')

      expect(stats).toEqual({
        pending: 1,
        running: 1,
        completed: 1,
        failed: 1,
        cancelled: 1
      })
      expect(mockDb.getQueueStats).toHaveBeenCalledWith('job-1')
    })
  })

  describe('Cancel Pending Tasks', () => {
    it('should cancel all pending tasks', async () => {
      const tasks: TaskQueueRow[] = [
        { id: '1', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.PENDING, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, owner_id: null },
        { id: '2', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.PENDING, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, owner_id: null },
        { id: '3', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.RUNNING, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, owner_id: null },
      ]
      
      mockDb.getPendingTasks.mockResolvedValueOnce(tasks)
      mockDb.updateTasksStatusBatch.mockResolvedValueOnce(2)

      const count = await processor.cancelPendingTasks('job-1')

      expect(count).toBe(2)
      expect(mockDb.updateTasksStatusBatch).toHaveBeenCalledWith(['1', '2'], TaskStatus.CANCELLED)
    })
  })

  describe('Retry Failed Tasks', () => {
    it('should reset failed tasks for retry', async () => {
      const tasks: TaskQueueRow[] = [
        { id: '1', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.FAILED, retry_count: 3, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, error_message: 'Error', owner_id: null },
        { id: '2', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.COMPLETED, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, owner_id: null },
        { id: '3', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.FAILED, retry_count: 2, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, error_message: 'Error', owner_id: null },
      ]
      
      mockDb.getPendingTasks.mockResolvedValueOnce(tasks)

      const count = await processor.retryFailedTasks('job-1')

      expect(count).toBe(2)
      expect(mockDb.updateTask).toHaveBeenCalledTimes(2)
      expect(mockDb.updateTask).toHaveBeenCalledWith('1', {
        status: TaskStatus.PENDING,
        retry_count: 0,
        error_message: null
      })
      expect(mockDb.updateTask).toHaveBeenCalledWith('3', {
        status: TaskStatus.PENDING,
        retry_count: 0,
        error_message: null
      })
    })
  })

  describe('Process Batch', () => {
    it('should process a batch of tasks', async () => {
      const batch = [
        createMockTask(0, 3, 'task-1'),
        createMockTask(0, 3, 'task-2')
      ]

      const result = await processor.processBatch('job-1', batch)

      expect(result.tasksExecuted).toBe(2)
      expect(result.tasksSucceeded).toBe(2)
      expect(result.success).toBe(true)
    })

    it('should stop batch processing on capacity exhaustion', async () => {
      const batch = [
        createMockTask(0, 3, 'task-1'),
        createMockTask(0, 3, 'task-2')
      ]
      
      mockCapacityChecker.reserveCapacity = vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const result = await processor.processBatch('job-1', batch)

      expect(result.tasksExecuted).toBe(1)
      expect(result.error).toContain('Capacity exhausted')
    })

    it('should move failed task to dead letter queue in batch', async () => {
      const batch = [createMockTask(3, 3, 'task-1')]
      mockTaskExecutor.executeTask = vi.fn().mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      const result = await processor.processBatch('job-1', batch)

      expect(result.tasksFailed).toBe(1)
      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalled()
    })
  })
})
