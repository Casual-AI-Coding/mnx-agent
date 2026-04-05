import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { TaskExecutor } from '../queue-processor.js'
import type { WorkflowResult, TaskResult, TestExecutionOptions, WorkflowNode, WorkflowEdge } from './types.js'
import { getExecutionStateManager } from '../execution-state-manager.js'
import { parseWorkflowJson, validateWorkflow } from './parser.js'
import { buildExecutionLayers } from './topological-sort.js'
import { resolveNodeConfig } from './template-resolver.js'
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

export { parseWorkflowJson, validateWorkflow } from './parser.js'
export { buildExecutionLayers, buildExecutionOrder } from './topological-sort.js'
export { resolveNodeConfig, resolveValue, resolveTemplateString, getValueAtPath } from './template-resolver.js'

export class WorkflowEngine {
  private db: DatabaseService
  private serviceRegistry: ServiceNodeRegistry
  private taskExecutor: TaskExecutor | null = null
  private executionLogId: string | null = null
  private workflowId: string | null = null
  private workflowNodes: WorkflowNode[] = []
  private workflowEdges: WorkflowEdge[] = []
  private pauseSignals = new Map<string, AbortController>()
  private static runningExecutions = new Map<string, WorkflowEngine>()
  private testData: Record<string, { mockResponse?: unknown; mockInput?: unknown }> = {}
  private dryRun: boolean = false

  private static setRunningExecution(executionId: string, engine: WorkflowEngine): void {
    this.runningExecutions.set(executionId, engine)
  }

  private static removeRunningExecution(executionId: string): void {
    this.runningExecutions.delete(executionId)
  }

  static getRunningExecutionEngine(executionId: string): WorkflowEngine | undefined {
    return this.runningExecutions.get(executionId)
  }

  constructor(db: DatabaseService, serviceRegistry: ServiceNodeRegistry, taskExecutor?: TaskExecutor) {
    this.db = db
    this.serviceRegistry = serviceRegistry
    this.taskExecutor = taskExecutor || null
  }

