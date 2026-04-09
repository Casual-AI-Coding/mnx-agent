import type { TaskResult, WorkflowNode, WorkflowEdge } from './types.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { ITaskExecutor } from '../../types/task.js'
import type { IEventBus } from '../interfaces/event-bus.interface.js'
import { 
  nodeExecutorRegistry, 
  executeNodeWithRegistry,
  type NodeExecutionContext 
} from './node-executor-registry.js'
import { resolveNodeConfig } from './template-resolver.js'

export { nodeExecutorRegistry, executeNodeWithRegistry }
export type { NodeExecutionContext }

export interface NodeExecutorDeps {
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

export async function executeNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  deps: NodeExecutorDeps
): Promise<TaskResult> {
  const startTime = Date.now()
  const timeoutMs = (node.timeout as number) ?? (config.timeoutMs as number) ?? 300000
  const retryPolicy = node.retryPolicy

  const context: NodeExecutionContext = {
    db: deps.db,
    serviceRegistry: deps.serviceRegistry,
    taskExecutor: deps.taskExecutor,
    executionLogId: deps.executionLogId,
    workflowId: deps.workflowId,
    workflowNodes: deps.workflowNodes,
    workflowEdges: deps.workflowEdges,
    dryRun: deps.dryRun,
    testData: deps.testData,
    eventBus: deps.eventBus,
  }

  const executeOnce = async (): Promise<TaskResult> => {
    try {
      const executor = nodeExecutorRegistry.get(node.type as any)
      if (!executor) {
        throw new Error(`Unknown node type: ${node.type}`)
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      const result = await Promise.race([
        executor(node, config, nodeOutputs, context),
        timeoutPromise,
      ])

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