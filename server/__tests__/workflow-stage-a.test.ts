import { WorkflowEngine, WorkflowGraph } from '../services/workflow/index'
import { WorkflowNodeType } from '../types/workflow'
import type { ServiceNodeRegistry } from '../services/service-node-registry'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockEventBus } from './helpers/mock-event-bus'

type TestWorkflowNode = Omit<WorkflowGraph['nodes'][number], 'position'> & { position?: WorkflowGraph['nodes'][number]['position'] }
type TestWorkflowGraph = Omit<WorkflowGraph, 'nodes'> & { nodes: TestWorkflowNode[] }

function normalizeWorkflow(workflow: TestWorkflowGraph): WorkflowGraph {
  return {
    ...workflow,
    nodes: workflow.nodes.map((node, index) => ({
      ...node,
      position: node.position ?? { x: index, y: 0 },
    })),
  }
}

async function executeTestWorkflow(engine: WorkflowEngine, workflow: TestWorkflowGraph) {
  return engine.executeWorkflow(JSON.stringify(normalizeWorkflow(workflow)))
}

/**
 * 阶段 A 验证：最小验证集
 * 目标：验证 workflow engine 核心执行流程，不连接真实 API
 */

function createMockServiceRegistry(): ServiceNodeRegistry {
  return {
    call: vi.fn(async (serviceName: string, method: string, _args: unknown[]) => {
      // Mock MiniMax API responses
      if (serviceName === 'minimaxClient') {
        if (method === 'chatCompletion') {
          return {
            choices: [{ message: { content: 'Mock AI response' } }],
          }
        }
        if (method === 'imageGeneration') {
          return {
            data: [{ url: 'https://mock-url/image.png' }],
          }
        }
      }

      // Mock Database responses
      if (serviceName === 'db') {
        if (method === 'createMediaRecord') {
          return { id: 'mock-media-id', filename: 'test.png' }
        }
      }

      // Mock Capacity responses
      if (serviceName === 'capacityChecker') {
        if (method === 'hasCapacity') {
          return true
        }
      }

      throw new Error(`Unknown service/method: ${serviceName}.${method}`)
    }),
    get: vi.fn(),
    register: vi.fn(),
    getAllServices: vi.fn().mockReturnValue(['minimaxClient', 'db', 'capacityChecker']),
    getServiceMethods: vi.fn().mockReturnValue([]),
    getAvailableNodes: vi.fn().mockResolvedValue([]),
  } as unknown as ServiceNodeRegistry
}

