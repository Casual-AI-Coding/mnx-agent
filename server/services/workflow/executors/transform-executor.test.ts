import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeTransformNode, type TransformExecutorDeps } from './transform-executor.js'
import type { WorkflowNode } from '../types.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { WorkflowNodeType } from '../../../types/workflow.js'
import * as templateResolverModule from '../template-resolver.js'
import * as conditionExecutorModule from './condition-executor.js'

const mockGetValueAtPath = vi.spyOn(templateResolverModule, 'getValueAtPath')
const mockEvaluateCondition = vi.spyOn(conditionExecutorModule, 'evaluateCondition')

function createMockNode(id: string): WorkflowNode {
  return {
    id,
    type: WorkflowNodeType.Transform,
    position: { x: 0, y: 0 },
    data: {
      label: `Transform ${id}`,
      config: {},
    },
  }
}

function createTrackingMockEventBus(): IEventBus & {
  startCalls: Array<{ nodeId: string; executionLogId: string; workflowId?: string }>
  completeCalls: Array<{ nodeId: string; executionLogId: string; result: unknown; durationMs: number }>
  errorCalls: Array<{ nodeId: string; executionLogId: string; error: string }>
} {
  return {
    startCalls: [],
    completeCalls: [],
    errorCalls: [],
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
    emitWorkflowNodeStart: vi.fn().mockImplementation((nodeId, executionLogId, workflowId) => {
      ;(eventBus as any).startCalls.push({ nodeId, executionLogId, workflowId })
    }),
    emitWorkflowNodeComplete: vi.fn().mockImplementation((nodeId, executionLogId, result, durationMs) => {
      ;(eventBus as any).completeCalls.push({ nodeId, executionLogId, result, durationMs })
    }),
    emitWorkflowNodeError: vi.fn().mockImplementation((nodeId, executionLogId, error) => {
      ;(eventBus as any).errorCalls.push({ nodeId, executionLogId, error })
    }),
  }
}

let eventBus: ReturnType<typeof createTrackingMockEventBus>

