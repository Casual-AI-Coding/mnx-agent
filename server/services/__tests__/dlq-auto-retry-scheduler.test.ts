import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DLQAutoRetryScheduler } from '../dlq-auto-retry-scheduler.js'
import { RETRY_TIMEOUTS } from '../../config/timeouts.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { DeadLetterQueueItem } from '../../database/types.js'

// Mock console.log to suppress output during tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('DLQAutoRetryScheduler', () => {
  let mockDb: DatabaseService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Create mock DatabaseService
    mockDb = {
      getDeadLetterQueueItems: vi.fn().mockResolvedValue([]),
      retryDeadLetterQueueItem: vi.fn().mockResolvedValue('task-1'),
      getDeadLetterQueueItemById: vi.fn(),
      createDeadLetterQueueItem: vi.fn(),
      updateDeadLetterQueueItem: vi.fn(),
    } as unknown as DatabaseService
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should use default config values when no config provided', async () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)

      const stats = await scheduler.getStats()
      expect(stats.config.enabled).toBe(true)
      expect(stats.config.initialDelayMs).toBe(RETRY_TIMEOUTS.BASE_DELAY_MS * 60)
      expect(stats.config.maxDelayMs).toBe(RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS)
      expect(stats.config.maxAttempts).toBe(3)
      expect(stats.config.backoffMultiplier).toBe(2)
    })

    it('should override default config with custom values', async () => {
      const customConfig = {
        enabled: false,
        initialDelayMs: 5000,
        maxDelayMs: 60000,
        maxAttempts: 5,
        backoffMultiplier: 3,
      }

      const scheduler = new DLQAutoRetryScheduler(mockDb, customConfig)

      const stats = await scheduler.getStats()
      expect(stats.config.enabled).toBe(false)
      expect(stats.config.initialDelayMs).toBe(5000)
      expect(stats.config.maxDelayMs).toBe(60000)
      expect(stats.config.maxAttempts).toBe(5)
      expect(stats.config.backoffMultiplier).toBe(3)
    })

    it('should allow partial config override', async () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb, { enabled: false })

      const stats = await scheduler.getStats()
      expect(stats.config.enabled).toBe(false)
      expect(stats.config.initialDelayMs).toBe(RETRY_TIMEOUTS.BASE_DELAY_MS * 60)
      expect(stats.config.maxDelayMs).toBe(RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS)
    })
  })

  describe('isRunning()', () => {
    it('should return false initially', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should return true after start()', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)
      scheduler.start()
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should return false after stop()', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)
      scheduler.start()
      scheduler.stop()
      expect(scheduler.isRunning()).toBe(false)
    })
  })

  describe('start()', () => {
    it('should do nothing if disabled', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb, { enabled: false })
      scheduler.start()

      expect(scheduler.isRunning()).toBe(false)
      // No timer should be set - verify by checking that advancing time doesn't trigger processAutoRetry
      vi.advanceTimersByTime(10000)
      expect(mockDb.getDeadLetterQueueItems).not.toHaveBeenCalled()
    })

    it('should do nothing if already running', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)
      scheduler.start()
      expect(scheduler.isRunning()).toBe(true)

      // Call start again - should not create a new timer
      scheduler.start()
      expect(scheduler.isRunning()).toBe(true)

      // Only one timer should exist - advance and verify single call pattern
      vi.advanceTimersByTime(RETRY_TIMEOUTS.BASE_DELAY_MS * 60)
      expect(mockDb.getDeadLetterQueueItems).toHaveBeenCalledTimes(1)
    })

    it('should start timer if enabled and not running', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs: 1000 })
      scheduler.start()

      expect(scheduler.isRunning()).toBe(true)

      // Timer should trigger after initialDelayMs
      vi.advanceTimersByTime(1000)
      expect(mockDb.getDeadLetterQueueItems).toHaveBeenCalledTimes(1)
    })
  })

  describe('stop()', () => {
    it('should clear timer', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs: 1000 })
      scheduler.start()
      expect(scheduler.isRunning()).toBe(true)

      scheduler.stop()
      expect(scheduler.isRunning()).toBe(false)

      // Advancing time should not trigger processAutoRetry after stop
      vi.advanceTimersByTime(5000)
      expect(mockDb.getDeadLetterQueueItems).not.toHaveBeenCalled()
    })

    it('should set timer to null', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)
      scheduler.start()
      scheduler.stop()

      // isRunning() checks timer !== null
      expect(scheduler.isRunning()).toBe(false)

      // Calling stop again should be safe (no error)
      scheduler.stop()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should be safe to call stop when not running', () => {
      const scheduler = new DLQAutoRetryScheduler(mockDb)
      // Stop without start - should not throw
      scheduler.stop()
      expect(scheduler.isRunning()).toBe(false)
    })
  })

  describe('processAutoRetry (private)', () => {
    it('should skip items that are already resolved', async () => {
      const resolvedItem: DeadLetterQueueItem = {
        id: 'dlq-1',
        job_id: null,
        task_type: 'text',
        payload: '{}',
        error_message: 'Test error',
        failed_at: new Date(Date.now() - 100000).toISOString(),
        retry_count: 0,
        max_retries: 3,
        resolved_at: new Date().toISOString(),
        resolution: 'retried',
        owner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([resolvedItem])

      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs: 1000 })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(1000)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).not.toHaveBeenCalled()
    })

    it('should skip items that exceeded max attempts', async () => {
      const exceededItem: DeadLetterQueueItem = {
        id: 'dlq-2',
        job_id: null,
        task_type: 'text',
        payload: '{}',
        error_message: 'Test error',
        failed_at: new Date(Date.now() - 1000000).toISOString(),
        retry_count: 5,
        max_retries: 3,
        resolved_at: null,
        resolution: null,
        owner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([exceededItem])

      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs: 1000 })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(1000)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).not.toHaveBeenCalled()
    })

    it('should use exponential backoff for retry delay calculation', async () => {
      const initialDelayMs = 60000
      const now = Date.now()

      const itemReadyForRetry: DeadLetterQueueItem = {
        id: 'dlq-3',
        job_id: null,
        task_type: 'text',
        payload: '{}',
        error_message: 'Test error',
        failed_at: new Date(now - initialDelayMs * 2.5).toISOString(),
        retry_count: 1,
        max_retries: 3,
        resolved_at: null,
        resolution: null,
        owner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([itemReadyForRetry])

      const scheduler = new DLQAutoRetryScheduler(mockDb, {
        initialDelayMs,
        backoffMultiplier: 2,
        maxAttempts: 3,
      })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(initialDelayMs)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenCalledWith('dlq-3', undefined)
    })

    it('should cap delay at maxDelayMs', async () => {
      const maxDelayMs = 300000
      const now = Date.now()
      const itemWithHighRetryCount: DeadLetterQueueItem = {
        id: 'dlq-4',
        job_id: null,
        task_type: 'text',
        payload: '{}',
        error_message: 'Test error',
        failed_at: new Date(now - maxDelayMs * 1.5).toISOString(),
        retry_count: 10,
        max_retries: 15,
        resolved_at: null,
        resolution: null,
        owner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([itemWithHighRetryCount])

      const scheduler = new DLQAutoRetryScheduler(mockDb, {
        initialDelayMs: 60000,
        maxDelayMs,
        backoffMultiplier: 2,
        maxAttempts: 15,
      })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(60000)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenCalledWith('dlq-4', undefined)
    })

    it('should call retryDeadLetterQueueItem when retry delay passed', async () => {
      const initialDelayMs = 1000
      const now = Date.now()

      const itemReadyForRetry: DeadLetterQueueItem = {
        id: 'dlq-5',
        job_id: 'job-1',
        task_type: 'image',
        payload: '{"prompt": "test"}',
        error_message: 'API error',
        failed_at: new Date(now - initialDelayMs * 2).toISOString(),
        retry_count: 0,
        max_retries: 3,
        resolved_at: null,
        resolution: null,
        owner_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([itemReadyForRetry])
      vi.mocked(mockDb.retryDeadLetterQueueItem).mockResolvedValue('new-task-1')

      const scheduler = new DLQAutoRetryScheduler(mockDb, {
        initialDelayMs,
        maxAttempts: 3,
      })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(initialDelayMs)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenCalledWith('dlq-5', 'user-1')
    })

    it('should skip items where retry delay has not passed', async () => {
      const initialDelayMs = 60000
      const baseTime = Date.now()
      vi.setSystemTime(baseTime)

      const itemNotReady: DeadLetterQueueItem = {
        id: 'dlq-6',
        job_id: null,
        task_type: 'text',
        payload: '{}',
        error_message: 'Test error',
        failed_at: new Date(baseTime - 1000).toISOString(),
        retry_count: 0,
        max_retries: 3,
        resolved_at: null,
        resolution: null,
        owner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([itemNotReady])

      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(1000)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).not.toHaveBeenCalled()
    })

    it('should handle multiple DLQ items in batch', async () => {
      const initialDelayMs = 1000
      const now = Date.now()

      const items: DeadLetterQueueItem[] = [
        {
          id: 'dlq-7',
          job_id: null,
          task_type: 'text',
          payload: '{}',
          error_message: 'Error 1',
          failed_at: new Date(now - initialDelayMs * 2).toISOString(),
          retry_count: 0,
          max_retries: 3,
          resolved_at: null,
          resolution: null,
          owner_id: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'dlq-8',
          job_id: null,
          task_type: 'voice',
          payload: '{}',
          error_message: 'Error 2',
          failed_at: new Date(now - initialDelayMs * 3).toISOString(),
          retry_count: 1,
          max_retries: 3,
          resolved_at: null,
          resolution: null,
          owner_id: 'user-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue(items)

      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs, maxAttempts: 3 })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(initialDelayMs)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenCalledTimes(2)
      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenNthCalledWith(1, 'dlq-7', 'user-1')
      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenNthCalledWith(2, 'dlq-8', 'user-2')
    })

    it('should continue processing even if one item fails to retry', async () => {
      const initialDelayMs = 1000
      const now = Date.now()

      const items: DeadLetterQueueItem[] = [
        {
          id: 'dlq-9',
          job_id: null,
          task_type: 'text',
          payload: '{}',
          error_message: 'Error 1',
          failed_at: new Date(now - initialDelayMs * 2).toISOString(),
          retry_count: 0,
          max_retries: 3,
          resolved_at: null,
          resolution: null,
          owner_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'dlq-10',
          job_id: null,
          task_type: 'voice',
          payload: '{}',
          error_message: 'Error 2',
          failed_at: new Date(now - initialDelayMs * 2).toISOString(),
          retry_count: 0,
          max_retries: 3,
          resolved_at: null,
          resolution: null,
          owner_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue(items)
      vi.mocked(mockDb.retryDeadLetterQueueItem)
        .mockRejectedValueOnce(new Error('Retry failed'))
        .mockResolvedValueOnce('task-10')

      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(initialDelayMs)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).toHaveBeenCalledTimes(2)
    })

    it('should handle empty DLQ gracefully', async () => {
      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue([])

      const scheduler = new DLQAutoRetryScheduler(mockDb, { initialDelayMs: 1000 })
      scheduler.start()

      await vi.advanceTimersByTimeAsync(1000)
      scheduler.stop()

      expect(mockDb.retryDeadLetterQueueItem).not.toHaveBeenCalled()
    })
  })

  describe('getStats()', () => {
    it('should return correct stats', async () => {
      const items: DeadLetterQueueItem[] = [
        {
          id: 'dlq-1',
          job_id: null,
          task_type: 'text',
          payload: '{}',
          error_message: 'Error',
          failed_at: new Date().toISOString(),
          retry_count: 0,
          max_retries: 3,
          resolved_at: null,
          resolution: null,
          owner_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'dlq-2',
          job_id: null,
          task_type: 'text',
          payload: '{}',
          error_message: 'Error',
          failed_at: new Date().toISOString(),
          retry_count: 5,
          max_retries: 3,
          resolved_at: null,
          resolution: null,
          owner_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'dlq-3',
          job_id: null,
          task_type: 'text',
          payload: '{}',
          error_message: 'Error',
          failed_at: new Date().toISOString(),
          retry_count: 2,
          max_retries: 3,
          resolved_at: new Date().toISOString(),
          resolution: 'retried',
          owner_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      vi.mocked(mockDb.getDeadLetterQueueItems).mockResolvedValue(items)

      const scheduler = new DLQAutoRetryScheduler(mockDb, { maxAttempts: 3 })
      const stats = await scheduler.getStats()

      expect(stats.enabled).toBe(true)
      expect(stats.dlqItemCount).toBe(3)
      expect(stats.pendingRetryCount).toBe(1)
      expect(stats.config.maxAttempts).toBe(3)
    })
  })
})