  async executeWorkflow(
    workflowJson: string,
    executionLogId?: string,
    taskExecutor?: TaskExecutor,
    options?: TestExecutionOptions
  ): Promise<WorkflowResult> {
    const startTime = Date.now()
    const nodeResults = new Map<string, TaskResult>()
    let executionError: string | undefined

    this.taskExecutor = taskExecutor || this.taskExecutor
    this.executionLogId = executionLogId || null
    this.testData = options?.testData || {}
    this.dryRun = options?.dryRun || false

    const supportsStatePersistence = typeof (this.db as unknown as { run?: unknown }).run === 'function'
    const stateManager = supportsStatePersistence ? getExecutionStateManager(this.db) : null
    let executionStateId: string | null = null
    let abortController: AbortController | null = null

    try {
      const workflow = parseWorkflowJson(workflowJson)
      validateWorkflow(workflow)
      this.workflowNodes = workflow.nodes
      this.workflowEdges = workflow.edges || []
      this.workflowId = (workflow as unknown as { id?: string }).id || null

      if (stateManager) {
        const executionState = await stateManager.create({
          execution_log_id: executionLogId || `exec_${Date.now()}`,
          workflow_id: this.workflowId || 'unknown',
          status: 'running',
        })
        if (!executionState.id) throw new Error('Failed to create execution state')
        executionStateId = executionState.id
        abortController = new AbortController()
        this.pauseSignals.set(executionStateId, abortController)
        WorkflowEngine.setRunningExecution(executionStateId, this)
      }

      const executionLayers = buildExecutionLayers(workflow)
      const nodeOutputs = new Map<string, unknown>()
      const excludedNodes = new Set<string>()

      this.addLoopBodyNodesToExcluded(excludedNodes)
      this.addErrorBoundarySuccessNodesToExcluded(excludedNodes)

      const conditionResults = new Map<string, boolean>()
      const errorBoundaryErrors = new Map<string, { message: string; stack?: string }>()

      for (let layerIndex = 0; layerIndex < executionLayers.length; layerIndex++) {
        if (abortController?.signal.aborted) {
          await stateManager?.pause(executionStateId!)
          throw new Error(`Execution ${executionStateId} paused at layer ${layerIndex}`)
        }

        await stateManager?.update(executionStateId!, { current_layer: layerIndex })

        const layer = executionLayers[layerIndex]
        const nodesInLayer = layer.filter((nodeId) => !excludedNodes.has(nodeId))

        if (nodesInLayer.length === 0) continue

        const layerResults = await Promise.all(
          nodesInLayer.map(async (nodeId) => {
            const node = workflow.nodes.find((n) => n.id === nodeId)
            if (!node) {
              return {
                nodeId,
                result: { success: false, error: `Node ${nodeId} not found`, durationMs: 0 } as TaskResult,
              }
            }
            const resolvedConfig = resolveNodeConfig(node.data.config, nodeOutputs)
            const result = await this.executeNode(node, resolvedConfig, nodeOutputs)
            return { nodeId, result }
          })
        )

        for (const { nodeId, result } of layerResults) {
          nodeResults.set(nodeId, result)

          if (result.success && result.data !== undefined) {
            nodeOutputs.set(nodeId, result.data)

            const node = workflow.nodes.find((n) => n.id === nodeId)
            if (node?.type === 'condition') {
              const conditionResult = result.data as boolean
              conditionResults.set(nodeId, conditionResult)
              this.updateExcludedNodes(nodeId, conditionResult, workflow.edges, excludedNodes)
            }

            if (node?.type === 'errorBoundary') {
              const boundaryResult = result.data as {
                success: boolean
                error?: { message: string; stack?: string }
              }
              if (!boundaryResult.success && boundaryResult.error) {
                errorBoundaryErrors.set(nodeId, boundaryResult.error)
                this.queueErrorBoundaryErrorNodes(nodeId, excludedNodes)
              }
            }
          }

          if (!result.success && !executionError) {
            const node = workflow.nodes.find((n) => n.id === nodeId)
            if (node?.type !== 'errorBoundary') {
              executionError = `Node ${nodeId} failed: ${result.error}`
            }
          }
        }

        if (executionError) break
      }

      if (executionStateId && stateManager) {
        if (executionError) {
          await stateManager.fail(executionStateId)
        } else {
          await stateManager.complete(executionStateId)
        }
      }
    } catch (error) {
      executionError = (error as Error).message
      if (executionError && !executionError.includes('paused')) {
        if (executionStateId && stateManager) {
          await stateManager.fail(executionStateId)
        }
      }
    } finally {
      if (executionStateId) {
        this.pauseSignals.delete(executionStateId)
        WorkflowEngine.removeRunningExecution(executionStateId)
      }
    }

    return {
      success: !executionError,
      nodeResults,
      totalDurationMs: Date.now() - startTime,
      error: executionError,
    }
  }

  async pauseExecution(executionId: string): Promise<void> {
    const controller = this.pauseSignals.get(executionId)
    if (controller) {
      controller.abort()
    } else {
      throw new Error(`Execution ${executionId} not found or not running`)
    }
  }

  async resumeExecution(executionId: string): Promise<void> {
    const supportsStatePersistence = typeof (this.db as unknown as { run?: unknown }).run === 'function'
    if (!supportsStatePersistence) {
      throw new Error('Execution state persistence is not supported')
    }

    const stateManager = getExecutionStateManager(this.db)
    const state = await stateManager.getById(executionId)

    if (!state || state.status !== 'paused') {
      throw new Error(`Execution ${executionId} not found or not paused`)
    }

    await stateManager.resume(executionId)

    const controller = this.pauseSignals.get(executionId)
    if (controller) {
      const newController = new AbortController()
      this.pauseSignals.set(executionId, newController)
    }
  }

  private updateExcludedNodes(
    conditionNodeId: string,
    conditionResult: boolean,
    edges: WorkflowEdge[],
    excludedNodes: Set<string>
  ): void {
    const targetHandle = conditionResult ? 'false' : 'true'

    for (const edge of edges) {
      if (edge.source !== conditionNodeId) continue

      if (edge.sourceHandle === targetHandle) {
        this.excludeBranchNodes(edge.target, edges, excludedNodes)
      }
    }
  }

