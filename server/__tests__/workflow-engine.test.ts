import { 
  WorkflowEngine, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowGraph,
  TaskResult
} from '../services/workflow-engine'
import type { ServiceNodeRegistry } from '../services/service-node-registry'
import type { DatabaseService } from '../database/service-async'
import { describe, it, expect, beforeEach, vi } from 'vitest'

class TestableWorkflowEngine extends WorkflowEngine {
  testBuildExecutionOrder(workflow: WorkflowGraph): string[] {
    return (this as unknown as { buildExecutionOrder(w: WorkflowGraph): string[] })
      .buildExecutionOrder(workflow)
  }

  testResolveTemplateString(template: string, nodeOutputs: Map<string, unknown>): string {
    return (this as unknown as { resolveTemplateString(t: string, n: Map<string, unknown>): string })
      .resolveTemplateString(template, nodeOutputs)
  }

  testEvaluateCondition(condition: string): boolean {
    return (this as unknown as { evaluateCondition(c: string): boolean })
      .evaluateCondition(condition)
  }

  testResolveNodeConfig(
    config: Record<string, unknown>, 
    nodeOutputs: Map<string, unknown>
  ): Record<string, unknown> {
    return (this as unknown as { 
      resolveNodeConfig(c: Record<string, unknown>, n: Map<string, unknown>): Record<string, unknown> 
    }).resolveNodeConfig(config, nodeOutputs)
  }

  testValidateWorkflow(workflow: WorkflowGraph): void {
    return (this as unknown as { validateWorkflow(w: WorkflowGraph): void })
      .validateWorkflow(workflow)
  }

  testParseWorkflowJson(workflowJson: string): WorkflowGraph {
    return (this as unknown as { parseWorkflowJson(j: string): WorkflowGraph })
      .parseWorkflowJson(workflowJson)
  }
}

function createMockServiceRegistry(): ServiceNodeRegistry {
  const mockRegistry = {
    call: vi.fn().mockResolvedValue({ result: 'mock-result' }),
    get: vi.fn(),
    register: vi.fn(),
    getAllServices: vi.fn().mockReturnValue([]),
    getServiceMethods: vi.fn().mockReturnValue([]),
    getAvailableNodes: vi.fn().mockResolvedValue([]),
  }
  return mockRegistry as unknown as ServiceNodeRegistry
}

function createMockDb(): DatabaseService {
  return {
    createExecutionLogDetail: vi.fn().mockResolvedValue('detail-id'),
    updateExecutionLogDetail: vi.fn().mockResolvedValue(undefined),
  } as unknown as DatabaseService
}

