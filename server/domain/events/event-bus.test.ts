import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DomainEventBus, DomainEvent, EventHandler } from './event-bus'
import { JobCreatedEvent, JobExecutedEvent, TaskQueuedEvent } from './event-handler'

describe('DomainEventBus', () => {
  let bus: DomainEventBus

  beforeEach(() => {
    bus = new DomainEventBus()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('subscribe and publish single event', () => {
    it('should receive published event in handler', async () => {
      const handler = vi.fn()
      bus.subscribe('job.created', handler)

      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date('2026-04-06T10:00:00Z'),
        payload: { name: 'My Job', cronExpression: '0 * * * *' },
      }

      await bus.publish(event)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should not call handler for different event type', async () => {
      const handler = vi.fn()
      bus.subscribe('job.created', handler)

      const differentEvent: JobExecutedEvent = {
        type: 'job.executed',
        aggregateId: 'job-123',
        occurredAt: new Date('2026-04-06T10:00:00Z'),
        payload: { success: true, duration: 100 },
      }

      await bus.publish(differentEvent)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('multiple handlers for same event', () => {
    it('should call all handlers when event is published', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      bus.subscribe('job.executed', handler1)
      bus.subscribe('job.executed', handler2)
      bus.subscribe('job.executed', handler3)

      const event: JobExecutedEvent = {
        type: 'job.executed',
        aggregateId: 'job-456',
        occurredAt: new Date('2026-04-06T10:00:00Z'),
        payload: { success: true, duration: 250 },
      }

      await bus.publish(event)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).toHaveBeenCalledTimes(1)
    })

    it('should support different handlers for different event types', async () => {
      const jobCreatedHandler = vi.fn()
      const taskQueuedHandler = vi.fn()

      bus.subscribe('job.created', jobCreatedHandler)
      bus.subscribe('task.queued', taskQueuedHandler)

      const jobEvent: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-789',
        occurredAt: new Date(),
        payload: { name: 'Test Job', cronExpression: '*/5 * * * *' },
      }

      const taskEvent: TaskQueuedEvent = {
        type: 'task.queued',
        aggregateId: 'task-001',
        occurredAt: new Date(),
        payload: { taskType: 'text-generation', priority: 'normal' },
      }

      await bus.publish(jobEvent)
      await bus.publish(taskEvent)

      expect(jobCreatedHandler).toHaveBeenCalledTimes(1)
      expect(taskQueuedHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('unsubscribe', () => {
    it('should not call handler after unsubscribing', async () => {
      const handler = vi.fn()
      bus.subscribe('job.created', handler)
      bus.unsubscribe('job.created', handler)

      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { name: 'Test', cronExpression: '* * * * *' },
      }

      await bus.publish(event)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should only remove specific handler, not others', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.subscribe('job.created', handler1)
      bus.subscribe('job.created', handler2)
      bus.unsubscribe('job.created', handler1)

      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { name: 'Test', cronExpression: '* * * * *' },
      }

      await bus.publish(event)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('handler error handling', () => {
    it('should not break other handlers when one throws', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'))
      const successHandler = vi.fn()

      bus.subscribe('job.created', errorHandler)
      bus.subscribe('job.created', successHandler)

      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { name: 'Test', cronExpression: '* * * * *' },
      }

      // Should not throw
      await expect(bus.publish(event)).resolves.not.toThrow()

      // Success handler should still be called
      expect(successHandler).toHaveBeenCalledTimes(1)
      expect(errorHandler).toHaveBeenCalledTimes(1)
    })

    it('should continue publishing even if handler has error', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('fail'))
      const subsequentHandler = vi.fn()

      bus.subscribe('job.created', errorHandler)
      bus.subscribe('job.created', subsequentHandler)

      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { name: 'Test', cronExpression: '* * * * *' },
      }

      await bus.publish(event)

      expect(errorHandler).toHaveBeenCalled()
      expect(subsequentHandler).toHaveBeenCalled()
    })
  })

  describe('publishAll', () => {
    it('should publish multiple events', async () => {
      const handler = vi.fn()

      bus.subscribe('job.created', handler)

      const events: JobCreatedEvent[] = [
        {
          type: 'job.created',
          aggregateId: 'job-1',
          occurredAt: new Date(),
          payload: { name: 'Job 1', cronExpression: '0 * * * *' },
        },
        {
          type: 'job.created',
          aggregateId: 'job-2',
          occurredAt: new Date(),
          payload: { name: 'Job 2', cronExpression: '*/5 * * * *' },
        },
        {
          type: 'job.created',
          aggregateId: 'job-3',
          occurredAt: new Date(),
          payload: { name: 'Job 3', cronExpression: '0 0 * * *' },
        },
      ]

      await bus.publishAll(events)

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed event types in publishAll', async () => {
      const jobCreatedHandler = vi.fn()
      const jobExecutedHandler = vi.fn()

      bus.subscribe('job.created', jobCreatedHandler)
      bus.subscribe('job.executed', jobExecutedHandler)

      const events: DomainEvent[] = [
        {
          type: 'job.created',
          aggregateId: 'job-1',
          occurredAt: new Date(),
          payload: { name: 'Job 1', cronExpression: '0 * * * *' },
        },
        {
          type: 'job.executed',
          aggregateId: 'job-1',
          occurredAt: new Date(),
          payload: { success: true, duration: 100 },
        },
      ]

      await bus.publishAll(events)

      expect(jobCreatedHandler).toHaveBeenCalledTimes(1)
      expect(jobExecutedHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('async handlers', () => {
    it('should support async handlers', async () => {
      const asyncHandler = vi.fn().mockImplementation(async (event: JobCreatedEvent) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      bus.subscribe('job.created', asyncHandler)

      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { name: 'Async Job', cronExpression: '0 * * * *' },
      }

      await bus.publish(event)

      expect(asyncHandler).toHaveBeenCalled()
    })

    it('should await all handlers in parallel', async () => {
      const handler1 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
      const handler2 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })

      bus.subscribe('job.executed', handler1)
      bus.subscribe('job.executed', handler2)

      const event: JobExecutedEvent = {
        type: 'job.executed',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { success: true, duration: 100 },
      }

      const start = Date.now()
      await bus.publish(event)
      const elapsed = Date.now() - start

      // Both handlers run in parallel, so total time should be ~20ms not ~40ms
      expect(elapsed).toBeLessThan(35)
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('event without handlers', () => {
    it('should not throw when publishing event with no handlers', async () => {
      const event: JobCreatedEvent = {
        type: 'job.created',
        aggregateId: 'job-123',
        occurredAt: new Date(),
        payload: { name: 'Orphan Job', cronExpression: '* * * * *' },
      }

      await expect(bus.publish(event)).resolves.not.toThrow()
    })
  })
})
