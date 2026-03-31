import { 
  WorkflowEngine, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowGraph,
  TaskExecutor,
  CapacityChecker,
  TaskResult
} from '../services/workflow-engine'
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'

/**
 * TestableWorkflowEngine exposes private methods for unit testing
 */
class TestableWorkflowEngine extends WorkflowEngine {
  // Expose buildExecutionOrder for testing topological sort
  testBuildExecutionOrder(workflow: WorkflowGraph): string[] {
    return (this as unknown as { buildExecutionOrder(w: WorkflowGraph): string[] })
      .buildExecutionOrder(workflow)
  }

  // Expose resolveTemplateString for testing template resolution
  testResolveTemplateString(template: string, nodeOutputs: Map<string, unknown>): string {
    return (this as unknown as { resolveTemplateString(t: string, n: Map<string, unknown>): string })
      .resolveTemplateString(template, nodeOutputs)
  }

  // Expose evaluateCondition for testing condition evaluation
  testEvaluateCondition(condition: string): boolean {
    return (this as unknown as { evaluateCondition(c: string): boolean })
      .evaluateCondition(condition)
  }

  // Expose resolveNodeConfig for testing config resolution
  testResolveNodeConfig(
    config: Record<string, unknown>, 
    nodeOutputs: Map<string, unknown>
  ): Record<string, unknown> {
    return (this as unknown as { 
      resolveNodeConfig(c: Record<string, unknown>, n: Map<string, unknown>): Record<string, unknown> 
    }).resolveNodeConfig(config, nodeOutputs)
  }

  // Expose validateWorkflow for testing validation
  testValidateWorkflow(workflow: WorkflowGraph): void {
    return (this as unknown as { validateWorkflow(w: WorkflowGraph): void })
      .validateWorkflow(workflow)
  }

  // Expose parseWorkflowJson for testing parsing
  testParseWorkflowJson(workflowJson: string): WorkflowGraph {
    return (this as unknown as { parseWorkflowJson(j: string): WorkflowGraph })
      .parseWorkflowJson(workflowJson)
  }
}

