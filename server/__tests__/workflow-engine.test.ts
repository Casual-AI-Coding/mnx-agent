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

    it('should execute subNodes for each iteration in loop', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { 
            id: 'loop', 
            type: 'loop', 
            data: { 
              label: 'loop', 
              config: { 
                items: JSON.stringify(['apple', 'banana', 'cherry']),
                subNodes: [
                  { 
                    id: 'sub-action', 
                    type: 'action', 
                    data: { 
                      label: 'process item', 
                      config: { 
                        service: 'testService', 
                        method: 'processItem',
                        args: ['{{item}}']
                      } 
                    } 
                  }
                ],
                subEdges: []
              } 
            } 
          },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(mockServiceRegistry.call).toHaveBeenCalledTimes(3)
      expect(mockServiceRegistry.call).toHaveBeenNthCalledWith(1, 'testService', 'processItem', ['apple'])
      expect(mockServiceRegistry.call).toHaveBeenNthCalledWith(2, 'testService', 'processItem', ['banana'])
      expect(mockServiceRegistry.call).toHaveBeenNthCalledWith(3, 'testService', 'processItem', ['cherry'])
    })

    it('should support {{item.field}} template in subNodes', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('item', { name: 'Alice', age: 25 })
      
      const result1 = engine.testResolveTemplateString('{{item}}', nodeOutputs)
      const result2 = engine.testResolveTemplateString('{{item.name}}', nodeOutputs)
      const result3 = engine.testResolveTemplateString('{{item.age}}', nodeOutputs)
      
      expect(result1).toBe('[object Object]')
      expect(result2).toBe('Alice')
      expect(result3).toBe('25')
    })

    it('should execute subNodes with item.field templates', async () => {
      const items = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ]
      
      const workflowJson = JSON.stringify({
        nodes: [
          { 
            id: 'loop', 
            type: 'loop', 
            data: { 
              label: 'loop', 
              config: { 
                items: JSON.stringify(items),
                subNodes: [
                  { 
                    id: 'sub-action', 
                    type: 'action', 
                    data: { 
                      label: 'process person', 
                      config: { 
                        service: 'testService', 
                        method: 'processPerson',
                        args: ['{{item.name}}', '{{item.age}}']
                      } 
                    } 
                  }
                ],
                subEdges: []
              } 
            } 
          },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      const mockCall = mockServiceRegistry.call as ReturnType<typeof vi.fn>
      const calls = mockCall.mock.calls
      
      expect(result.success).toBe(true)
      expect(calls.length).toBe(2)
      
      const call1 = calls[0]
      const call2 = calls[1]
      
      expect(call1[0]).toBe('testService')
      expect(call1[1]).toBe('processPerson')
      expect(call1[2]).toEqual(['Alice', '25'])
      
      expect(call2[0]).toBe('testService')
      expect(call2[1]).toBe('processPerson')
      expect(call2[2]).toEqual(['Bob', '30'])
    })

    it('should terminate loop early when condition is false', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { 
            id: 'loop', 
            type: 'loop', 
            data: { 
              label: 'loop', 
              config: { 
                items: JSON.stringify([1, 2, 3, 4, 5]),
                condition: '{{item}} < 3',
                subNodes: [
                  { 
                    id: 'sub-action', 
                    type: 'action', 
                    data: { 
                      label: 'process', 
                      config: { 
                        service: 'testService', 
                        method: 'process',
                        args: ['{{item}}']
                      } 
                    } 
                  }
                ],
                subEdges: []
              } 
            } 
          },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(mockServiceRegistry.call).toHaveBeenCalledTimes(2)
    })

    it('should respect maxIterations limit with subNodes', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { 
            id: 'loop', 
            type: 'loop', 
            data: { 
              label: 'loop', 
              config: { 
                items: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
                maxIterations: 3,
                subNodes: [
                  { 
                    id: 'sub-action', 
                    type: 'action', 
                    data: { 
                      label: 'process', 
                      config: { 
                        service: 'testService', 
                        method: 'process',
                        args: ['{{item}}']
                      } 
                    } 
                  }
                ],
                subEdges: []
              } 
            } 
          },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(mockServiceRegistry.call).toHaveBeenCalledTimes(3)
    })

    it('should collect results from all subNode iterations', async () => {
      ;(mockServiceRegistry.call as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ processed: 'apple' })
        .mockResolvedValueOnce({ processed: 'banana' })
        .mockResolvedValueOnce({ processed: 'cherry' })
      
      const workflowJson = JSON.stringify({
        nodes: [
          { 
            id: 'loop', 
            type: 'loop', 
            data: { 
              label: 'loop', 
              config: { 
                items: JSON.stringify(['apple', 'banana', 'cherry']),
                subNodes: [
                  { 
                    id: 'sub-action', 
                    type: 'action', 
                    data: { 
                      label: 'process item', 
                      config: { 
                        service: 'testService', 
                        method: 'processItem',
                        args: ['{{item}}']
                      } 
                    } 
                  }
                ],
                subEdges: []
              } 
            } 
          },
        ],
        edges: [],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      const loopResult = result.nodeResults.get('loop')?.data as { iterations: number; results: unknown[] }
      expect(loopResult.iterations).toBe(3)
      expect(loopResult.results).toHaveLength(3)
      expect(loopResult.results[0]).toEqual({ processed: 'apple' })
      expect(loopResult.results[1]).toEqual({ processed: 'banana' })
      expect(loopResult.results[2]).toEqual({ processed: 'cherry' })
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

  describe('Condition Node Branch Control', () => {
    it('should execute only true branch when condition evaluates to true', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond', type: 'condition', data: { label: 'cond', config: { condition: 'true' } } },
          { id: 'trueNode', type: 'action', data: { label: 'trueNode', config: { service: 'svc', method: 'mTrue' } } },
          { id: 'falseNode', type: 'action', data: { label: 'falseNode', config: { service: 'svc', method: 'mFalse' } } },
        ],
        edges: [
          { id: 'e1', source: 'cond', target: 'trueNode', sourceHandle: 'true' },
          { id: 'e2', source: 'cond', target: 'falseNode', sourceHandle: 'false' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.has('cond')).toBe(true)
      expect(result.nodeResults.has('trueNode')).toBe(true)
      expect(result.nodeResults.has('falseNode')).toBe(false) // false branch should NOT execute
      expect(result.nodeResults.get('cond')?.data).toBe(true)
    })

    it('should execute only false branch when condition evaluates to false', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond', type: 'condition', data: { label: 'cond', config: { condition: 'false' } } },
          { id: 'trueNode', type: 'action', data: { label: 'trueNode', config: { service: 'svc', method: 'mTrue' } } },
          { id: 'falseNode', type: 'action', data: { label: 'falseNode', config: { service: 'svc', method: 'mFalse' } } },
        ],
        edges: [
          { id: 'e1', source: 'cond', target: 'trueNode', sourceHandle: 'true' },
          { id: 'e2', source: 'cond', target: 'falseNode', sourceHandle: 'false' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.has('cond')).toBe(true)
      expect(result.nodeResults.has('trueNode')).toBe(false) // true branch should NOT execute
      expect(result.nodeResults.has('falseNode')).toBe(true)
      expect(result.nodeResults.get('cond')?.data).toBe(false)
    })

    it('should execute both branches when no sourceHandle specified (backward compatibility)', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond', type: 'condition', data: { label: 'cond', config: { condition: 'true' } } },
          { id: 'nodeA', type: 'action', data: { label: 'nodeA', config: { service: 'svc', method: 'mA' } } },
          { id: 'nodeB', type: 'action', data: { label: 'nodeB', config: { service: 'svc', method: 'mB' } } },
        ],
        edges: [
          { id: 'e1', source: 'cond', target: 'nodeA' }, // no sourceHandle
          { id: 'e2', source: 'cond', target: 'nodeB' }, // no sourceHandle
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.has('cond')).toBe(true)
      expect(result.nodeResults.has('nodeA')).toBe(true) // should execute (backward compat)
      expect(result.nodeResults.has('nodeB')).toBe(true) // should execute (backward compat)
    })

    it('should handle chained condition nodes', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond1', type: 'condition', data: { label: 'cond1', config: { condition: 'true' } } },
          { id: 'cond2', type: 'condition', data: { label: 'cond2', config: { condition: 'false' } } },
          { id: 'nodeA', type: 'action', data: { label: 'nodeA', config: { service: 'svc', method: 'mA' } } },
          { id: 'nodeB', type: 'action', data: { label: 'nodeB', config: { service: 'svc', method: 'mB' } } },
        ],
        edges: [
          { id: 'e1', source: 'cond1', target: 'cond2', sourceHandle: 'true' },
          { id: 'e2', source: 'cond2', target: 'nodeA', sourceHandle: 'true' },
          { id: 'e3', source: 'cond2', target: 'nodeB', sourceHandle: 'false' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.has('cond1')).toBe(true)
      expect(result.nodeResults.has('cond2')).toBe(true) // cond1 true → cond2 executes
      expect(result.nodeResults.has('nodeA')).toBe(false) // cond2 false → nodeA skipped
      expect(result.nodeResults.has('nodeB')).toBe(true) // cond2 false → nodeB executes
    })

    it('should handle condition with template resolution from previous node', async () => {
      ;(mockServiceRegistry.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'success' })
      
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'action1', type: 'action', data: { label: 'action1', config: { service: 'svc', method: 'm1' } } },
          { id: 'cond', type: 'condition', data: { label: 'cond', config: { condition: '{{action1.output.status}} == success' } } },
          { id: 'successNode', type: 'action', data: { label: 'successNode', config: { service: 'svc', method: 'mSuccess' } } },
          { id: 'failNode', type: 'action', data: { label: 'failNode', config: { service: 'svc', method: 'mFail' } } },
        ],
        edges: [
          { id: 'e1', source: 'action1', target: 'cond' },
          { id: 'e2', source: 'cond', target: 'successNode', sourceHandle: 'true' },
          { id: 'e3', source: 'cond', target: 'failNode', sourceHandle: 'false' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.has('action1')).toBe(true)
      expect(result.nodeResults.has('cond')).toBe(true)
      expect(result.nodeResults.has('successNode')).toBe(true) // condition true
      expect(result.nodeResults.has('failNode')).toBe(false) // condition true → failNode skipped
    })

    it('should handle default handle fallback when specified handle not found', async () => {
      const workflowJson = JSON.stringify({
        nodes: [
          { id: 'cond', type: 'condition', data: { label: 'cond', config: { condition: 'true' } } },
          { id: 'defaultNode', type: 'action', data: { label: 'defaultNode', config: { service: 'svc', method: 'mDefault' } } },
        ],
        edges: [
          { id: 'e1', source: 'cond', target: 'defaultNode', sourceHandle: 'default' },
        ],
      })
      
      const result = await engine.executeWorkflow(workflowJson)
      
      expect(result.success).toBe(true)
      expect(result.nodeResults.has('cond')).toBe(true)
      expect(result.nodeResults.has('defaultNode')).toBe(true) // default handle should execute regardless
    })
  })
})