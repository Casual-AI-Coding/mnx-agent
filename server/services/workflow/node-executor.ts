import type { TaskResult, WorkflowNode } from './types.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { TaskExecutor } from '../queue-processor.js'
import {
  executeActionNode,
  executeConditionNode,
  executeLoopNode,
  executeTransformNode,
  executeQueueNode,
  executeDelayNode,
  executeErrorBoundaryNode,
  type ActionExecutorDeps,
  type ConditionExecutorDeps,
  type LoopExecutorDeps,
  type TransformExecutorDeps,
  type QueueExecutorDeps,
  type DelayExecutorDeps,
  type ErrorBoundaryExecutorDeps,
} from './executors/index.js'
import { resolveNodeConfig } from './template-resolver.js'

export interface NodeExecutorDeps {
  db: DatabaseService
  serviceRegistry: ServiceNodeRegistry
  taskExecutor: TaskExecutor | null
  executionLogId: string | null
  workflowId: string | null
  workflowNodes: WorkflowNode[]
  workflowEdges: { source: string; target: string; sourceHandle?: string }[]
  dryRun: boolean
  testData: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
}

export async function executeNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  deps: NodeExecutorDeps
): Promise<TaskResult> {
  const startTime = Date.now()
  const timeoutMs = (node.timeout as number) ?? (config.timeoutMs as number) ?? 300000
  const retryPolicy = node.retryPolicy

  const executeOnce = async (): Promise<TaskResult> => {
    try {
      let result: unknown

      const executionPromise = (async () => {
        switch (node.type) {
          case 'action':
            return await executeActionNode(node, config, {
              db: deps.db,
              serviceRegistry: deps.serviceRegistry,
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
              dryRun: deps.dryRun,
              testData: deps.testData,
            })
          case 'condition':
            return await executeConditionNode(node, config, nodeOutputs, {
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
            })
          case 'loop':
            return await executeLoopNode(node, config, nodeOutputs, {
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
              workflowNodes: deps.workflowNodes,
              workflowEdges: deps.workflowEdges,
              resolveNodeConfig,
              executeNode: (n, c, o) => executeNode(n, c, o, deps),
            })
          case 'transform':
            return await executeTransformNode(node, config, nodeOutputs, {
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
            })
          case 'queue':
            return await executeQueueNode(node, config, {
              db: deps.db,
              taskExecutor: deps.taskExecutor,
              serviceRegistry: deps.serviceRegistry,
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
            })
          case 'delay':
            return await executeDelayNode(node, config, {
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
            })
          case 'errorBoundary':
            return await executeErrorBoundaryNode(node, config, nodeOutputs, {
              executionLogId: deps.executionLogId,
              workflowId: deps.workflowId,
              workflowNodes: deps.workflowNodes,
              workflowEdges: deps.workflowEdges,
              resolveNodeConfig,
              executeNode: (n, c, o) => executeNode(n, c, o, deps),
            })
          default:
            throw new Error(`Unknown node type: ${node.type}`)
        }
      })()

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      result = await Promise.race([executionPromise, timeoutPromise])

      return {
        success: true,
        data: result,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        durationMs: Date.now() - startTime,
      }
    }
  }

  if (!retryPolicy) {
    return executeOnce()
  }

  let lastResult: TaskResult
  let attempt = 0
  const maxAttempts = retryPolicy.maxRetries + 1

  while (attempt < maxAttempts) {
    lastResult = await executeOnce()
    if (lastResult.success) {
      return lastResult
    }
    attempt++
    if (attempt < maxAttempts) {
      const backoffDelay = Math.pow(retryPolicy.backoffMultiplier, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, backoffDelay * 1000))
    }
  }

  return lastResult!
}
