import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowEngine } from '../workflow-engine.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'

describe('WorkflowEngine - Loop Execution', () => {
  let engine: WorkflowEngine
  let mockDb: Partial<DatabaseService>
  let mockRegistry: Partial<ServiceNodeRegistry>

  beforeEach(() => {
    mockDb = {
      createExecutionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
      updateExecutionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
      createExecutionLogDetail: vi.fn().mockResolvedValue('detail-1'),
      updateExecutionLogDetail: vi.fn().mockResolvedValue(undefined),
    }

    mockRegistry = {
      call: vi.fn().mockImplementation(async (service: string, method: string, args: unknown[]) => {
        return { success: true, data: 'mock-result' }
      }),
    }

    engine = new WorkflowEngine(mockDb as DatabaseService, mockRegistry as ServiceNodeRegistry, createMockEventBus())
  })

  describe('loop body execution via edges', () => {
    it('should find and execute body nodes connected via sourceHandle=body', async () => {
      let bodyCallCount = 0
      
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'bodyAction') {
          bodyCallCount++
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'start' } } },
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { maxIterations: 3 } } },
          { id: 'body-node', type: 'action', data: { label: 'Body Action', config: { service: 'test', method: 'bodyAction' } } },
          { id: 'after-loop', type: 'action', data: { label: 'After Loop', config: { service: 'test', method: 'afterLoop' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop' },
          { id: 'e2', source: 'loop', target: 'body-node', sourceHandle: 'body' },
          { id: 'e3', source: 'loop', target: 'after-loop' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(bodyCallCount).toBe(3)
    })

    it('should set item and index context variables during array iteration', async () => {
      const capturedItems: unknown[] = []
      const capturedIndices: number[] = []
      
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string, args: unknown[]) => {
        if (method === 'bodyAction' && args && args.length > 0) {
          const config = args[0] as { item?: unknown; index?: number }
          capturedItems.push(config.item)
          capturedIndices.push(config.index)
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { 
            items: '["apple", "banana", "cherry"]'
          } } },
          { id: 'body-node', type: 'action', data: { label: 'Body Action', config: { 
            service: 'test', 
            method: 'bodyAction',
            args: [{ item: '{{item}}', index: '{{index}}' }]
          } } },
        ],
        edges: [
          { id: 'e1', source: 'loop', target: 'body-node', sourceHandle: 'body' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(capturedItems).toEqual(['apple', 'banana', 'cherry'])
      expect(capturedIndices).toEqual(['0', '1', '2'])
    })
  })

  describe('array iteration', () => {
    it('should iterate over array from previous node output', async () => {
      const processedItems: string[] = []
      
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'getItems') {
          return ['item1', 'item2', 'item3']
        }
        if (method === 'processItem') {
          return { success: true }
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'get-items', type: 'action', data: { label: 'Get Items', config: { service: 'test', method: 'getItems' } } },
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { 
            items: '{{get-items.output}}'
          } } },
          { id: 'process', type: 'action', data: { label: 'Process', config: { 
            service: 'test', 
            method: 'processItem'
          } } },
        ],
        edges: [
          { id: 'e1', source: 'get-items', target: 'loop' },
          { id: 'e2', source: 'loop', target: 'process', sourceHandle: 'body' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
    })

    it('should limit iterations to array length', async () => {
      let callCount = 0
      
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'bodyAction') {
          callCount++
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { 
            items: '[1, 2]',
            maxIterations: 10
          } } },
          { id: 'body-node', type: 'action', data: { label: 'Body', config: { service: 'test', method: 'bodyAction' } } },
        ],
        edges: [
          { id: 'e1', source: 'loop', target: 'body-node', sourceHandle: 'body' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(callCount).toBe(2)
    })
  })

  describe('condition-based loops', () => {
    it('should continue loop while condition is true', async () => {
      let iteration = 0
      
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'bodyAction') {
          iteration++
        }
        return { iteration }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { 
            maxIterations: 10,
            condition: '{{index}} < 3'
          } } },
          { id: 'body-node', type: 'action', data: { label: 'Body', config: { service: 'test', method: 'bodyAction' } } },
        ],
        edges: [
          { id: 'e1', source: 'loop', target: 'body-node', sourceHandle: 'body' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(iteration).toBe(3)
    })
  })

  describe('loop results', () => {
    it('should collect results from all iterations', async () => {
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'bodyAction') {
          return { processed: true }
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { 
            items: '[1, 2, 3]'
          } } },
          { id: 'body-node', type: 'action', data: { label: 'Body', config: { service: 'test', method: 'bodyAction' } } },
        ],
        edges: [
          { id: 'e1', source: 'loop', target: 'body-node', sourceHandle: 'body' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      const loopResult = result.nodeResults.get('loop')
      expect(loopResult?.success).toBe(true)
      expect(loopResult?.data).toMatchObject({
        iterations: 3,
        results: expect.arrayContaining([
          expect.objectContaining({ processed: true })
        ])
      })
    })
  })

  describe('multiple body nodes', () => {
    it('should execute multiple body nodes in order for each iteration', async () => {
      const executionOrder: string[] = []
      
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        executionOrder.push(method)
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'loop', type: 'loop', data: { label: 'Loop', config: { 
            items: '[1, 2]'
          } } },
          { id: 'body-1', type: 'action', data: { label: 'Body 1', config: { service: 'test', method: 'firstAction' } } },
          { id: 'body-2', type: 'action', data: { label: 'Body 2', config: { service: 'test', method: 'secondAction' } } },
        ],
        edges: [
          { id: 'e1', source: 'loop', target: 'body-1', sourceHandle: 'body' },
          { id: 'e2', source: 'loop', target: 'body-2', sourceHandle: 'body' },
          { id: 'e3', source: 'body-1', target: 'body-2' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(executionOrder).toEqual([
        'firstAction', 'secondAction',
        'firstAction', 'secondAction'
      ])
    })
  })
})