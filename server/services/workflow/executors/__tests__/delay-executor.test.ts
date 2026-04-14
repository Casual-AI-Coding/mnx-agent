import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeDelayNode, DelayExecutorDeps } from '../delay-executor.js'
import type { WorkflowNode } from '../../types.js'
import { WorkflowNodeType } from '../../types.js'
import type { IEventBus } from '../../../interfaces/event-bus.interface.js'

describe('executeDelayNode', () => {
  let mockEventBus: IEventBus
  let deps: DelayExecutorDeps

  const createMockNode = (id: string): WorkflowNode => ({
    id,
    type: WorkflowNodeType.Delay,
    position: { x: 100, y: 100 },
    data: {
      label: 'Delay Node',
      config: {},
    },
  })

  beforeEach(() => {
    vi.useFakeTimers()
    mockEventBus = {
      emitJobCreated: vi.fn(),
      emitJobUpdated: vi.fn(),
      emitJobDeleted: vi.fn(),
      emitJobToggled: vi.fn(),
      emitJobExecuted: vi.fn(),
      emitTaskCreated: vi.fn(),
      emitTaskUpdated: vi.fn(),
      emitTaskCompleted: vi.fn(),
      emitTaskFailed: vi.fn(),
      emitTaskMovedToDLQ: vi.fn(),
      emitLogCreated: vi.fn(),
      emitLogUpdated: vi.fn(),
      emitWorkflowTestStarted: vi.fn(),
      emitWorkflowTestCompleted: vi.fn(),
      emitWorkflowNodeOutput: vi.fn(),
      emitWorkflowNodeStart: vi.fn(),
      emitWorkflowNodeComplete: vi.fn(),
      emitWorkflowNodeError: vi.fn(),
    }
    deps = {
      executionLogId: 'log-123',
      workflowId: 'workflow-456',
      eventBus: mockEventBus,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('duration config', () => {
    it('should delay for specified duration in milliseconds', async () => {
      const node = createMockNode('delay-1')
      const config = { duration: 1000 }
      const now = Date.now()
      vi.setSystemTime(now)

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(500)
      expect(mockEventBus.emitWorkflowNodeStart).toHaveBeenCalledWith(
        'delay-1',
        'log-123',
        'workflow-456'
      )
      expect(mockEventBus.emitWorkflowNodeComplete).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(500)
      const result = await promise

      expect(result.delayed).toBe(1000)
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalledWith(
        'delay-1',
        'log-123',
        { delayed: 1000 },
        expect.any(Number)
      )
    })

    it('should handle zero duration (no delay)', async () => {
      const node = createMockNode('delay-2')
      const config = { duration: 0 }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
      expect(mockEventBus.emitWorkflowNodeStart).toHaveBeenCalled()
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })

    it('should treat negative duration as zero delay', async () => {
      const node = createMockNode('delay-3')
      const config = { duration: -500 }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })
  })

  describe('until config', () => {
    it('should delay until specified future timestamp', async () => {
      const node = createMockNode('delay-4')
      const now = Date.now()
      vi.setSystemTime(now)
      const futureTime = new Date(now + 5000).toISOString()
      const config = { until: futureTime }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(2500)
      expect(mockEventBus.emitWorkflowNodeComplete).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(2500)
      const result = await promise

      expect(result.delayed).toBe(5000)
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })

    it('should treat past timestamp as zero delay', async () => {
      const node = createMockNode('delay-5')
      const now = Date.now()
      vi.setSystemTime(now)
      const pastTime = new Date(now - 10000).toISOString()
      const config = { until: pastTime }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })

    it('should handle timestamp exactly at current time', async () => {
      const node = createMockNode('delay-6')
      const now = Date.now()
      vi.setSystemTime(now)
      const currentTime = new Date(now).toISOString()
      const config = { until: currentTime }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
    })

    it('should return NaN for invalid date string', async () => {
      const node = createMockNode('delay-invalid')
      const config = { until: 'invalid-date-string' }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBeNaN()
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })
  })

  describe('no config', () => {
    it('should return zero delay when neither duration nor until is specified', async () => {
      const node = createMockNode('delay-7')
      const config = {}

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
      expect(mockEventBus.emitWorkflowNodeStart).toHaveBeenCalled()
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })

    it('should return zero delay when config is empty', async () => {
      const node = createMockNode('delay-8')
      const config = {}

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
    })
  })

  describe('eventBus emit calls', () => {
    it('should emit WorkflowNodeStart at the beginning', async () => {
      const node = createMockNode('delay-start')
      const config = { duration: 100 }

      const promise = executeDelayNode(node, config, deps)

      expect(mockEventBus.emitWorkflowNodeStart).toHaveBeenCalledWith(
        'delay-start',
        'log-123',
        'workflow-456'
      )

      await vi.advanceTimersByTimeAsync(100)
      await promise
    })

    it('should emit WorkflowNodeComplete with result and duration', async () => {
      const node = createMockNode('delay-complete')
      const config = { duration: 500 }
      const startTime = Date.now()
      vi.setSystemTime(startTime)

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(500)
      await promise

      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalledWith(
        'delay-complete',
        'log-123',
        { delayed: 500 },
        expect.any(Number)
      )

      const callArgs = vi.mocked(mockEventBus.emitWorkflowNodeComplete).mock.calls[0]
      expect(callArgs[3]).toBeGreaterThanOrEqual(0)
    })

    it('should not emit events when executionLogId is null', async () => {
      deps.executionLogId = null
      const node = createMockNode('delay-no-log')
      const config = { duration: 100 }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(100)
      const result = await promise

      expect(result.delayed).toBe(100)
      expect(mockEventBus.emitWorkflowNodeStart).not.toHaveBeenCalled()
      expect(mockEventBus.emitWorkflowNodeComplete).not.toHaveBeenCalled()
    })

    it('should handle workflowId being null', async () => {
      deps.workflowId = null
      const node = createMockNode('delay-no-workflow')
      const config = { duration: 100 }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(100)
      await promise

      expect(mockEventBus.emitWorkflowNodeStart).toHaveBeenCalledWith(
        'delay-no-workflow',
        'log-123',
        undefined
      )
    })
  })

  describe('NaN handling', () => {
    it('should return NaN for non-numeric duration', async () => {
      const node = createMockNode('delay-nan-duration')
      const config = { duration: 'not-a-number' as unknown as number }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBeNaN()
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })

    it('should return NaN for invalid until date', async () => {
      const node = createMockNode('delay-nan-until')
      const config = { until: 'invalid-date-string' }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBeNaN()
      expect(mockEventBus.emitWorkflowNodeComplete).toHaveBeenCalled()
    })

    it('should handle NaN delayMs without throwing', async () => {
      const node = createMockNode('delay-nan-handling')
      const config = { duration: NaN }

      const result = await executeDelayNode(node, config, deps)

      expect(result).toBeDefined()
      expect(result.delayed).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('should handle very large duration values', async () => {
      const node = createMockNode('delay-large')
      const config = { duration: 86400000 }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(86400000)
      const result = await promise

      expect(result.delayed).toBe(86400000)
    })

    it('should handle fractional duration', async () => {
      const node = createMockNode('delay-fraction')
      const config = { duration: 1500.5 }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(1501)
      const result = await promise

      expect(result.delayed).toBe(1500.5)
    })

    it('should prioritize duration over until when both are specified', async () => {
      const node = createMockNode('delay-priority')
      const now = Date.now()
      vi.setSystemTime(now)
      const config = {
        duration: 1000,
        until: new Date(now + 10000).toISOString(),
      }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result.delayed).toBe(1000)
    })

    it('should use Math.max(0, duration) to ensure non-negative delay', async () => {
      const node = createMockNode('delay-negative')
      const config = { duration: -100000 }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
    })

    it('should use Math.max(0, calculatedTime) for until config', async () => {
      const node = createMockNode('delay-past')
      const now = Date.now()
      vi.setSystemTime(now)
      const config = { until: new Date(now - 5000).toISOString() }

      const result = await executeDelayNode(node, config, deps)

      expect(result.delayed).toBe(0)
    })
  })

  describe('return value', () => {
    it('should return object with delayed property', async () => {
      const node = createMockNode('delay-return')
      const config = { duration: 100 }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(100)
      const result = await promise

      expect(result).toHaveProperty('delayed')
      expect(typeof result.delayed).toBe('number')
    })

    it('should return exact duration specified', async () => {
      const node = createMockNode('delay-exact')
      const config = { duration: 1234 }

      const promise = executeDelayNode(node, config, deps)

      await vi.advanceTimersByTimeAsync(1234)
      const result = await promise

      expect(result.delayed).toBe(1234)
    })
  })
})