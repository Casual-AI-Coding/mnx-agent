import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowEngine, WorkflowNode, WorkflowEdge } from '../workflow-engine.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'

describe('WorkflowEngine - Condition Branching', () => {
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
        // Default mock returns success
        return { success: true, data: 'mock-result' }
      }),
    }

    engine = new WorkflowEngine(mockDb as DatabaseService, mockRegistry as ServiceNodeRegistry)
  })

  describe('true branch execution', () => {
it('should execute nodes on true branch when condition evaluates to true', async () => {
      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'start' } } },
          { id: 'condition', type: 'condition', data: { label: 'Check', config: { condition: 'true' } } },
          { id: 'true-branch', type: 'action', data: { label: 'True Path', config: { service: 'test', method: 'trueMethod' } } },
          { id: 'false-branch', type: 'action', data: { label: 'False Path', config: { service: 'test', method: 'falseMethod' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'false-branch', sourceHandle: 'false' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      if (!result.success) {
        console.log('Workflow error:', result.error)
        console.log('Node results:', Array.from(result.nodeResults.keys()))
      }

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('true-branch')).toBe(true)
      expect(result.nodeResults.has('false-branch')).toBe(false)
      
      // Verify true branch was called
      expect(mockRegistry.call).toHaveBeenCalledWith('test', 'trueMethod', [])
      // Verify false branch was NOT called
      expect(mockRegistry.call).not.toHaveBeenCalledWith('test', 'falseMethod', [])
    })

    it('should evaluate condition using resolved template values', async () => {
      // Workflow: start -> condition (using start output) -> true/false branches
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'getValue') {
          return 'yes'  // truthy value
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'getValue' } } },
          { id: 'condition', type: 'condition', data: { label: 'Check', config: { condition: '{{start.output}} == yes' } } },
          { id: 'true-branch', type: 'action', data: { label: 'True Path', config: { service: 'test', method: 'trueMethod' } } },
          { id: 'false-branch', type: 'action', data: { label: 'False Path', config: { service: 'test', method: 'falseMethod' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'false-branch', sourceHandle: 'false' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('true-branch')).toBe(true)
      expect(result.nodeResults.has('false-branch')).toBe(false)
    })
  })

  describe('false branch execution', () => {
    it('should execute nodes on false branch when condition evaluates to false', async () => {
      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'start' } } },
          { id: 'condition', type: 'condition', data: { label: 'Check', config: { condition: 'false' } } },
          { id: 'true-branch', type: 'action', data: { label: 'True Path', config: { service: 'test', method: 'trueMethod' } } },
          { id: 'false-branch', type: 'action', data: { label: 'False Path', config: { service: 'test', method: 'falseMethod' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'false-branch', sourceHandle: 'false' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('true-branch')).toBe(false)
      expect(result.nodeResults.has('false-branch')).toBe(true)
      
      expect(mockRegistry.call).toHaveBeenCalledWith('test', 'falseMethod', [])
      expect(mockRegistry.call).not.toHaveBeenCalledWith('test', 'trueMethod', [])
    })

    it('should skip entire branch when condition excludes it', async () => {
      // Workflow with nested nodes on false branch
      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'start' } } },
          { id: 'condition', type: 'condition', data: { label: 'Check', config: { condition: 'true' } } },
          { id: 'true-branch', type: 'action', data: { label: 'True Path', config: { service: 'test', method: 'trueMethod' } } },
          { id: 'false-branch', type: 'action', data: { label: 'False Path', config: { service: 'test', method: 'falseMethod' } } },
          { id: 'false-branch-child', type: 'action', data: { label: 'False Child', config: { service: 'test', method: 'falseChildMethod' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'false-branch', sourceHandle: 'false' },
          { id: 'e4', source: 'false-branch', target: 'false-branch-child' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('true-branch')).toBe(true)
      expect(result.nodeResults.has('false-branch')).toBe(false)
      expect(result.nodeResults.has('false-branch-child')).toBe(false)
      
      // Both false branch and its child should NOT be called
      expect(mockRegistry.call).not.toHaveBeenCalledWith('test', 'falseMethod', [])
      expect(mockRegistry.call).not.toHaveBeenCalledWith('test', 'falseChildMethod', [])
    })
  })

  describe('complex condition evaluation', () => {
    it('should correctly evaluate numeric comparisons', async () => {
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'getNumber') {
          return 10
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'getNumber' } } },
          { id: 'condition', type: 'condition', data: { label: 'Check', config: { condition: '{{start.output}} > 5' } } },
          { id: 'true-branch', type: 'action', data: { label: 'True Path', config: { service: 'test', method: 'trueMethod' } } },
          { id: 'false-branch', type: 'action', data: { label: 'False Path', config: { service: 'test', method: 'falseMethod' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'false-branch', sourceHandle: 'false' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('true-branch')).toBe(true)
      expect(result.nodeResults.has('false-branch')).toBe(false)
    })

    it('should correctly evaluate string contains', async () => {
      mockRegistry.call = vi.fn().mockImplementation(async (service: string, method: string) => {
        if (method === 'getText') {
          return 'hello world'
        }
        return { success: true }
      })

      const workflow = JSON.stringify({
        nodes: [
          { id: 'start', type: 'action', data: { label: 'Start', config: { service: 'test', method: 'getText' } } },
          { id: 'condition', type: 'condition', data: { label: 'Check', config: { condition: '{{start.output}} contains world' } } },
          { id: 'true-branch', type: 'action', data: { label: 'True Path', config: { service: 'test', method: 'trueMethod' } } },
          { id: 'false-branch', type: 'action', data: { label: 'False Path', config: { service: 'test', method: 'falseMethod' } } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'false-branch', sourceHandle: 'false' },
        ],
      })

      const result = await engine.executeWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('true-branch')).toBe(true)
      expect(result.nodeResults.has('false-branch')).toBe(false)
    })
  })
})