  private excludeBranchNodes(startNodeId: string, edges: WorkflowEdge[], excludedNodes: Set<string>): void {
    const toExclude = new Set<string>([startNodeId])
    const queue = [startNodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!

      for (const edge of edges) {
        if (edge.source === currentId && !toExclude.has(edge.target)) {
          toExclude.add(edge.target)
          queue.push(edge.target)
        }
      }
    }

    for (const nodeId of toExclude) {
      excludedNodes.add(nodeId)
    }
  }

  private addLoopBodyNodesToExcluded(excludedNodes: Set<string>): void {
    for (const edge of this.workflowEdges) {
      if (edge.sourceHandle === 'body') {
        this.excludeBranchNodes(edge.target, this.workflowEdges, excludedNodes)
      }
    }
  }

  private addErrorBoundarySuccessNodesToExcluded(excludedNodes: Set<string>): void {
    for (const edge of this.workflowEdges) {
      if (edge.sourceHandle === 'success') {
        const sourceNode = this.workflowNodes.find((n) => n.id === edge.source)
        if (sourceNode?.type === 'errorBoundary') {
          this.excludeBranchNodes(edge.target, this.workflowEdges, excludedNodes)
        }
      }
    }
  }

  private queueErrorBoundaryErrorNodes(errorBoundaryNodeId: string, excludedNodes: Set<string>): void {
    for (const edge of this.workflowEdges) {
      if (edge.source === errorBoundaryNodeId && edge.sourceHandle === 'error') {
        excludedNodes.delete(edge.target)
        for (const downstreamEdge of this.workflowEdges) {
          if (downstreamEdge.source === edge.target) {
            excludedNodes.delete(downstreamEdge.target)
          }
        }
      }
    }
  }

  private async executeNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
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
              return await this.executeActionNode(node, config)
            case 'condition':
              return await this.executeConditionNode(node, config, nodeOutputs)
            case 'loop':
              return await this.executeLoopNode(node, config, nodeOutputs)
            case 'transform':
              return await this.executeTransformNode(node, config, nodeOutputs)
            case 'queue':
              return await this.executeQueueNode(node, config)
            case 'delay':
              return await this.executeDelayNode(node, config)
            case 'errorBoundary':
              return await this.executeErrorBoundaryNode(node, config, nodeOutputs)
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

  private async executeActionNode(node: WorkflowNode, config: Record<string, unknown>): Promise<unknown> {
    const deps: ActionExecutorDeps = {
      db: this.db,
      serviceRegistry: this.serviceRegistry,
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
      dryRun: this.dryRun,
      testData: this.testData,
    }
    return executeActionNode(node, config, deps)
  }

  private async executeConditionNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<boolean> {
    const deps: ConditionExecutorDeps = {
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
    }
    return executeConditionNode(node, config, nodeOutputs, deps)
  }

  private async executeLoopNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<unknown> {
    const deps: LoopExecutorDeps = {
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
      workflowNodes: this.workflowNodes,
      workflowEdges: this.workflowEdges,
      resolveNodeConfig,
      executeNode: this.executeNode.bind(this),
    }
    return executeLoopNode(node, config, nodeOutputs, deps)
  }

  private async executeTransformNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<unknown> {
    const deps: TransformExecutorDeps = {
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
    }
    return executeTransformNode(node, config, nodeOutputs, deps)
  }

  private async executeQueueNode(node: WorkflowNode, config: Record<string, unknown>): Promise<unknown> {
    const deps: QueueExecutorDeps = {
      db: this.db,
      taskExecutor: this.taskExecutor,
      serviceRegistry: this.serviceRegistry,
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
    }
    return executeQueueNode(node, config, deps)
  }

  private async executeDelayNode(node: WorkflowNode, config: Record<string, unknown>): Promise<unknown> {
    const deps: DelayExecutorDeps = {
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
    }
    return executeDelayNode(node, config, deps)
  }

  private async executeErrorBoundaryNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<unknown> {
    const deps: ErrorBoundaryExecutorDeps = {
      executionLogId: this.executionLogId,
      workflowId: this.workflowId,
      workflowNodes: this.workflowNodes,
      workflowEdges: this.workflowEdges,
      resolveNodeConfig,
      executeNode: this.executeNode.bind(this),
    }
    return executeErrorBoundaryNode(node, config, nodeOutputs, deps)
  }
}
