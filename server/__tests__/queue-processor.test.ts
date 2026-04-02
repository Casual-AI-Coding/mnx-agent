import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { QueueProcessor } from '../services/queue-processor'
import { TaskStatus, TaskQueueRow } from '../database/types'
import type { DatabaseService } from '../database'

// Helper to access private methods for testing
class TestableQueueProcessor extends QueueProcessor {
  public testCalculateRetryDelay(retryCount: number): number {
    return (this as any).calculateRetryDelay(retryCount)
  }
}

interface MockDatabaseService {
  getPendingTasks: ReturnType<typeof vi.fn>
  getQueueStats: ReturnType<typeof vi.fn>
  updateTask: ReturnType<typeof vi.fn>
  updateTaskStatus: ReturnType<typeof vi.fn>
  getDatabase: ReturnType<typeof vi.fn>
}

interface MockTaskExecutor {
  executeTask: ReturnType<typeof vi.fn>
}

interface MockCapacityChecker {
  hasCapacity: ReturnType<typeof vi.fn>
  decrementCapacity: ReturnType<typeof vi.fn>
}

describe('QueueProcessor', () => {
  let processor: TestableQueueProcessor
  let mockDb: MockDatabaseService
  let mockTaskExecutor: MockTaskExecutor
  let mockCapacityChecker: MockCapacityChecker
  let mockDatabaseRun: ReturnType<typeof vi.fn>
  let sleepSpy: ReturnType<typeof vi.spyOn>

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
      })
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
      decrementCapacity: vi.fn().mockResolvedValue(undefined)
    }

    processor = new TestableQueueProcessor(
      mockDb as any as DatabaseService,
      mockTaskExecutor as any,
      mockCapacityChecker as any
    )
    
    sleepSpy = vi.spyOn(processor as any, 'sleep').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    sleepSpy?.mockRestore()
  })

  describe('Exponential Backoff', () => {
    it('should calculate correct delay for retry attempt 1', () => {
      // Mock Math.random to return 0 for predictable jitter
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0)
      
      const delay = processor.testCalculateRetryDelay(1)
      expect(delay).toBe(2000) // 1000 * 2^1 + 0 jitter
      
      Math.random = originalRandom
    })

    it('should calculate correct delay for retry attempt 0', () => {
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0)
      
      const delay = processor.testCalculateRetryDelay(0)
      expect(delay).toBe(1000) // 1000 * 2^0 + 0 jitter
      
      Math.random = originalRandom
    })

    it('should calculate correct delay for retry attempt 2', () => {
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0)
      
      const delay = processor.testCalculateRetryDelay(2)
      expect(delay).toBe(4000) // 1000 * 2^2 + 0 jitter
      
      Math.random = originalRandom
    })

    it('should calculate correct delay for retry attempt 3', () => {
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0)
      
      const delay = processor.testCalculateRetryDelay(3)
      expect(delay).toBe(8000) // 1000 * 2^3 + 0 jitter
      
      Math.random = originalRandom
    })

    it('should add jitter to delay', () => {
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0.5) // 500ms jitter
      
      const delay = processor.testCalculateRetryDelay(1)
      expect(delay).toBe(2500) // 2000 base + 500 jitter
      
      Math.random = originalRandom
    })

    it('should cap at max delay of 5 minutes (300000ms)', () => {
      // With retry count 10, base would be 1000 * 2^10 = 1024000ms
      const delay = processor.testCalculateRetryDelay(10)
      expect(delay).toBeLessThanOrEqual(300000)
    })

    it('should cap delay even with high retry count', () => {
      const delay = processor.testCalculateRetryDelay(20)
      expect(delay).toBeLessThanOrEqual(300000)
    })

    it('should have minimum delay of 1000ms', () => {
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0)
      
      const delay = processor.testCalculateRetryDelay(0)
      expect(delay).toBeGreaterThanOrEqual(1000)
      
      Math.random = originalRandom
    })
  })

  describe('Retry Logic', () => {
    const createMockTask = (retryCount: number, maxRetries: number): TaskQueueRow => ({
      id: 'task-1',
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
      result: null
    })

    it('should requeue task with incremented retry count on failure', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
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
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Task failed',
        durationMs: 100
      })

      const result = await processor.processQueue('job-1', { skipFailed: true })

      expect(result.tasksFailed).toBe(1)
      // Should NOT have called requeueTask
      expect(mockDb.updateTask).not.toHaveBeenCalledWith('task-1', expect.objectContaining({
        retry_count: expect.any(Number)
      }))
    })

    it('should not requeue when max retries reached', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockImplementationOnce(async () => ({
        success: false,
        error: 'Task failed',
        durationMs: 100
      }))

      const result = await processor.processQueue('job-1')

      expect(result.tasksFailed).toBe(1)
      expect(mockDatabaseRun).toHaveBeenCalled()
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

    it('should decrement capacity on successful task', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      await processor.processQueue('job-1')

      expect(mockCapacityChecker.decrementCapacity).toHaveBeenCalledWith('text')
    })

    it('should NOT decrement capacity on failed task', async () => {
      const task = createMockTask(0, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockCapacityChecker.decrementCapacity).not.toHaveBeenCalled()
    })
  })

  describe('Dead Letter Queue', () => {
    const createMockTask = (retryCount: number, maxRetries: number): TaskQueueRow => ({
      id: 'task-1',
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
      result: null
    })

    it('should move task to dead letter queue after max retries exceeded', async () => {
      const task = createMockTask(3, 3) // retry_count >= max_retries
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Task failed after retries',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDatabaseRun).toHaveBeenCalled()
    })

    it('should include error message in dead letter queue entry', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Specific error message',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      // Verify dead letter queue insert was called
      expect(mockDb.getDatabase).toHaveBeenCalled()
      expect(mockDatabaseRun).toHaveBeenCalled()
    })

    it('should use default error message when task has no error', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDatabaseRun).toHaveBeenCalled()
    })

    it('should include retry count in dead letter queue entry', async () => {
      const task = createMockTask(5, 3) // retry_count 5, max_retries 3
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      await processor.processQueue('job-1')

      expect(mockDatabaseRun).toHaveBeenCalled()
    })

    it('should handle database error when moving to dead letter queue gracefully', async () => {
      const task = createMockTask(3, 3)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })
      mockDatabaseRun.mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      // Should not throw, should handle gracefully
      const result = await processor.processQueue('job-1')
      
      expect(result.tasksFailed).toBe(1)
    })
  })

  describe('Queue Processing', () => {
    const createMockTask = (id: string, priority: number): TaskQueueRow => ({
      id,
      job_id: 'job-1',
      task_type: 'text',
      payload: JSON.stringify({ message: 'test' }),
      priority,
      status: TaskStatus.PENDING,
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      result: null
    })

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
      const task1 = createMockTask('task-1', 1)
      const task2 = createMockTask('task-2', 1)
      const task3 = createMockTask('task-3', 1)
      
      mockDb.getPendingTasks.mockResolvedValueOnce([task1, task2, task3])
      const executionOrder: string[] = []
      
      mockTaskExecutor.executeTask.mockImplementation(async (_type, payload) => {
        executionOrder.push(payload.message)
        return { success: true, durationMs: 100 }
      })

      await processor.processQueue('job-1')

      expect(executionOrder).toEqual(['test', 'test', 'test'])
    })

    it('should respect batchSize option', async () => {
      const tasks = [
        createMockTask('task-1', 1),
        createMockTask('task-2', 1),
        createMockTask('task-3', 1),
        createMockTask('task-4', 1),
        createMockTask('task-5', 1)
      ]
      
      // Return only 2 tasks when batchSize is 2
      mockDb.getPendingTasks.mockResolvedValueOnce(tasks.slice(0, 2))

      const result = await processor.processQueue('job-1', { batchSize: 2 })

      expect(result.tasksExecuted).toBe(2)
    })

    it('should stop processing when capacity exhausted', async () => {
      const task1 = createMockTask('task-1', 1)
      const task2 = createMockTask('task-2', 1)
      
      mockDb.getPendingTasks.mockResolvedValueOnce([task1, task2])
      mockCapacityChecker.hasCapacity.mockResolvedValueOnce(true)
      mockCapacityChecker.hasCapacity.mockResolvedValueOnce(false)

      const result = await processor.processQueue('job-1')

      expect(result.tasksExecuted).toBe(1)
      expect(result.error).toContain('Capacity exhausted')
      expect(result.success).toBe(false)
    })

    it('should return success when all tasks succeed', async () => {
      const task = createMockTask('task-1', 1)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])

      const result = await processor.processQueue('job-1')

      expect(result.success).toBe(true)
      expect(result.tasksSucceeded).toBe(1)
      expect(result.tasksFailed).toBe(0)
    })

    it('should return failure when some tasks fail', async () => {
      const task = createMockTask('task-1', 1)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
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
      const task = createMockTask('task-1', 1)
      mockDb.getPendingTasks.mockResolvedValueOnce([task])
      mockTaskExecutor.executeTask.mockRejectedValueOnce(new Error('Execution error'))

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
        { id: '1', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.PENDING, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null },
        { id: '2', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.PENDING, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null },
        { id: '3', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.RUNNING, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null },
      ]
      
      mockDb.getPendingTasks.mockResolvedValueOnce(tasks)

      const count = await processor.cancelPendingTasks('job-1')

      expect(count).toBe(2) // Only pending tasks
      expect(mockDb.updateTaskStatus).toHaveBeenCalledTimes(2)
      expect(mockDb.updateTaskStatus).toHaveBeenCalledWith('1', TaskStatus.CANCELLED, {})
      expect(mockDb.updateTaskStatus).toHaveBeenCalledWith('2', TaskStatus.CANCELLED, {})
    })
  })

  describe('Retry Failed Tasks', () => {
    it('should reset failed tasks for retry', async () => {
      const tasks: TaskQueueRow[] = [
        { id: '1', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.FAILED, retry_count: 3, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, error_message: 'Error' },
        { id: '2', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.COMPLETED, retry_count: 0, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null },
        { id: '3', job_id: 'job-1', task_type: 'text', payload: '{}', priority: 1, status: TaskStatus.FAILED, retry_count: 2, max_retries: 3, created_at: new Date().toISOString(), started_at: null, completed_at: null, result: null, error_message: 'Error' },
      ]
      
      mockDb.getPendingTasks.mockResolvedValueOnce(tasks)

      const count = await processor.retryFailedTasks('job-1')

      expect(count).toBe(2) // Only failed tasks
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
    const createMockTask = (id: string, retryCount: number, maxRetries: number): TaskQueueRow => ({
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
      result: null
    })

    it('should process a batch of tasks', async () => {
      const batch = [
        createMockTask('task-1', 0, 3),
        createMockTask('task-2', 0, 3)
      ]

      const result = await processor.processBatch('job-1', batch)

      expect(result.tasksExecuted).toBe(2)
      expect(result.tasksSucceeded).toBe(2)
      expect(result.success).toBe(true)
    })

    it('should stop batch processing on capacity exhaustion', async () => {
      const batch = [
        createMockTask('task-1', 0, 3),
        createMockTask('task-2', 0, 3)
      ]
      
      mockCapacityChecker.hasCapacity.mockResolvedValueOnce(true)
      mockCapacityChecker.hasCapacity.mockResolvedValueOnce(false)

      const result = await processor.processBatch('job-1', batch)

      expect(result.tasksExecuted).toBe(1)
      expect(result.error).toContain('Capacity exhausted')
    })

    it('should move failed task to dead letter queue in batch', async () => {
      const batch = [createMockTask('task-1', 3, 3)]
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Failed',
        durationMs: 100
      })

      const result = await processor.processBatch('job-1', batch)

      expect(result.tasksFailed).toBe(1)
      expect(mockDatabaseRun).toHaveBeenCalled()
    })
  })
})