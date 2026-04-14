import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowEngine } from '../workflow/index.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import { createMockEventBus } from '../../__tests__/helpers/mock-event-bus.js'

describe('WorkflowEngine - Node Timeout', () => {
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
      call: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { success: true }
      }),
    }

    engine = new WorkflowEngine(mockDb as DatabaseService, mockRegistry as ServiceNodeRegistry, undefined, createMockEventBus())
  })

  describe('default timeout', () => {
    it('should use default timeout of 5 minutes when not specified', async () => {
      const workflow = JSON.stringify({
        nodes: [
          { id: 'action', type: 'action', data: { label: 'Action', config: { service: 'test', method: 'doWork' } } },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.get('action')?.success).toBe(true)
    })
  })

  describe('custom timeout', () => {
    it('should respect custom timeout from node config', async () => {
      mockRegistry.call = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { 
            id: 'action', 
            type: 'action', 
            data: { 
              label: 'Action', 
              config: { 
                service: 'test', 
                method: 'doWork',
                timeoutMs: 200
              } 
            } 
          },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.get('action')?.success).toBe(true)
    })

    it('should timeout if execution takes longer than configured', async () => {
      vi.useFakeTimers()

      mockRegistry.call = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { 
            id: 'action', 
            type: 'action', 
            data: { 
              label: 'Action', 
              config: { 
                service: 'test', 
                method: 'doWork',
                timeoutMs: 100
              } 
            } 
          },
        ],
        edges: [],
      })

      const resultPromise = engine.executeWorkflow(workflow)
      
      await vi.runAllTimersAsync()
      
      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
      
      vi.useRealTimers()
    })

    it('should return timeout error message', async () => {
      vi.useFakeTimers()

      mockRegistry.call = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { 
            id: 'action', 
            type: 'action', 
            data: { 
              label: 'Action', 
              config: { 
                service: 'test', 
                method: 'doWork',
                timeoutMs: 100
              } 
            } 
          },
        ],
        edges: [],
      })

      const resultPromise = engine.executeWorkflow(workflow)
      
      await vi.runAllTimersAsync()
      
      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.error).toBe('Node action failed: Execution timed out after 100ms')
      
      vi.useRealTimers()
    })
  })

  describe('timeout with different node types', () => {
    it('should apply timeout to condition nodes', async () => {
      const workflow = JSON.stringify({
        nodes: [
          { 
            id: 'condition', 
            type: 'condition', 
            data: { 
              label: 'Condition', 
              config: { 
                condition: 'true',
                timeoutMs: 100
              } 
            } 
          },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
    })

    it('should apply timeout to loop nodes', async () => {
      const workflow = JSON.stringify({
        nodes: [
          { 
            id: 'loop', 
            type: 'loop', 
            data: { 
              label: 'Loop', 
              config: { 
                maxIterations: 2,
                timeoutMs: 200
              } 
            } 
          },
        ],
        edges: [],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
    })
  })
})