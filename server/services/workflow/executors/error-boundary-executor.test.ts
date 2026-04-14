import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  executeErrorBoundaryNode,
  findErrorBoundarySuccessNodes,
  type ErrorBoundaryExecutorDeps,
} from './error-boundary-executor.js'
import type { WorkflowNode, WorkflowEdge } from '../types.js'
import type { TaskResult } from '../../../types/task.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { WorkflowNodeType } from '../../../types/workflow.js'

// Helper to create a mock WorkflowNode
function createMockNode(
  id: string,
  type: WorkflowNodeType = WorkflowNodeType.Action,
  config: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      label: `Node ${id}`,
      config,
    },
  }
}

// Helper to create a mock WorkflowEdge
function createMockEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string
): WorkflowEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
  }
}

// Helper to create mock event bus with tracking
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

describe('executeErrorBoundaryNode', () => {
  beforeEach(() => {
    eventBus = createTrackingMockEventBus()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('successful execution of protected nodes', () => {
    it('should execute all protected nodes successfully and return success', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode1 = createMockNode('protected-1', WorkflowNodeType.Action, { service: 'test', method: 'method1' })
      const protectedNode2 = createMockNode('protected-2', WorkflowNodeType.Action, { service: 'test', method: 'method2' })

      const nodes = [errorBoundaryNode, protectedNode1, protectedNode2]
      const edges = [
        createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
        createMockEdge('e2', 'protected-1', 'protected-2'),
      ]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockImplementation(async (node: WorkflowNode) => {
        return {
          success: true,
          data: { result: `result-${node.id}` },
          durationMs: 100,
        } as TaskResult
      })

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(true)
      expect(executeNode).toHaveBeenCalledTimes(2)
      expect(executeNode).toHaveBeenCalledWith(protectedNode1, {}, nodeOutputs)
      expect(executeNode).toHaveBeenCalledWith(protectedNode2, {}, nodeOutputs)
      
      // Check node outputs were set
      expect(nodeOutputs.get('protected-1')).toEqual({ result: 'result-protected-1' })
      expect(nodeOutputs.get('protected-2')).toEqual({ result: 'result-protected-2' })
      
      // Check event bus calls
      expect(eventBus.startCalls).toHaveLength(1)
      expect(eventBus.startCalls[0]).toEqual({
        nodeId: 'error-boundary',
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
      })
      expect(eventBus.completeCalls).toHaveLength(1)
      expect(eventBus.completeCalls[0].nodeId).toBe('error-boundary')
      expect(eventBus.completeCalls[0].result).toEqual({ success: true })
    })

    it('should only emit events when executionLogId is provided', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode = createMockNode('protected-1', WorkflowNodeType.Action, {})

      const nodes = [errorBoundaryNode, protectedNode]
      const edges = [createMockEdge('e1', 'error-boundary', 'protected-1', 'success')]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockResolvedValue({ success: true, data: 'data', durationMs: 100 } as TaskResult)

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: null, // No execution log ID
        workflowId: null,
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(true)
      expect(eventBus.startCalls).toHaveLength(0)
      expect(eventBus.completeCalls).toHaveLength(0)
      expect(eventBus.errorCalls).toHaveLength(0)
    })
  })

  describe('when protected node fails', () => {
    it('should return error when a protected node fails', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode1 = createMockNode('protected-1', WorkflowNodeType.Action, {})
      const protectedNode2 = createMockNode('protected-2', WorkflowNodeType.Action, {})

      const nodes = [errorBoundaryNode, protectedNode1, protectedNode2]
      const edges = [
        createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
        createMockEdge('e2', 'protected-1', 'protected-2'),
      ]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockImplementation(async (node: WorkflowNode) => {
        if (node.id === 'protected-1') {
          return { success: false, error: 'Node failed', durationMs: 100 } as TaskResult
        }
        return { success: true, data: 'data', durationMs: 100 } as TaskResult
      })

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Node failed')
      
      // Should stop executing after first failure
      expect(executeNode).toHaveBeenCalledTimes(1)
      expect(executeNode).toHaveBeenCalledWith(protectedNode1, {}, nodeOutputs)
      
      // Check node output was set
      expect(nodeOutputs.get('error-boundary')).toEqual({
        success: false,
        error: { message: 'Node failed' },
      })
      
      // Check event bus calls
      expect(eventBus.completeCalls).toHaveLength(1)
      expect(eventBus.completeCalls[0].result).toEqual({
        success: false,
        error: { message: 'Node failed' },
      })
    })

    it('should handle unknown error message', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode = createMockNode('protected-1', WorkflowNodeType.Action, {})

      const nodes = [errorBoundaryNode, protectedNode]
      const edges = [createMockEdge('e1', 'error-boundary', 'protected-1', 'success')]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockResolvedValue({ success: false, error: undefined, durationMs: 100 } as TaskResult)

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Unknown error')
    })
  })

  describe('with no success nodes (empty protection)', () => {
    it('should return success when there are no protected nodes', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const nodes = [errorBoundaryNode]
      const edges: WorkflowEdge[] = []

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn()

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(true)
      expect(executeNode).not.toHaveBeenCalled()
      
      // Check event bus calls
      expect(eventBus.completeCalls).toHaveLength(1)
      expect(eventBus.completeCalls[0].result).toEqual({
        success: true,
        message: 'No nodes to protect',
      })
    })

    it('should not protect nodes connected via error handle', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const errorHandlerNode = createMockNode('error-handler', WorkflowNodeType.Action, {})
      const protectedNode = createMockNode('protected-1', WorkflowNodeType.Action, {})

      const nodes = [errorBoundaryNode, errorHandlerNode, protectedNode]
      const edges = [
        createMockEdge('e1', 'error-boundary', 'error-handler', 'error'), // Error handle, should not be protected
        createMockEdge('e2', 'error-boundary', 'protected-1', 'success'), // Success handle, should be protected
      ]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockResolvedValue({ success: true, data: 'data', durationMs: 100 } as TaskResult)

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(true)
      expect(executeNode).toHaveBeenCalledTimes(1)
      expect(executeNode).toHaveBeenCalledWith(protectedNode, {}, nodeOutputs)
      expect(executeNode).not.toHaveBeenCalledWith(errorHandlerNode, {}, nodeOutputs)
    })
  })

  describe('exception propagation', () => {
    it('should catch exceptions and return error with stack trace', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode = createMockNode('protected-1', WorkflowNodeType.Action, {})

      const nodes = [errorBoundaryNode, protectedNode]
      const edges = [createMockEdge('e1', 'error-boundary', 'protected-1', 'success')]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const testError = new Error('Test exception')
      const executeNode = vi.fn().mockRejectedValue(testError)

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Test exception')
      expect(result.error?.stack).toBe(testError.stack)
      
      // Check node output was set
      expect(nodeOutputs.get('error-boundary')).toEqual({
        success: false,
        error: {
          message: 'Test exception',
          stack: testError.stack,
        },
      })
      
      // Check event bus calls
      expect(eventBus.errorCalls).toHaveLength(1)
      expect(eventBus.errorCalls[0]).toEqual({
        nodeId: 'error-boundary',
        executionLogId: 'log-123',
        error: 'Test exception',
      })
    })

    it('should not emit error event when executionLogId is null', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode = createMockNode('protected-1', WorkflowNodeType.Action, {})

      const nodes = [errorBoundaryNode, protectedNode]
      const edges = [createMockEdge('e1', 'error-boundary', 'protected-1', 'success')]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockRejectedValue(new Error('Test exception'))

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: null,
        workflowId: null,
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(result.success).toBe(false)
      expect(eventBus.errorCalls).toHaveLength(0)
    })
  })

  describe('resolveNodeConfig usage', () => {
    it('should pass resolved config to executeNode', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      const protectedNode = createMockNode('protected-1', WorkflowNodeType.Action, {
        service: 'test',
        method: 'method',
        input: '{{node-1.output}}',
      })

      const nodes = [errorBoundaryNode, protectedNode]
      const edges = [createMockEdge('e1', 'error-boundary', 'protected-1', 'success')]

      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('node-1', { output: 'resolved-value' })

      const resolveNodeConfig = vi.fn().mockImplementation((config) => ({
        ...config,
        input: 'resolved-value',
      }))
      const executeNode = vi.fn().mockResolvedValue({ success: true, data: 'data', durationMs: 100 } as TaskResult)

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      expect(resolveNodeConfig).toHaveBeenCalledWith(protectedNode.data.config, nodeOutputs)
      expect(executeNode).toHaveBeenCalledWith(protectedNode, { service: 'test', method: 'method', input: 'resolved-value' }, nodeOutputs)
    })
  })

  describe('node not found in workflowNodes', () => {
    it('should skip nodes that are not found in workflowNodes', async () => {
      const errorBoundaryNode = createMockNode('error-boundary', WorkflowNodeType.ErrorBoundary, {})
      // protectedNode is in edges but NOT in nodes array
      const nodes = [errorBoundaryNode]
      const edges = [createMockEdge('e1', 'error-boundary', 'protected-1', 'success')]

      const nodeOutputs = new Map<string, unknown>()
      const resolveNodeConfig = vi.fn().mockReturnValue({})
      const executeNode = vi.fn().mockResolvedValue({ success: true, data: 'data', durationMs: 100 } as TaskResult)

      const deps: ErrorBoundaryExecutorDeps = {
        executionLogId: 'log-123',
        workflowId: 'workflow-456',
        workflowNodes: nodes,
        workflowEdges: edges,
        resolveNodeConfig,
        executeNode,
        eventBus,
      }

      const result = await executeErrorBoundaryNode(errorBoundaryNode, {}, nodeOutputs, deps)

      // Should succeed because it skipped the missing node
      expect(result.success).toBe(true)
      expect(executeNode).not.toHaveBeenCalled()
    })
  })
})