describe('Workflow Engine - Stage A Verification', () => {
  let engine: WorkflowEngine
  let mockRegistry: ServiceNodeRegistry

  beforeEach(() => {
    mockRegistry = createMockServiceRegistry()
    engine = new WorkflowEngine(null, mockRegistry, undefined, createMockEventBus())
  })

  describe('A-1: Single Action Node', () => {
    it('should execute a single action node', async () => {
      const workflow: TestWorkflowGraph = {
        nodes: [
          {
            id: 'text-node',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Generate Text',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{ messages: [{ role: 'user', content: 'Hello' }] }],
              },
            },
          },
        ],
        edges: [],
      }

      const result = await executeTestWorkflow(engine, workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(1)
      expect(result.nodeResults.has('text-node')).toBe(true)

      const nodeResult = result.nodeResults.get('text-node')
      expect(nodeResult?.success).toBe(true)
      expect(nodeResult?.data).toMatchObject({
        choices: [{ message: { content: 'Mock AI response' } }],
      })
    })
  })

  describe('A-2: Action + Transform', () => {
    it('should pass data between nodes using template variables', async () => {
      const workflow: TestWorkflowGraph = {
        nodes: [
          {
            id: 'text-node',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Generate Text',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{ messages: [{ role: 'user', content: 'Hello' }] }],
              },
            },
          },
          {
            id: 'extract-node',
            type: WorkflowNodeType.Transform,
            data: {
              label: 'Extract Content',
              config: {
                transformType: 'extract',
                inputNode: 'text-node',
                inputPath: 'choices[0].message.content',
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'text-node', target: 'extract-node' }],
      }

      const result = await executeTestWorkflow(engine, workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(2)

      const extractResult = result.nodeResults.get('extract-node')
      expect(extractResult?.success).toBe(true)
      expect(extractResult?.data).toBe('Mock AI response')
    })
  })

  describe('A-3: Action + DB', () => {
    it('should call multiple services in sequence', async () => {
      const workflow: TestWorkflowGraph = {
        nodes: [
          {
            id: 'image-node',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{ prompt: 'A sunset' }],
              },
            },
          },
          {
            id: 'save-node',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Save to DB',
              config: {
                service: 'db',
                method: 'createMediaRecord',
                args: [
                  {
                    filename: '{{image-node.output.data[0].url}}',
                    type: 'image',
                  },
                ],
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'image-node', target: 'save-node' }],
      }

      const result = await executeTestWorkflow(engine, workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(2)

      const saveResult = result.nodeResults.get('save-node')
      expect(saveResult?.success).toBe(true)
      expect(saveResult?.data).toMatchObject({ id: 'mock-media-id' })

      // Verify template variable was resolved
      expect(mockRegistry.call).toHaveBeenCalledWith(
        'db',
        'createMediaRecord',
        expect.arrayContaining([
          expect.objectContaining({
            filename: 'https://mock-url/image.png',
          }),
        ])
      )
    })
  })

  describe('A-4: Capacity Check + Action', () => {
    it('should check capacity before action', async () => {
      const workflow: TestWorkflowGraph = {
        nodes: [
          {
            id: 'check-capacity',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Check Capacity',
              config: {
                service: 'capacityChecker',
                method: 'hasCapacity',
                args: ['image'],
              },
            },
          },
          {
            id: 'image-node',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{ prompt: 'A sunset' }],
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'check-capacity', target: 'image-node' }],
      }

      const result = await executeTestWorkflow(engine, workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(2)

      const capacityResult = result.nodeResults.get('check-capacity')
      expect(capacityResult?.success).toBe(true)
      expect(capacityResult?.data).toBe(true)
    })
  })

  describe('A-5: Complex DAG', () => {
    it('should execute nodes in correct topological order', async () => {
      const workflow: TestWorkflowGraph = {
        nodes: [
          {
            id: 'node-a',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Node A',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{ messages: [{ role: 'user', content: 'A' }] }],
              },
            },
          },
          {
            id: 'node-b',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Node B',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{ messages: [{ role: 'user', content: 'B' }] }],
              },
            },
          },
          {
            id: 'node-c',
            type: WorkflowNodeType.Action,
            data: {
              label: 'Node C',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{ messages: [{ role: 'user', content: 'C' }] }],
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'node-a', target: 'node-c' },
          { id: 'e2', source: 'node-b', target: 'node-c' },
        ],
      }

      const result = await executeTestWorkflow(engine, workflow)

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(3)

      // Node C depends on A and B, so it should execute last
      const callOrder = (mockRegistry.call as ReturnType<typeof vi.fn>).mock.calls
      const cCallIndex = callOrder.findIndex((call) => call[1] === 'chatCompletion' && (call[2] as any[])[0]?.messages?.[0]?.content === 'C')

      const aCallIndex = callOrder.findIndex((call) => call[1] === 'chatCompletion' && (call[2] as any[])[0]?.messages?.[0]?.content === 'A')
      const bCallIndex = callOrder.findIndex((call) => call[1] === 'chatCompletion' && (call[2] as any[])[0]?.messages?.[0]?.content === 'B')

      expect(cCallIndex).toBeGreaterThan(aCallIndex)
      expect(cCallIndex).toBeGreaterThan(bCallIndex)
    })
  })
})
