import type { WorkflowNode, WorkflowEdge, TaskResult } from './types.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { ITaskExecutor } from '../../types/task.js'
import type { IEventBus } from '../interfaces/event-bus.interface.js'
import {
  executeActionNode,
  executeConditionNode,
  executeLoopNode,
  executeTransformNode,
  executeQueueNode,
  executeDelayNode,
  executeErrorBoundaryNode,
} from './executors/index.js'
import { resolveNodeConfig } from './template-resolver.js'

export type NodeType = 'action' | 'condition' | 'loop' | 'transform' | 'queue' | 'delay' | 'errorBoundary'

export interface NodeExecutionContext {
  db: DatabaseService
  serviceRegistry: ServiceNodeRegistry
  taskExecutor: ITaskExecutor | null
  executionLogId: string | null
  workflowId: string | null
  workflowNodes: WorkflowNode[]
  workflowEdges: WorkflowEdge[]
  dryRun: boolean
  testData: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
  eventBus: IEventBus
}

export interface NodeExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  durationMs: number
}

export type NodeExecutorFunction = (
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  context: NodeExecutionContext
) => Promise<unknown>

class NodeExecutorRegistry {
  private executors: Map<NodeType, NodeExecutorFunction> = new Map()

  register(type: NodeType, executor: NodeExecutorFunction): void {
    this.executors.set(type, executor)
  }

  get(type: NodeType): NodeExecutorFunction | undefined {
    return this.executors.get(type)
  }

  has(type: NodeType): boolean {
    return this.executors.has(type)
  }

  getRegisteredTypes(): NodeType[] {
    return Array.from(this.executors.keys())
  }
}

export const nodeExecutorRegistry = new NodeExecutorRegistry()

nodeExecutorRegistry.register('action', async (node, config, nodeOutputs, context) => {
  return executeActionNode(node, config, {
    db: context.db,
    serviceRegistry: context.serviceRegistry,
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    dryRun: context.dryRun,
    testData: context.testData,
    eventBus: context.eventBus,
  })
})

nodeExecutorRegistry.register('condition', async (node, config, nodeOutputs, context) => {
  return executeConditionNode(node, config, nodeOutputs, {
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    eventBus: context.eventBus,
  })
})

nodeExecutorRegistry.register('loop', async (node, config, nodeOutputs, context) => {
  const wrappedExecuteNode = async (n: WorkflowNode, c: Record<string, unknown>, o: Map<string, unknown>) => {
    const result = await executeNodeWithRegistry(n, c, o, context)
    return {
      success: true,
      data: result,
      durationMs: 0,
    }
  }
  return executeLoopNode(node, config, nodeOutputs, {
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    workflowNodes: context.workflowNodes,
    workflowEdges: context.workflowEdges,
    resolveNodeConfig,
    executeNode: wrappedExecuteNode as any,
    eventBus: context.eventBus,
  })
})

nodeExecutorRegistry.register('transform', async (node, config, nodeOutputs, context) => {
  return executeTransformNode(node, config, nodeOutputs, {
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    eventBus: context.eventBus,
  })
})

nodeExecutorRegistry.register('queue', async (node, config, nodeOutputs, context) => {
  return executeQueueNode(node, config, {
    db: context.db,
    taskExecutor: context.taskExecutor,
    serviceRegistry: context.serviceRegistry,
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    eventBus: context.eventBus,
  })
})

nodeExecutorRegistry.register('delay', async (node, config, nodeOutputs, context) => {
  return executeDelayNode(node, config, {
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    eventBus: context.eventBus,
  })
})

nodeExecutorRegistry.register('errorBoundary', async (node, config, nodeOutputs, context) => {
  const wrappedExecuteNode = async (n: WorkflowNode, c: Record<string, unknown>, o: Map<string, unknown>) => {
    const result = await executeNodeWithRegistry(n, c, o, context)
    return {
      success: true,
      data: result,
      durationMs: 0,
    }
  }
  return executeErrorBoundaryNode(node, config, nodeOutputs, {
    executionLogId: context.executionLogId,
    workflowId: context.workflowId,
    workflowNodes: context.workflowNodes,
    workflowEdges: context.workflowEdges,
    resolveNodeConfig,
    executeNode: wrappedExecuteNode as any,
    eventBus: context.eventBus,
  })
})

async function executeNodeWithRegistry(
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  context: NodeExecutionContext
): Promise<unknown> {
  const executor = nodeExecutorRegistry.get(node.type as NodeType)
  if (!executor) {
    throw new Error(`Unknown node type: ${node.type}`)
  }
  return executor(node, config, nodeOutputs, context)
}

export { executeNodeWithRegistry as executeNodeWithRegistry }