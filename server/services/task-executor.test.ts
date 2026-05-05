import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TaskExecutor } from '../services/task-executor'
import type { DatabaseService } from '../services/task-executor'
import type { MiniMaxClient } from '../lib/minimax/index.js'

class TestableTaskExecutor extends TaskExecutor {
  public testDelay(ms: number): Promise<void> {
    return (this as unknown as { delay(ms: number): Promise<void> }).delay(ms)
  }

  public async testExecuteTask(taskType: string, payload: Record<string, unknown>) {
    return this.executeTask(taskType, payload)
  }
}

describe('TaskExecutor', () => {
  let executor: TestableTaskExecutor
  let mockClient: Partial<MiniMaxClient>
  let mockDb: Partial<DatabaseService>
  beforeEach(() => {
    mockClient = {
      chatCompletion: vi.fn().mockResolvedValue({ result: 'chat response' }),
      textToAudioSync: vi.fn().mockResolvedValue({ result: 'audio response' }),
      textToAudioAsync: vi.fn().mockResolvedValue({ task_id: 'async-task-123' }),
      textToAudioAsyncStatus: vi.fn().mockResolvedValue({ status: 'completed' }),
      imageGeneration: vi.fn().mockResolvedValue({ result: 'image response' }),
      musicGeneration: vi.fn().mockResolvedValue({ result: 'music response' }),
      videoGeneration: vi.fn().mockResolvedValue({ task_id: 'video-task-123' }),
      videoGenerationStatus: vi.fn().mockResolvedValue({ status: 'completed' }),
    }

    mockDb = {
      getCapacityRecord: vi.fn().mockResolvedValue(null),
      upsertCapacityRecord: vi.fn().mockResolvedValue(undefined),
    }

    executor = new TestableTaskExecutor(mockClient as MiniMaxClient, mockDb as DatabaseService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('executeTask - sync tasks', () => {
    it('should execute text task successfully', async () => {
      const result = await executor.executeTask('text', { messages: [] })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ result: 'chat response' })
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(mockClient.chatCompletion).toHaveBeenCalledWith({ messages: [] })
    })

    it('should execute voice_sync task successfully', async () => {
      const result = await executor.executeTask('voice_sync', { text: 'hello' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ result: 'audio response' })
      expect(mockClient.textToAudioSync).toHaveBeenCalledWith({ text: 'hello' })
    })

    it('should execute image task successfully', async () => {
      const result = await executor.executeTask('image', { prompt: 'a cat' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ result: 'image response' })
      expect(mockClient.imageGeneration).toHaveBeenCalledWith({ prompt: 'a cat' })
    })

    it('should execute music task successfully', async () => {
      const result = await executor.executeTask('music', { prompt: 'jazz music' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ result: 'music response' })
      expect(mockClient.musicGeneration).toHaveBeenCalledWith({ prompt: 'jazz music' })
    })
  })

  describe('executeTask - async tasks', () => {
    it('should execute voice_async task successfully with immediate completion', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(true)
      expect(mockClient.textToAudioAsync).toHaveBeenCalledWith({ text: 'hello' })
      vi.useRealTimers()
    }, 30000)

    it('should execute video task successfully with immediate completion', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())

      const result = await executor.executeTask('video', { prompt: 'a video' })

      expect(result.success).toBe(true)
      expect(mockClient.videoGeneration).toHaveBeenCalledWith({ prompt: 'a video' })
      vi.useRealTimers()
    }, 30000)

    it('should handle voice_async task returning failed status', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsyncStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'failed' })

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('failed')
      vi.useRealTimers()
    }, 30000)
  })

  describe('executeTask - error handling', () => {
    it('should return error for unknown task type', async () => {
      const result = await executor.executeTask('unknown_type', {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown task type')
    })

    it('should handle client exceptions', async () => {
      ;(mockClient.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('API Error')
      )

      const result = await executor.executeTask('text', { messages: [] })

      expect(result.success).toBe(false)
      expect(result.error).toContain('API Error')
    })

    it('should handle non-Error exceptions', async () => {
      ;(mockClient.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        'string error'
      )

      const result = await executor.executeTask('text', { messages: [] })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should handle timeout for sync tasks', async () => {
      vi.useFakeTimers()
      
      ;(mockClient.chatCompletion as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      )

      const timeoutPromise = executor.executeTask('text', { messages: [] })
      vi.advanceTimersByTime(300000)
      
      const result = await timeoutPromise
      vi.useRealTimers()

      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })

    it('should handle method on client correctly', async () => {
      ;(mockClient.chatCompletion as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const result = await executor.executeTask('text', {})

      expect(result.success).toBe(true)
    })
  })

  describe('executeTask - duration tracking', () => {
    it('should track execution duration', async () => {
      ;(mockClient.chatCompletion as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { result: 'delayed response' }
      })

      const result = await executor.executeTask('text', { messages: [] })

      expect(result.durationMs).toBeGreaterThanOrEqual(9)
    })
  })

  describe('delay method', () => {
    it('should delay for specified milliseconds using real timers', async () => {
      vi.useFakeTimers()
      const delayPromise = executor.testDelay(50)
      vi.advanceTimersByTime(50)
      await delayPromise
      vi.useRealTimers()
    }, 10000)
  })

  describe('executeWithPolling - status checks', () => {
    it('should handle success status as completed', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsyncStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'success' })

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(true)
      vi.useRealTimers()
    }, 30000)

    it('should handle done status as completed', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsyncStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'done' })

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(true)
      vi.useRealTimers()
    }, 30000)

    it('should handle nested status in data field', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsyncStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { status: 'completed' } })

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(true)
      vi.useRealTimers()
    }, 30000)

    it('should handle nested task_status field', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsyncStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ task_status: 'completed' })

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(true)
      vi.useRealTimers()
    }, 30000)

    it('should throw error when task_id is missing in response', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsync as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('did not return a task_id')
      vi.useRealTimers()
    }, 30000)

    it('should extract task_id from nested data object', async () => {
      vi.useFakeTimers()
      vi.spyOn(executor as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockImplementation(() => Promise.resolve())
      ;(mockClient.textToAudioAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { task_id: 'nested-task-id' }
      })
      ;(mockClient.textToAudioAsyncStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'completed' })

      const result = await executor.executeTask('voice_async', { text: 'hello' })

      expect(result.success).toBe(true)
      expect(mockClient.textToAudioAsyncStatus).toHaveBeenCalledWith('nested-task-id')
      vi.useRealTimers()
    }, 30000)
  })
})