describe('WorkflowEngine', () => {
  let engine: TestableWorkflowEngine
  let mockServiceRegistry: ServiceNodeRegistry
  let mockDb: DatabaseService

  beforeEach(() => {
    mockServiceRegistry = createMockServiceRegistry()
    mockDb = createMockDb()
    engine = new TestableWorkflowEngine(mockDb, mockServiceRegistry)
  })

  describe('Topological Sort', () => {
    it('should sort nodes in correct dependency order', () => {
      const nodes: WorkflowNode[] = [
        { id: 'c', type: 'action', data: { label: 'c', config: {} } },
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
        { id: 'b', type: 'action', data: { label: 'b', config: {} } },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'c' },
        { id: 'e2', source: 'b', target: 'c' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      const cIndex = sorted.findIndex(id => id === 'c')
      const aIndex = sorted.findIndex(id => id === 'a')
      const bIndex = sorted.findIndex(id => id === 'b')
      
      expect(aIndex).toBeLessThan(cIndex)
      expect(bIndex).toBeLessThan(cIndex)
      expect(sorted.length).toBe(3)
    })

    it('should handle linear chain of dependencies', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
        { id: 'b', type: 'action', data: { label: 'b', config: {} } },
        { id: 'c', type: 'action', data: { label: 'c', config: {} } },
        { id: 'd', type: 'action', data: { label: 'd', config: {} } },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'd' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      expect(sorted).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should handle diamond dependency pattern', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
        { id: 'b', type: 'action', data: { label: 'b', config: {} } },
        { id: 'c', type: 'action', data: { label: 'c', config: {} } },
        { id: 'd', type: 'action', data: { label: 'd', config: {} } },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'c' },
        { id: 'e3', source: 'b', target: 'd' },
        { id: 'e4', source: 'c', target: 'd' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      expect(sorted[0]).toBe('a')
      expect(sorted[sorted.length - 1]).toBe('d')
      expect(sorted.indexOf('b')).toBeGreaterThan(sorted.indexOf('a'))
      expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('d'))
      expect(sorted.indexOf('c')).toBeGreaterThan(sorted.indexOf('a'))
      expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('d'))
    })

    it('should detect cycles and throw error', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
        { id: 'b', type: 'action', data: { label: 'b', config: {} } },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testBuildExecutionOrder(workflow)).toThrow(/cycle/i)
    })

    it('should detect self-cycle', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'a' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testBuildExecutionOrder(workflow)).toThrow(/cycle/i)
    })

    it('should handle disconnected nodes (no edges)', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
        { id: 'b', type: 'action', data: { label: 'b', config: {} } },
        { id: 'c', type: 'action', data: { label: 'c', config: {} } },
      ]
      const edges: WorkflowEdge[] = []
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      expect(sorted.length).toBe(3)
      expect(sorted).toContain('a')
      expect(sorted).toContain('b')
      expect(sorted).toContain('c')
    })
  })

  describe('Workflow Validation', () => {
    it('should validate workflow with duplicate node IDs', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
      ]
      const edges: WorkflowEdge[] = []
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testValidateWorkflow(workflow)).toThrow(/duplicate/i)
    })

    it('should validate workflow with empty nodes', () => {
      const workflow: WorkflowGraph = { nodes: [], edges: [] }
      
      expect(() => engine.testValidateWorkflow(workflow)).toThrow(/at least one node/i)
    })

    it('should validate edge referencing non-existent source', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', data: { label: 'a', config: {} } },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'nonexistent', target: 'a' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testValidateWorkflow(workflow)).toThrow(/non-existent source/i)
    })
  })

  describe('Workflow JSON Parsing', () => {
    it('should parse workflow with nodes and edges', () => {
      const workflowJson = JSON.stringify({
        nodes: [{ id: 'a', type: 'action', data: { label: 'a', config: {} } }],
        edges: [],
      })
      
      const workflow = engine.testParseWorkflowJson(workflowJson)
      
      expect(workflow.nodes.length).toBe(1)
      expect(workflow.nodes[0].id).toBe('a')
    })

    it('should parse workflow with nodes_json and edges_json', () => {
      const workflowJson = JSON.stringify({
        nodes_json: JSON.stringify([{ id: 'a', type: 'action', data: { label: 'a', config: {} } }]),
        edges_json: JSON.stringify([]),
      })
      
      const workflow = engine.testParseWorkflowJson(workflowJson)
      
      expect(workflow.nodes.length).toBe(1)
      expect(workflow.nodes[0].id).toBe('a')
    })

    it('should throw error for invalid JSON', () => {
      expect(() => engine.testParseWorkflowJson('not valid json')).toThrow(/parse/i)
    })
  })

  describe('Template String Resolution', () => {
    it('should resolve nested output path', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('action1', { success: true, value: 'hello' })
      
      const result = engine.testResolveTemplateString('{{action1.output.success}}', nodeOutputs)
      
      expect(result).toBe('true')
    })

    it('should resolve array index access', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { 
        items: ['first', 'second', 'third'] 
      })
      
      const result = engine.testResolveTemplateString('{{node1.output.items[1]}}', nodeOutputs)
      
      expect(result).toBe('second')
    })

    it('should return original template when path not found', () => {
      const nodeOutputs = new Map<string, unknown>()
      
      const result = engine.testResolveTemplateString('{{nonexistent.output.value}}', nodeOutputs)
      
      expect(result).toBe('{{nonexistent.output.value}}')
    })

    it('should handle multiple template placeholders', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('a', { value: 'hello' })
      nodeOutputs.set('b', { value: 'world' })
      
      const result = engine.testResolveTemplateString('{{a.output.value}} and {{b.output.value}}', nodeOutputs)
      
      expect(result).toBe('hello and world')
    })
  })

  describe('Condition Evaluation', () => {
    it('should evaluate truthy string values', () => {
      expect(engine.testEvaluateCondition('true')).toBe(true)
      expect(engine.testEvaluateCondition('yes')).toBe(true)
      expect(engine.testEvaluateCondition('1')).toBe(true)
    })

    it('should evaluate falsy string values', () => {
      expect(engine.testEvaluateCondition('false')).toBe(false)
      expect(engine.testEvaluateCondition('no')).toBe(false)
      expect(engine.testEvaluateCondition('0')).toBe(false)
    })

    it('should evaluate equality comparison', () => {
      expect(engine.testEvaluateCondition('value == value')).toBe(true)
      expect(engine.testEvaluateCondition('value == other')).toBe(false)
    })

    it('should evaluate contains comparison', () => {
      expect(engine.testEvaluateCondition('hello world contains world')).toBe(true)
      expect(engine.testEvaluateCondition('hello contains world')).toBe(false)
    })
  })

  describe('Workflow Execution', () => {
    it('should execute simple action workflow successfully', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', data: { label: 'a', config: { service: 'testService', method: 'testMethod' } } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(1)
      expect(result.nodeResults.get('a')?.success).toBe(true)
    })

    it('should execute workflow in dependency order', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', data: { label: 'a', config: { service: 'svc', method: 'm1' } } },
          { id: 'b', type: 'action', data: { label: 'b', config: { service: 'svc', method: 'm2' } } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(mockServiceRegistry.call).toHaveBeenCalledTimes(2)
    })

    it('should fail workflow on action error', async () => {
      ;(mockServiceRegistry.call as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Service error'))
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', data: { label: 'a', config: { service: 'testService', method: 'testMethod' } } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
    })

    it('should handle cycle in workflow', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', data: { label: 'a', config: {} } },
          { id: 'b', type: 'action', data: { label: 'b', config: {} } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'a' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/cycle/i)
    })
  })

  describe('Condition Node Execution', () => {
    it('should execute condition node and return true', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond', type: 'condition', data: { label: 'cond', config: { condition: 'true' } } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.get('cond')?.data).toBe(true)
    })

    it('should fail condition node without condition config', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond', type: 'condition', data: { label: 'cond', config: {} } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('condition')
    })
  })

  describe('Transform Node Execution', () => {
    it('should execute passthrough transform', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'trans', type: 'transform', data: { label: 'trans', config: { inputNode: 'src', transformType: 'passthrough' } } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
    })
  })

  describe('Loop Node Execution', () => {
    it('should execute loop node with maxIterations', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'loop', type: 'loop', data: { label: 'loop', config: { maxIterations: 3 } } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      const data = result.nodeResults.get('loop')?.data as { iterations: number }
      expect(data.iterations).toBe(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const result = await engine.executeWorkflow('not valid json')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('parse')
    })

    it('should report duration correctly', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', data: { label: 'a', config: { service: 'svc', method: 'm' } } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
      expect(result.nodeResults.get('a')?.durationMs).toBeGreaterThanOrEqual(0)
    })
  })
})