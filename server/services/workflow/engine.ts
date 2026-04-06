import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodeRegistry } from '../service-node-registry.js'
import type { ITaskExecutor } from '../../types/task.js'
import type { WorkflowResult, TaskResult, TestExecutionOptions, WorkflowNode, WorkflowEdge } from './types.js'
import { ExecutionStateManager } from '../execution-state-manager.js'
import { parseWorkflowJson, validateWorkflow } from './parser.js'
import { buildExecutionLayers } from './topological-sort.js'
import { resolveNodeConfig } from './template-resolver.js'
import { executeNode, type NodeExecutorDeps } from './node-executor.js'
import {
  updateExcludedNodes,
  addLoopBodyNodesToExcluded,
  addErrorBoundarySuccessNodesToExcluded,
  queueErrorBoundaryErrorNodes,
} from './exclusion-utils.js'

export { parseWorkflowJson, validateWorkflow } from './parser.js'
export { buildExecutionLayers, buildExecutionOrder } from './topological-sort.js'
export { resolveNodeConfig, resolveValue, resolveTemplateString, getValueAtPath } from './template-resolver.js'

export class WorkflowEngine {
  private db: DatabaseService
  private serviceRegistry: ServiceNodeRegistry
  private taskExecutor: ITaskExecutor | null = null
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

  constructor(db: DatabaseService, serviceRegistry: ServiceNodeRegistry, taskExecutor?: ITaskExecutor) {
    this.db = db
    this.serviceRegistry = serviceRegistry
    this.taskExecutor = taskExecutor || null
  }

  async executeWorkflow(
    workflowJson: string,
    executionLogId?: string,
    taskExecutor?: ITaskExecutor,
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
    const stateManager = supportsStatePersistence ? new ExecutionStateManager(this.db) : null
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
        const stateId = executionState.id
        executionStateId = stateId
        abortController = new AbortController()
        this.pauseSignals.set(stateId, abortController)
        WorkflowEngine.setRunningExecution(stateId, this)
      }

      const executionLayers = buildExecutionLayers(workflow)
      const nodeOutputs = new Map<string, unknown>()
      const excludedNodes = new Set<string>()

      addLoopBodyNodesToExcluded(this.workflowNodes, this.workflowEdges, excludedNodes)
      addErrorBoundarySuccessNodesToExcluded(this.workflowNodes, this.workflowEdges, excludedNodes)

      for (let layerIndex = 0; layerIndex < executionLayers.length; layerIndex++) {
        if (abortController?.signal.aborted) {
          await stateManager?.pause(executionStateId!)
          throw new Error(`Execution ${executionStateId} paused at layer ${layerIndex}`)
        }

        await stateManager?.update(executionStateId!, { current_layer: layerIndex })

        const layer = executionLayers[layerIndex]
        const nodesInLayer = layer.filter((nodeId) => !excludedNodes.has(nodeId))

        if (nodesInLayer.length === 0) continue

        const nodeExecutorDeps: NodeExecutorDeps = {
          db: this.db,
          serviceRegistry: this.serviceRegistry,
          taskExecutor: this.taskExecutor,
          executionLogId: this.executionLogId,
          workflowId: this.workflowId,
          workflowNodes: this.workflowNodes,
          workflowEdges: this.workflowEdges,
          dryRun: this.dryRun,
          testData: this.testData,
        }

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
            const result = await executeNode(node, resolvedConfig, nodeOutputs, nodeExecutorDeps)
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
              updateExcludedNodes(nodeId, conditionResult, workflow.edges, excludedNodes)
            }

            if (node?.type === 'errorBoundary') {
              const boundaryResult = result.data as {
                success: boolean
                error?: { message: string; stack?: string }
              }
              if (!boundaryResult.success && boundaryResult.error) {
                queueErrorBoundaryErrorNodes(nodeId, this.workflowEdges, excludedNodes)
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

    const stateManager = new ExecutionStateManager(this.db)
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
}