describe('findErrorBoundarySuccessNodes', () => {
  it('should find direct success nodes connected via success handle', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
      createMockEdge('e2', 'error-boundary', 'error-handler', 'error'),
      createMockEdge('e3', 'other-node', 'other-target', 'success'),
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toContain('protected-1')
    expect(result).not.toContain('error-handler')
    expect(result).not.toContain('other-target')
  })

  it('should find downstream nodes via BFS', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
      createMockEdge('e2', 'protected-1', 'protected-2'),
      createMockEdge('e3', 'protected-2', 'protected-3'),
      createMockEdge('e4', 'protected-1', 'protected-4'),
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toContain('protected-1')
    expect(result).toContain('protected-2')
    expect(result).toContain('protected-3')
    expect(result).toContain('protected-4')
    expect(result).toHaveLength(4)
  })

  it('should not follow error handle edges downstream', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
      createMockEdge('e2', 'protected-1', 'protected-2'),
      createMockEdge('e3', 'protected-2', 'error-handler', 'error'), // Error handle from downstream
      createMockEdge('e4', 'error-handler', 'final-handler'),
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toContain('protected-1')
    expect(result).toContain('protected-2')
    expect(result).not.toContain('error-handler')
    expect(result).not.toContain('final-handler')
  })

  it('should deduplicate nodes in result', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
      createMockEdge('e2', 'protected-1', 'protected-2'),
      createMockEdge('e3', 'protected-1', 'protected-2'), // Duplicate edge
      createMockEdge('e4', 'error-boundary', 'protected-1', 'success'), // Duplicate success handle
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    // Should deduplicate
    expect(result.filter((id) => id === 'protected-1')).toHaveLength(1)
    expect(result.filter((id) => id === 'protected-2')).toHaveLength(1)
    expect(result).toHaveLength(2)
  })

  it('should handle circular connections without infinite loop', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
      createMockEdge('e2', 'protected-1', 'protected-2'),
      createMockEdge('e3', 'protected-2', 'protected-1'), // Circular
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toContain('protected-1')
    expect(result).toContain('protected-2')
    expect(result).toHaveLength(2)
  })

  it('should return empty array when no success nodes exist', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'error-handler', 'error'),
      createMockEdge('e2', 'other-node', 'other-target', 'success'),
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toHaveLength(0)
  })

  it('should handle edges without sourceHandle', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'protected-1', 'success'),
      createMockEdge('e2', 'protected-1', 'protected-2'), // No sourceHandle
      createMockEdge('e3', 'protected-2', 'protected-3', undefined),
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toContain('protected-1')
    expect(result).toContain('protected-2')
    expect(result).toContain('protected-3')
  })

  it('should handle complex multi-branch downstream', () => {
    const edges = [
      createMockEdge('e1', 'error-boundary', 'node-a', 'success'),
      createMockEdge('e2', 'error-boundary', 'node-b', 'success'),
      createMockEdge('e3', 'node-a', 'node-a1'),
      createMockEdge('e4', 'node-a', 'node-a2'),
      createMockEdge('e5', 'node-b', 'node-b1'),
      createMockEdge('e6', 'node-a1', 'node-final'),
      createMockEdge('e7', 'node-b1', 'node-final'),
    ]

    const result = findErrorBoundarySuccessNodes('error-boundary', [], edges)

    expect(result).toContain('node-a')
    expect(result).toContain('node-b')
    expect(result).toContain('node-a1')
    expect(result).toContain('node-a2')
    expect(result).toContain('node-b1')
    expect(result).toContain('node-final')
    expect(result).toHaveLength(6)
  })
})