describe('executeTransformNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    eventBus = createTrackingMockEventBus()
    mockGetValueAtPath.mockReturnValue('')
    mockEvaluateCondition.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('passthrough transform', () => {
    it('should return input data unchanged with default transformType', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { data: 'test-value' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { inputNode: 'source-1' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ data: 'test-value' })
      expect(eventBus.startCalls).toHaveLength(1)
      expect(eventBus.completeCalls).toHaveLength(1)
    })

    it('should return undefined when no inputNode specified', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const result = await executeTransformNode(node, { transformType: 'passthrough' }, nodeOutputs, deps)

      expect(result).toBeUndefined()
    })
  })

  describe('extract transform', () => {
    it('should extract simple key from input data', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { name: 'John', age: 30 })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1', outputFormat: 'name' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toBe('John')
    })

    it('should extract using dot notation path (calls getValueAtPath)', async () => {
      mockGetValueAtPath.mockReturnValue('Doe')

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { user: { lastName: 'Doe' } })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1', outputFormat: 'user.lastName' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(mockGetValueAtPath).toHaveBeenCalledWith({ user: { lastName: 'Doe' } }, 'user.lastName')
      expect(result).toBe('Doe')
    })

    it('should return original data when key not found', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { name: 'John' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1', outputFormat: 'nonexistent' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ name: 'John' })
    })

    it('should return original data when outputFormat is not provided', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { name: 'John' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ name: 'John' })
    })

    it('should return original data when data is not an object', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', 'string-value')

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1', outputFormat: 'name' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toBe('string-value')
    })
  })

  describe('map transform', () => {
    it('should transform array items using mapFunction', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', ['a', 'b', 'c'])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'map', inputNode: 'source-1', mapFunction: 'processed-$item-at-$index' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as string[]

      expect(result).toHaveLength(3)
      expect(result[0]).toBe('processed-"a"-at-0')
      expect(result[1]).toBe('processed-"b"-at-1')
      expect(result[2]).toBe('processed-"c"-at-2')
    })

    it('should sanitize special characters in mapFunction', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', ['value'])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'map', inputNode: 'source-1', mapFunction: '<script>$item</script>' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as string[]

      expect(result[0]).toBe('&lt;script&gt;"value"&lt;&#x2F;script&gt;')
    })

    it('should return input data unchanged when no mapFunction provided', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', ['a', 'b'])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'map', inputNode: 'source-1' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual(['a', 'b'])
    })

    it('should return input data unchanged when input is not an array', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { key: 'value' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'map', inputNode: 'source-1', mapFunction: 'processed-$item' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ key: 'value' })
    })
  })

  describe('filter transform', () => {
    it('should filter array items using condition', async () => {
      mockEvaluateCondition.mockImplementation((condition: string) => {
        return condition.includes('"active"')
      })

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', [
        { status: 'active', name: 'John' },
        { status: 'inactive', name: 'Jane' },
        { status: 'active', name: 'Bob' },
      ])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'filter', inputNode: 'source-1', filterCondition: '$item.status == active' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as Array<{ status: string; name: string }>

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('John')
      expect(result[1].name).toBe('Bob')
      expect(mockEvaluateCondition).toHaveBeenCalledTimes(3)
    })

    it('should sanitize special characters in filterCondition', async () => {
      mockEvaluateCondition.mockReturnValue(true)

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', [{ val: 1 }])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'filter', inputNode: 'source-1', filterCondition: '<script>$item</script>' }
      await executeTransformNode(node, config, nodeOutputs, deps)

      expect(mockEvaluateCondition).toHaveBeenCalledWith('&lt;script&gt;{"val":1}&lt;/script&gt;')
    })

    it('should return input data unchanged when no filterCondition provided', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', ['a', 'b'])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'filter', inputNode: 'source-1' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual(['a', 'b'])
    })

    it('should return input data unchanged when input is not an array', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { key: 'value' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'filter', inputNode: 'source-1', filterCondition: '$item > 5' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ key: 'value' })
    })
  })

  describe('format transform', () => {
    it('should format output using JSON template', async () => {
      mockGetValueAtPath.mockImplementation((data: unknown, path: string) => {
        const obj = data as Record<string, unknown>
        if (path === 'name') return 'John'
        if (path === 'age') return '30'
        return ''
      })

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { name: 'John', age: 30 })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '{"fullName": "name", "userAge": "age"}' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as Record<string, unknown>

      expect(result.fullName).toBe('John')
      expect(result.userAge).toBe('30')
    })

    it('should format output using array template', async () => {
      mockGetValueAtPath.mockImplementation((data: unknown, path: string) => {
        const obj = data as Record<string, unknown>
        if (path === 'a') return '1'
        if (path === 'b') return '2'
        return ''
      })

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { a: 1, b: 2 })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '["a", "b"]' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as string[]

      expect(result).toEqual(['1', '2'])
    })

    it('should format output using path (calls getValueAtPath)', async () => {
      mockGetValueAtPath.mockReturnValue('extracted-value')

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { nested: { value: 'extracted-value' } })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: 'nested.value' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(mockGetValueAtPath).toHaveBeenCalledWith({ nested: { value: 'extracted-value' } }, 'nested.value')
      expect(result).toBe('extracted-value')
    })

    it('should return input data when outputFormat not provided', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { name: 'John' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ name: 'John' })
    })

    it('should return input data when input is not an object', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', 'string-value')

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '{"key": "value"}' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toBe('string-value')
    })

    it('should return input data when JSON parse fails and fallback to path extraction', async () => {
      mockGetValueAtPath.mockReturnValue('')
      
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { name: 'John' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: 'invalid json{}' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toBe('')
    })

    it('should handle nested template objects', async () => {
      mockGetValueAtPath.mockImplementation((data: unknown, path: string) => {
        const obj = data as Record<string, unknown>
        if (path.startsWith('user.')) {
          const user = obj.user as Record<string, unknown>
          return String(user[path.slice(5)])
        }
        return ''
      })

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { user: { first: 'John', last: 'Doe' } })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '{"profile": {"firstName": "user.first", "lastName": "user.last"}}' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as Record<string, Record<string, unknown>>

      expect(result.profile.firstName).toBe('John')
      expect(result.profile.lastName).toBe('Doe')
    })
  })

  describe('unknown transform type', () => {
    it('should throw error for unknown transform type', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', 'data')

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'unknownType', inputNode: 'source-1' }
      await expect(executeTransformNode(node, config, nodeOutputs, deps)).rejects.toThrow('Unknown transform type: unknownType')

      expect(eventBus.errorCalls).toHaveLength(1)
      expect(eventBus.errorCalls[0].error).toBe('Unknown transform type: unknownType')
    })
  })

  describe('inputNode and inputPath', () => {
    it('should get data from inputNode via nodeOutputs', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { value: 'test' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'passthrough', inputNode: 'source-1' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual({ value: 'test' })
    })

    it('should apply inputPath to data from inputNode', async () => {
      mockGetValueAtPath.mockReturnValue('nested-value')

      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { nested: { key: 'nested-value' } })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'passthrough', inputNode: 'source-1', inputPath: 'nested.key' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(mockGetValueAtPath).toHaveBeenCalledWith({ nested: { key: 'nested-value' } }, 'nested.key')
      expect(result).toBe('nested-value')
    })

    it('should not apply inputPath when inputData is undefined', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'passthrough', inputNode: 'missing-node', inputPath: 'some.path' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(mockGetValueAtPath).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('event bus emission', () => {
    it('should emit start and complete events when executionLogId provided', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      await executeTransformNode(node, { transformType: 'passthrough' }, nodeOutputs, deps)

      expect(eventBus.startCalls).toHaveLength(1)
      expect(eventBus.startCalls[0]).toEqual({
        nodeId: 'transform-1',
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
      })
      expect(eventBus.completeCalls).toHaveLength(1)
      expect(eventBus.errorCalls).toHaveLength(0)
    })

    it('should not emit events when executionLogId is null', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()

      const deps: TransformExecutorDeps = {
        executionLogId: null,
        workflowId: null,
        eventBus,
      }

      await executeTransformNode(node, { transformType: 'passthrough' }, nodeOutputs, deps)

      expect(eventBus.startCalls).toHaveLength(0)
      expect(eventBus.completeCalls).toHaveLength(0)
      expect(eventBus.errorCalls).toHaveLength(0)
    })

    it('should emit error event when exception occurs', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      await expect(executeTransformNode(node, { transformType: 'unknownType' }, nodeOutputs, deps)).rejects.toThrow()

      expect(eventBus.errorCalls).toHaveLength(1)
      expect(eventBus.errorCalls[0].nodeId).toBe('transform-1')
      expect(eventBus.errorCalls[0].executionLogId).toBe('log-123')
    })
  })

  describe('applyFormatTemplate helper (via format transform)', () => {
    it('should handle primitive template values - strings are treated as paths', async () => {
      mockGetValueAtPath.mockReturnValue('')
      
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { any: 'data' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '["static-string", 123, true]' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as unknown[]

      expect(result).toEqual(['', 123, true])
    })

    it('should handle null values in template', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', { any: 'data' })

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '{"value": null}' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps) as Record<string, unknown>

      expect(result.value).toBeNull()
    })
  })

  describe('extractData helper (via extract transform)', () => {
    it('should handle null input data', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', null)

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1', outputFormat: 'key' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toBeNull()
    })

    it('should handle array input data', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', ['a', 'b', 'c'])

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'extract', inputNode: 'source-1', outputFormat: 'nonexistent' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toEqual(['a', 'b', 'c'])
    })
  })

  describe('formatOutput helper (via format transform)', () => {
    it('should handle null input data', async () => {
      const node = createMockNode('transform-1')
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('source-1', null)

      const deps: TransformExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        eventBus,
      }

      const config = { transformType: 'format', inputNode: 'source-1', outputFormat: '{"key": "value"}' }
      const result = await executeTransformNode(node, config, nodeOutputs, deps)

      expect(result).toBeNull()
    })
  })
})