describe('WorkflowEngine', () => {
  let engine: TestableWorkflowEngine
  let mockTaskExecutor: TaskExecutor
  let mockCapacityChecker: CapacityChecker

  beforeEach(() => {
    mockTaskExecutor = {
      executeTask: vi.fn().mockResolvedValue({
        success: true,
        data: { result: 'test' },
        durationMs: 100,
      }),
    }

    mockCapacityChecker = {
      hasCapacity: vi.fn().mockResolvedValue(true),
      decrementCapacity: vi.fn().mockResolvedValue(undefined),
    }

    engine = new TestableWorkflowEngine(
      {} as never, // db not needed for unit tests
      mockTaskExecutor,
      mockCapacityChecker
    )
  })

  // ============================================
  // Topological Sort Tests
  // ============================================
  describe('Topological Sort', () => {
    it('should sort nodes in correct dependency order', () => {
      const nodes: WorkflowNode[] = [
        { id: 'c', type: 'action', config: {} },
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'c' },
        { id: 'e2', source: 'b', target: 'c' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      // a and b should come before c
      const cIndex = sorted.findIndex(id => id === 'c')
      const aIndex = sorted.findIndex(id => id === 'a')
      const bIndex = sorted.findIndex(id => id === 'b')
      
      expect(aIndex).toBeLessThan(cIndex)
      expect(bIndex).toBeLessThan(cIndex)
      expect(sorted.length).toBe(3)
    })

    it('should handle linear chain of dependencies', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
        { id: 'c', type: 'action', config: {} },
        { id: 'd', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'd' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      // Should be a -> b -> c -> d
      expect(sorted).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should handle diamond dependency pattern', () => {
      // Diamond: a -> b, a -> c, b -> d, c -> d
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
        { id: 'c', type: 'action', config: {} },
        { id: 'd', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'c' },
        { id: 'e3', source: 'b', target: 'd' },
        { id: 'e4', source: 'c', target: 'd' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      // a must come first, d must come last
      // b and c can come in any order between a and d
      expect(sorted[0]).toBe('a')
      expect(sorted[sorted.length - 1]).toBe('d')
      expect(sorted.indexOf('b')).toBeGreaterThan(sorted.indexOf('a'))
      expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('d'))
      expect(sorted.indexOf('c')).toBeGreaterThan(sorted.indexOf('a'))
      expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('d'))
    })

    it('should detect cycles and throw error', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' }, // cycle!
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testBuildExecutionOrder(workflow)).toThrow(/cycle/i)
    })

    it('should detect self-cycle', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'a' }, // self-cycle
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testBuildExecutionOrder(workflow)).toThrow(/cycle/i)
    })

    it('should detect longer cycles', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
        { id: 'c', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'a' }, // cycle!
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testBuildExecutionOrder(workflow)).toThrow(/cycle/i)
    })

    it('should handle disconnected nodes (no edges)', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
        { id: 'c', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = []
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      // All nodes should be included, order doesn't matter
      expect(sorted.length).toBe(3)
      expect(sorted).toContain('a')
      expect(sorted).toContain('b')
      expect(sorted).toContain('c')
    })

    it('should handle empty edges array', () => {
      const nodes: WorkflowNode[] = [
        { id: 'node1', type: 'action', config: {} },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges: [] }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      expect(sorted).toEqual(['node1'])
    })

    it('should handle single node with no edges', () => {
      const nodes: WorkflowNode[] = [
        { id: 'single', type: 'action', config: {} },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges: [] }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      expect(sorted).toEqual(['single'])
    })

    it('should handle complex DAG with multiple entry points', () => {
      // Complex graph with two entry points converging
      const nodes: WorkflowNode[] = [
        { id: 'entry1', type: 'action', config: {} },
        { id: 'entry2', type: 'action', config: {} },
        { id: 'merge', type: 'action', config: {} },
        { id: 'final', type: 'action', config: {} },
        { id: 'branch', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'entry1', target: 'merge' },
        { id: 'e2', source: 'entry2', target: 'merge' },
        { id: 'e3', source: 'merge', target: 'final' },
        { id: 'e4', source: 'merge', target: 'branch' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      const sorted = engine.testBuildExecutionOrder(workflow)
      
      // entry nodes first
      const entry1Idx = sorted.indexOf('entry1')
      const entry2Idx = sorted.indexOf('entry2')
      const mergeIdx = sorted.indexOf('merge')
      const finalIdx = sorted.indexOf('final')
      const branchIdx = sorted.indexOf('branch')
      
      expect(entry1Idx).toBeLessThan(mergeIdx)
      expect(entry2Idx).toBeLessThan(mergeIdx)
      expect(mergeIdx).toBeLessThan(finalIdx)
      expect(mergeIdx).toBeLessThan(branchIdx)
    })
  })

  // ============================================
  // Workflow Validation Tests
  // ============================================
  describe('Workflow Validation', () => {
    it('should validate workflow with duplicate node IDs', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'a', type: 'action', config: {} }, // duplicate!
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
        { id: 'a', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'nonexistent', target: 'a' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testValidateWorkflow(workflow)).toThrow(/non-existent source/i)
    })

    it('should validate edge referencing non-existent target', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'nonexistent' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testValidateWorkflow(workflow)).toThrow(/non-existent target/i)
    })

    it('should pass validation for valid workflow', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'action', config: {} },
        { id: 'b', type: 'action', config: {} },
      ]
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'a', target: 'b' },
      ]
      
      const workflow: WorkflowGraph = { nodes, edges }
      
      expect(() => engine.testValidateWorkflow(workflow)).not.toThrow()
    })
  })

  // ============================================
  // Workflow JSON Parsing Tests
  // ============================================
  describe('Workflow JSON Parsing', () => {
    it('should parse workflow with nodes and edges', () => {
      const workflowJson = JSON.stringify({
        nodes: [{ id: 'a', type: 'action', config: {} }],
        edges: [],
      })
      
      const workflow = engine.testParseWorkflowJson(workflowJson)
      
      expect(workflow.nodes.length).toBe(1)
      expect(workflow.nodes[0].id).toBe('a')
    })

    it('should parse workflow with nodes_json and edges_json', () => {
      const workflowJson = JSON.stringify({
        nodes_json: JSON.stringify([{ id: 'a', type: 'action', config: {} }]),
        edges_json: JSON.stringify([]),
      })
      
      const workflow = engine.testParseWorkflowJson(workflowJson)
      
      expect(workflow.nodes.length).toBe(1)
      expect(workflow.nodes[0].id).toBe('a')
    })

    it('should throw error for invalid JSON', () => {
      expect(() => engine.testParseWorkflowJson('not valid json')).toThrow(/parse/i)
    })

    it('should throw error for invalid structure', () => {
      const workflowJson = JSON.stringify({ invalid: 'structure' })
      
      expect(() => engine.testParseWorkflowJson(workflowJson)).toThrow()
    })
  })

  // ============================================
  // Template String Resolution Tests
  // ============================================
  describe('Template String Resolution', () => {
    it('should resolve simple output reference', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { success: true, data: 'test' })
      
      const result = engine.testResolveTemplateString('{{node1.output}}', nodeOutputs)
      
      expect(result).toBe('[object Object]')
    })

    it('should resolve nested output path', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('action1', { success: true, value: 'hello' })
      
      const result = engine.testResolveTemplateString('{{action1.output.success}}', nodeOutputs)
      
      expect(result).toBe('true')
    })

    it('should resolve deeply nested path', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { 
        data: { 
          nested: { 
            value: 'deep-value' 
          } 
        } 
      })
      
      const result = engine.testResolveTemplateString('{{node1.output.data.nested.value}}', nodeOutputs)
      
      expect(result).toBe('deep-value')
    })

    it('should resolve array index access', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { 
        items: ['first', 'second', 'third'] 
      })
      
      const result = engine.testResolveTemplateString('{{node1.output.items[1]}}', nodeOutputs)
      
      expect(result).toBe('second')
    })

    it('should resolve array index with nested object', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { 
        results: [
          { name: 'item1', value: 100 },
          { name: 'item2', value: 200 },
        ]
      })
      
      const result = engine.testResolveTemplateString('{{node1.output.results[1].value}}', nodeOutputs)
      
      expect(result).toBe('200')
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

    it('should handle non-template strings', () => {
      const nodeOutputs = new Map<string, unknown>()
      
      const result = engine.testResolveTemplateString('plain text', nodeOutputs)
      
      expect(result).toBe('plain text')
    })

    it('should handle numeric values', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { count: 42 })
      
      const result = engine.testResolveTemplateString('{{node1.output.count}}', nodeOutputs)
      
      expect(result).toBe('42')
    })

    it('should handle boolean values', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { success: true })
      
      const result = engine.testResolveTemplateString('{{node1.output.success}}', nodeOutputs)
      
      expect(result).toBe('true')
    })

    it('should handle undefined values', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { })
      
      const result = engine.testResolveTemplateString('{{node1.output.missing}}', nodeOutputs)
      
      expect(result).toBe('{{node1.output.missing}}')
    })
  })

  // ============================================
  // Node Config Resolution Tests
  // ============================================
  describe('Node Config Resolution', () => {
    it('should resolve config with template values', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('prev', { result: 'resolved-value' })
      
      const config = {
        input: '{{prev.output.result}}',
        static: 'unchanged',
      }
      
      const resolved = engine.testResolveNodeConfig(config, nodeOutputs)
      
      expect(resolved.input).toBe('resolved-value')
      expect(resolved.static).toBe('unchanged')
    })

    it('should resolve nested config objects', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { value: 'nested-value' })
      
      const config = {
        nested: {
          path: '{{node1.output.value}}',
          deep: {
            value: 'static',
          },
        },
      }
      
      const resolved = engine.testResolveNodeConfig(config, nodeOutputs)
      
      const nested = resolved.nested as Record<string, unknown>
      expect(nested.path).toBe('nested-value')
      expect((nested.deep as Record<string, unknown>)).toEqual({ value: 'static' })
    })

    it('should resolve array values in config', () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node1', { items: ['a', 'b'] })
      
      const config = {
        list: ['{{node1.output.items[0]}}', 'static'],
      }
      
      const resolved = engine.testResolveNodeConfig(config, nodeOutputs)
      
      expect(resolved.list).toEqual(['a', 'static'])
    })

    it('should preserve non-string values', () => {
      const nodeOutputs = new Map<string, unknown>()
      
      const config = {
        number: 42,
        boolean: true,
        nullValue: null,
        object: { key: 'value' },
      }
      
      const resolved = engine.testResolveNodeConfig(config, nodeOutputs)
      
      expect(resolved.number).toBe(42)
      expect(resolved.boolean).toBe(true)
      expect(resolved.nullValue).toBe(null)
      expect(resolved.object).toEqual({ key: 'value' })
    })
  })

  // ============================================
  // Condition Evaluation Tests
  // ============================================
  describe('Condition Evaluation', () => {
    it('should evaluate truthy string values', () => {
      expect(engine.testEvaluateCondition('true')).toBe(true)
      expect(engine.testEvaluateCondition('TRUE')).toBe(true)
      expect(engine.testEvaluateCondition('yes')).toBe(true)
      expect(engine.testEvaluateCondition('YES')).toBe(true)
      expect(engine.testEvaluateCondition('1')).toBe(true)
      expect(engine.testEvaluateCondition('success')).toBe(true)
    })

    it('should evaluate falsy string values', () => {
      expect(engine.testEvaluateCondition('false')).toBe(false)
      expect(engine.testEvaluateCondition('FALSE')).toBe(false)
      expect(engine.testEvaluateCondition('no')).toBe(false)
      expect(engine.testEvaluateCondition('NO')).toBe(false)
      expect(engine.testEvaluateCondition('0')).toBe(false)
      expect(engine.testEvaluateCondition('fail')).toBe(false)
      expect(engine.testEvaluateCondition('null')).toBe(false)
      expect(engine.testEvaluateCondition('undefined')).toBe(false)
      expect(engine.testEvaluateCondition('')).toBe(false)
    })

    it('should evaluate equality comparison', () => {
      expect(engine.testEvaluateCondition('value == value')).toBe(true)
      expect(engine.testEvaluateCondition('value == other')).toBe(false)
      expect(engine.testEvaluateCondition('true == true')).toBe(true)
    })

    it('should evaluate inequality comparison', () => {
      expect(engine.testEvaluateCondition('value != other')).toBe(true)
      expect(engine.testEvaluateCondition('value != value')).toBe(false)
    })

    it('should evaluate numeric greater than', () => {
      expect(engine.testEvaluateCondition('10 > 5')).toBe(true)
      expect(engine.testEvaluateCondition('5 > 10')).toBe(false)
    })

    it('should evaluate numeric less than', () => {
      expect(engine.testEvaluateCondition('5 < 10')).toBe(true)
      expect(engine.testEvaluateCondition('10 < 5')).toBe(false)
    })

    it('should evaluate greater than or equal', () => {
      expect(engine.testEvaluateCondition('10 >= 10')).toBe(true)
      expect(engine.testEvaluateCondition('10 >= 5')).toBe(true)
      expect(engine.testEvaluateCondition('5 >= 10')).toBe(false)
    })

    it('should evaluate less than or equal', () => {
      expect(engine.testEvaluateCondition('5 <= 5')).toBe(true)
      expect(engine.testEvaluateCondition('5 <= 10')).toBe(true)
      expect(engine.testEvaluateCondition('10 <= 5')).toBe(false)
    })

    it('should evaluate contains comparison', () => {
      expect(engine.testEvaluateCondition('hello world contains world')).toBe(true)
      expect(engine.testEvaluateCondition('hello contains world')).toBe(false)
    })

    it('should return true for non-empty non-truthy strings', () => {
      // Non-empty strings that aren't in truthy/falsy lists should be truthy
      expect(engine.testEvaluateCondition('some text')).toBe(true)
      expect(engine.testEvaluateCondition('another value')).toBe(true)
    })

    it('should trim comparison values', () => {
      expect(engine.testEvaluateCondition(' value  ==  value ')).toBe(true)
    })
  })

  // ============================================
  // Workflow Execution Tests
  // ============================================
  describe('Workflow Execution', () => {
    it('should execute simple workflow successfully', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', subtype: 'text', config: { messages: [] } },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(1)
      expect(result.nodeResults.get('a')?.success).toBe(true)
    })

    it('should execute workflow in dependency order', async () => {
      (mockTaskExecutor.executeTask as Mock).mockImplementation(async (type, payload) => {
        return {
          success: true,
          data: { executed: type },
          durationMs: 50,
        }
      })
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', subtype: 'text', config: {} },
          { id: 'b', type: 'action', subtype: 'text', config: { input: '{{a.output}}' } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(mockTaskExecutor.executeTask).toHaveBeenCalledTimes(2)
    })

    it('should fail workflow on node failure', async () => {
      (mockTaskExecutor.executeTask as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Task failed',
        durationMs: 100,
      })
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', config: {} },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('failed')
    })

    it('should stop execution after node failure', async () => {
      (mockTaskExecutor.executeTask as Mock)
        .mockResolvedValueOnce({
          success: false,
          error: 'First failed',
          durationMs: 100,
        })
        .mockResolvedValueOnce({
          success: true,
          data: {},
          durationMs: 50,
        })
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', config: {} },
          { id: 'b', type: 'action', config: {} },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
      expect(mockTaskExecutor.executeTask).toHaveBeenCalledTimes(1)
    })

    it('should handle cycle in workflow', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', config: {} },
          { id: 'b', type: 'action', config: {} },
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

    it('should check capacity before action execution', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', subtype: 'text', config: {} },
        ],
        edges: [],
      })
      
      await engine.executeWorkflow(workflowJson)
      
      expect(mockCapacityChecker.hasCapacity).toHaveBeenCalledWith('text')
    })

    it('should fail when no capacity available', async () => {
      (mockCapacityChecker.hasCapacity as Mock).mockResolvedValue(false)
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', subtype: 'text', config: {} },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/capacity/i)
    })

    it('should decrement capacity on successful action', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', subtype: 'text', config: {} },
        ],
        edges: [],
      })
      
      await engine.executeWorkflow(workflowJson)
      
      expect(mockCapacityChecker.decrementCapacity).toHaveBeenCalledWith('text')
    })

    it('should not decrement capacity on failed action', async () => {
      (mockTaskExecutor.executeTask as Mock).mockResolvedValue({
        success: false,
        error: 'Failed',
        durationMs: 100,
      })
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', subtype: 'text', config: {} },
        ],
        edges: [],
      })
      
      await engine.executeWorkflow(workflowJson)
      
      expect(mockCapacityChecker.decrementCapacity).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Node Type Execution Tests
  // ============================================
  describe('Node Type Execution', () => {
    describe('Action Node', () => {
      it('should execute action node with subtype', async () => {
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'a', type: 'action', subtype: 'voice', config: { text: 'hello' } },
          ],
          edges: [],
        })
        
        await engine.executeWorkflow(workflowJson)
        
        expect(mockTaskExecutor.executeTask).toHaveBeenCalledWith('voice', { text: 'hello' })
      })

      it('should use default subtype "text" when not specified', async () => {
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'a', type: 'action', config: { messages: [] } },
          ],
          edges: [],
        })
        
        await engine.executeWorkflow(workflowJson)
        
        expect(mockTaskExecutor.executeTask).toHaveBeenCalledWith('text', expect.anything())
      })
    })

    describe('Condition Node', () => {
      it('should execute condition node and return result', async () => {
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'cond', type: 'condition', config: { condition: 'true' } },
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
            { id: 'cond', type: 'condition', config: {} },
          ],
          edges: [],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(false)
        expect(result.error).toContain('condition')
      })
    })

    describe('Transform Node', () => {
      it('should execute passthrough transform', async () => {
        // First execute an action to have output
        (mockTaskExecutor.executeTask as Mock).mockResolvedValue({
          success: true,
          data: { value: 'test-data' },
          durationMs: 50,
        })
        
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'src', type: 'action', config: {} },
            { id: 'trans', type: 'transform', config: { inputNode: 'src', transformType: 'passthrough' } },
          ],
          edges: [
            { id: 'e1', source: 'src', target: 'trans' },
          ],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(true)
        expect(result.nodeResults.get('trans')?.data).toEqual({ value: 'test-data' })
      })

      it('should execute extract transform', async () => {
        (mockTaskExecutor.executeTask as Mock).mockResolvedValue({
          success: true,
          data: { nested: { value: 'extracted' } },
          durationMs: 50,
        })
        
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'src', type: 'action', config: {} },
            { id: 'trans', type: 'transform', config: { 
              inputNode: 'src', 
              transformType: 'extract', 
              outputFormat: 'nested.value' 
            } },
          ],
          edges: [
            { id: 'e1', source: 'src', target: 'trans' },
          ],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(true)
        expect(result.nodeResults.get('trans')?.data).toBe('extracted')
      })
    })

    describe('Loop Node', () => {
      it('should execute loop node with maxIterations', async () => {
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'loop', type: 'loop', config: { maxIterations: 3, bodyNode: 'body' } },
          ],
          edges: [],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(true)
        expect((result.nodeResults.get('loop')?.data as Record<string, unknown>)?.iterations).toBe(3)
      })

      it('should fail loop node without bodyNode config', async () => {
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'loop', type: 'loop', config: { maxIterations: 3 } },
          ],
          edges: [],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(false)
        expect(result.error).toContain('bodyNode')
      })
    })

    describe('Queue Node', () => {
      it('should fail queue node without queue processor', async () => {
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'queue', type: 'queue', config: { jobId: 'job-1' } },
          ],
          edges: [],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(false)
        expect(result.error).toContain('QueueProcessor')
      })

      it('should fail queue node without jobId', async () => {
        engine.setQueueProcessor({
          processQueue: vi.fn().mockResolvedValue({
            success: true,
            tasksExecuted: 5,
            tasksSucceeded: 5,
            tasksFailed: 0,
          }),
        })
        
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'queue', type: 'queue', config: {} },
          ],
          edges: [],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(false)
        expect(result.error).toContain('jobId')
      })

      it('should execute queue node with queue processor', async () => {
        const mockQueueProcessor = {
          processQueue: vi.fn().mockResolvedValue({
            success: true,
            tasksExecuted: 10,
            tasksSucceeded: 8,
            tasksFailed: 2,
          }),
        }
        engine.setQueueProcessor(mockQueueProcessor)
        
        const workflowJson = JSON.stringify({
          nodes: [
            { id: 'queue', type: 'queue', config: { 
              jobId: 'job-1', 
              batchSize: 5, 
              maxConcurrent: 2 
            } },
          ],
          edges: [],
        })
        
        const result = await engine.executeWorkflow(workflowJson)
        
        expect(result.success).toBe(true)
        expect(mockQueueProcessor.processQueue).toHaveBeenCalledWith('job-1', {
          batchSize: 5,
          maxConcurrent: 2,
          skipFailed: undefined,
        })
        expect((result.nodeResults.get('queue')?.data as Record<string, unknown>)?.tasksExecuted).toBe(10)
      })
    })
  })

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const result = await engine.executeWorkflow('not valid json')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('parse')
    })

    it('should handle missing node in execution order', async () => {
      // This is an edge case where buildExecutionOrder might return a node ID
      // that doesn't exist in the workflow
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'nonexistent' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(false)
    })

    it('should report duration correctly', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'a', type: 'action', config: {} },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
      expect(result.nodeResults.get('a')?.durationMs).toBeGreaterThanOrEqual(0)
    })
  })
})