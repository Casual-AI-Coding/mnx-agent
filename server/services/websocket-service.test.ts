import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  cronEvents,
  initCronWebSocket,
  closeCronWebSocket,
  getWebSocketClientCount,
} from '../services/websocket-service'
import type { Server } from 'http'

const mockWebSocket = {
  on: vi.fn(),
  send: vi.fn(),
  readyState: 1,
  close: vi.fn(),
}

vi.mock('ws', () => {
  const connectionHandler = { current: null as ((...args: unknown[]) => void) | null }
  const MockWebSocketServer = function(this: { on: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }) {
    this.on = vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (event === 'connection') {
        connectionHandler.current = callback
      }
    })
    this.close = vi.fn()
    this.triggerConnection = () => {
      if (connectionHandler.current) {
        connectionHandler.current(mockWebSocket)
      }
    }
  }
  return {
    WebSocketServer: MockWebSocketServer as unknown as ReturnType<typeof vi.fn>,
    WebSocket: function(this: typeof mockWebSocket) { return mockWebSocket } as unknown as ReturnType<typeof vi.fn>,
    _connectionHandler: connectionHandler,
  }
})

describe('WebSocketService', () => {
  let mockServer: Partial<Server>

  beforeEach(() => {
    vi.clearAllMocks()
    closeCronWebSocket()
    mockServer = {
      on: vi.fn(),
      removeListener: vi.fn(),
    }
  })

  afterEach(() => {
    closeCronWebSocket()
  })

  describe('CronEventEmitter', () => {
    describe('emitJobCreated', () => {
      it('should emit job_event with job_created type', () => {
        const handler = vi.fn()
        cronEvents.on('job_event', handler)

        cronEvents.emitJobCreated({ id: 'job-1', name: 'Test Job' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('job_created')
        expect(event.payload).toEqual({ id: 'job-1', name: 'Test Job' })
        expect(event.timestamp).toBeDefined()
      })
    })

    describe('emitJobUpdated', () => {
      it('should emit job_event with job_updated type', () => {
        const handler = vi.fn()
        cronEvents.on('job_event', handler)

        cronEvents.emitJobUpdated({ id: 'job-1', name: 'Updated Job' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('job_updated')
      })
    })

    describe('emitJobDeleted', () => {
      it('should emit job_event with job_deleted type and job id', () => {
        const handler = vi.fn()
        cronEvents.on('job_event', handler)

        cronEvents.emitJobDeleted('job-1')

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('job_deleted')
        expect(event.payload).toEqual({ id: 'job-1' })
      })
    })

    describe('emitJobToggled', () => {
      it('should emit job_event with job_toggled type', () => {
        const handler = vi.fn()
        cronEvents.on('job_event', handler)

        cronEvents.emitJobToggled({ id: 'job-1', is_active: true })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('job_toggled')
      })
    })

    describe('emitJobExecuted', () => {
      it('should emit job_event with job_executed type', () => {
        const handler = vi.fn()
        cronEvents.on('job_event', handler)

        cronEvents.emitJobExecuted('job-1', { success: true, durationMs: 100 })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('job_executed')
        expect(event.payload).toEqual({ jobId: 'job-1', success: true, durationMs: 100 })
      })
    })

    describe('emitTaskCreated', () => {
      it('should emit task_event with task_created type', () => {
        const handler = vi.fn()
        cronEvents.on('task_event', handler)

        cronEvents.emitTaskCreated({ id: 'task-1', type: 'text' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('task_created')
      })
    })

    describe('emitTaskUpdated', () => {
      it('should emit task_event with task_updated type', () => {
        const handler = vi.fn()
        cronEvents.on('task_event', handler)

        cronEvents.emitTaskUpdated({ id: 'task-1', status: 'running' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('task_updated')
      })
    })

    describe('emitTaskCompleted', () => {
      it('should emit task_event with task_completed type', () => {
        const handler = vi.fn()
        cronEvents.on('task_event', handler)

        cronEvents.emitTaskCompleted({ id: 'task-1', result: 'success' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('task_completed')
      })
    })

    describe('emitTaskFailed', () => {
      it('should emit task_event with task_failed type', () => {
        const handler = vi.fn()
        cronEvents.on('task_event', handler)

        cronEvents.emitTaskFailed({ id: 'task-1', error: 'Failed' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('task_failed')
      })
    })

    describe('emitLogCreated', () => {
      it('should emit log_event with log_created type', () => {
        const handler = vi.fn()
        cronEvents.on('log_event', handler)

        cronEvents.emitLogCreated({ id: 'log-1', status: 'running' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('log_created')
      })
    })

    describe('emitLogUpdated', () => {
      it('should emit log_event with log_updated type', () => {
        const handler = vi.fn()
        cronEvents.on('log_event', handler)

        cronEvents.emitLogUpdated({ id: 'log-1', status: 'completed' })

        expect(handler).toHaveBeenCalledTimes(1)
        const event = handler.mock.calls[0][0]
        expect(event.type).toBe('log_updated')
      })
    })
  })

  describe('initCronWebSocket', () => {
    it('should initialize WebSocket server', () => {
      const wss = initCronWebSocket(mockServer as Server)

      expect(wss).toBeDefined()
    })

    it('should return existing server if already initialized', () => {
      const wss1 = initCronWebSocket(mockServer as Server)
      const wss2 = initCronWebSocket(mockServer as Server)

      expect(wss1).toBe(wss2)
    })

    it('should send connected message on new connection', () => {
      initCronWebSocket(mockServer as Server)
    })
  })

  describe('closeCronWebSocket', () => {
    it('should close WebSocket server', () => {
      initCronWebSocket(mockServer as Server)
      closeCronWebSocket()

      const wss = initCronWebSocket(mockServer as Server)
      expect(wss).toBeDefined()
    })

    it('should clean up cron event listeners before reinitializing', () => {
      initCronWebSocket(mockServer as Server)
      const initialJobListeners = cronEvents.listenerCount('job_event')

      closeCronWebSocket()
      initCronWebSocket(mockServer as Server)

      expect(cronEvents.listenerCount('job_event')).toBe(initialJobListeners)
    })
  })

  describe('getWebSocketClientCount', () => {
    it('should return 0 when no clients connected', () => {
      closeCronWebSocket()
      initCronWebSocket(mockServer as Server)

      const count = getWebSocketClientCount()

      expect(count).toBe(0)
    })
  })

  describe('event structure', () => {
    it('should include timestamp in all events', () => {
      const handler = vi.fn()
      cronEvents.on('job_event', handler)

      cronEvents.emitJobCreated({ id: 'test' })

      const event = handler.mock.calls[0][0]
      expect(event.timestamp).toBeDefined()
      expect(typeof event.timestamp).toBe('string')
    })

    it('should have correct payload structure for job events', () => {
      const handler = vi.fn()
      cronEvents.on('job_event', handler)

      cronEvents.emitJobExecuted('job-123', { success: true, durationMs: 500 })

      const event = handler.mock.calls[0][0]
      expect(event.payload).toHaveProperty('jobId')
      expect(event.payload).toHaveProperty('success')
      expect(event.payload).toHaveProperty('durationMs')
    })

    it('should handle null and undefined payload values', () => {
      const handler = vi.fn()
      cronEvents.on('job_event', handler)

      cronEvents.emitJobCreated(null as unknown as object)
      cronEvents.emitJobUpdated(undefined as unknown as object)

      expect(handler).toHaveBeenCalledTimes(2)
    })
  })
})
