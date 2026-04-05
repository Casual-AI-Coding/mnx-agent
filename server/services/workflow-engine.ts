import type { DatabaseService } from '../database/service-async.js'
import type { ServiceNodeRegistry } from './service-node-registry.js'
import { WorkflowNodeType } from '../types/workflow.js'
import type { TaskExecutor } from './queue-processor.js'
import { cronEvents } from './websocket-service.js'
import { getExecutionStateManager } from './execution-state-manager.js'

export interface TaskResult {
  success: boolean
  data?: unknown
  error?: string
  durationMs: number
}

export interface WorkflowResult {
  success: boolean
  nodeResults: Map<string, TaskResult>
  totalDurationMs: number
  error?: string
}

export interface RetryPolicy {
  maxRetries: number
  backoffMultiplier: number
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  data: {
    label: string
    config: Record<string, unknown>
  }
  position?: { x: number; y: number }
  timeout?: number
  retryPolicy?: RetryPolicy
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface TestExecutionOptions {
  testData?: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
  dryRun?: boolean
}

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

    // Check if database supports execution state persistence
    const supportsStatePersistence = typeof (this.db as unknown as { run?: unknown }).run === 'function'
    const stateManager = supportsStatePersistence ? getExecutionStateManager(this.db) : null
    let executionStateId: string | null = null
    let abortController: AbortController | null = null

    try {
      const workflow = this.parseWorkflowJson(workflowJson)
      this.validateWorkflow(workflow)
      this.workflowNodes = workflow.nodes
      this.workflowEdges = workflow.edges || []
      this.workflowId = (workflow as unknown as { id?: string }).id || null

      if (stateManager) {
        const executionState = await stateManager.create({
          execution_log_id: executionLogId || `exec_${Date.now()}`,
          workflow_id: this.workflowId || 'unknown',
          status: 'running',
        })
        executionStateId = executionState.id
        abortController = new AbortController()
        this.pauseSignals.set(executionStateId, abortController)
        WorkflowEngine.setRunningExecution(executionStateId, this)
      }

      const executionLayers = this.buildExecutionLayers(workflow)
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
        const nodesInLayer = layer.filter(nodeId => !excludedNodes.has(nodeId))
        
        if (nodesInLayer.length === 0) continue

        const layerResults = await Promise.all(
          nodesInLayer.map(async (nodeId) => {
            const node = workflow.nodes.find(n => n.id === nodeId)
            if (!node) {
              return { nodeId, result: { success: false, error: `Node ${nodeId} not found`, durationMs: 0 } as TaskResult }
            }
            const resolvedConfig = this.resolveNodeConfig(node.data.config, nodeOutputs)
            const result = await this.executeNode(node, resolvedConfig, nodeOutputs)
            return { nodeId, result }
          })
        )

        for (const { nodeId, result } of layerResults) {
          nodeResults.set(nodeId, result)

          if (result.success && result.data !== undefined) {
            nodeOutputs.set(nodeId, result.data)

            const node = workflow.nodes.find(n => n.id === nodeId)
            if (node?.type === 'condition') {
              const conditionResult = result.data as boolean
              conditionResults.set(nodeId, conditionResult)
              this.updateExcludedNodes(
                nodeId,
                conditionResult,
                workflow.edges,
                excludedNodes
              )
            }
            
            if (node?.type === 'errorBoundary') {
              const boundaryResult = result.data as { success: boolean; error?: { message: string; stack?: string } }
              if (!boundaryResult.success && boundaryResult.error) {
                errorBoundaryErrors.set(nodeId, boundaryResult.error)
                this.queueErrorBoundaryErrorNodes(nodeId, excludedNodes)
              }
            }
          }

          if (!result.success && !executionError) {
            const node = workflow.nodes.find(n => n.id === nodeId)
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

  private excludeBranchNodes(
    startNodeId: string,
    edges: WorkflowEdge[],
    excludedNodes: Set<string>
  ): void {
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
        const sourceNode = this.workflowNodes.find(n => n.id === edge.source)
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

  private parseWorkflowJson(workflowJson: string): WorkflowGraph {
    let parsed: unknown

    try {
      parsed = JSON.parse(workflowJson)
    } catch (error) {
      throw new Error(`Failed to parse workflow JSON: invalid JSON syntax - ${(error as Error).message}`)
    }

    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>

      if ('nodes' in obj && 'edges' in obj) {
        return {
          nodes: Array.isArray(obj.nodes) ? obj.nodes : [],
          edges: Array.isArray(obj.edges) ? obj.edges : []
        }
      }

      if ('nodes_json' in obj && 'edges_json' in obj) {
        try {
          return {
            nodes: JSON.parse(String(obj.nodes_json)),
            edges: JSON.parse(String(obj.edges_json)),
          }
        } catch (error) {
          throw new Error('Failed to parse workflow JSON: nodes_json or edges_json contain invalid JSON')
        }
      }
    }

    throw new Error('Invalid workflow JSON structure: must contain nodes and edges arrays')
  }

  private validateWorkflow(workflow: WorkflowGraph): void {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow must have at least one node')
    }

    const nodeIds = new Set<string>()
    for (const node of workflow.nodes) {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID: ${node.id}`)
      }
      nodeIds.add(node.id)
    }

    for (const edge of workflow.edges || []) {
      if (!nodeIds.has(edge.source)) {
        throw new Error(`Edge references non-existent source node: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        throw new Error(`Edge references non-existent target node: ${edge.target}`)
      }
    }
  }

  private buildExecutionOrder(workflow: WorkflowGraph): string[] {
    const layers = this.buildExecutionLayers(workflow)
    return layers.flat()
  }

  private buildExecutionLayers(workflow: WorkflowGraph): string[][] {
    const nodes = workflow.nodes
    const edges = workflow.edges || []

    const dependencies = new Map<string, Set<string>>()

    for (const node of nodes) {
      dependencies.set(node.id, new Set())
    }

    for (const edge of edges) {
      dependencies.get(edge.target)?.add(edge.source)
    }

    const layers: string[][] = []
    const assigned = new Set<string>()

    while (assigned.size < nodes.length) {
      const readyNodes = nodes
        .filter(n => {
          if (assigned.has(n.id)) return false
          const deps = dependencies.get(n.id)
          if (!deps) return false
          for (const dep of deps) {
            if (!assigned.has(dep)) return false
          }
          return true
        })
        .map(n => n.id)

      if (readyNodes.length === 0) {
        const remaining = nodes.filter(n => !assigned.has(n.id)).map(n => n.id)
        throw new Error(`Workflow contains cycle involving nodes: ${remaining.join(', ')}`)
      }

      layers.push(readyNodes)
      for (const nodeId of readyNodes) {
        assigned.add(nodeId)
      }
    }

    return layers
  }

  private resolveNodeConfig(
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {}
    const skipKeys = ['subNodes', 'subEdges']
    for (const [key, value] of Object.entries(config)) {
      if (skipKeys.includes(key)) {
        resolved[key] = value
      } else {
        resolved[key] = this.resolveValue(value, nodeOutputs)
      }
    }
    return resolved
  }

  private resolveValue(value: unknown, nodeOutputs: Map<string, unknown>): unknown {
    if (typeof value === 'string') {
      return this.resolveTemplateString(value, nodeOutputs)
    }
    
    if (Array.isArray(value)) {
      return value.map(v => this.resolveValue(v, nodeOutputs))
    }
    
    if (typeof value === 'object' && value !== null) {
      const resolvedObj: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        resolvedObj[k] = this.resolveValue(v, nodeOutputs)
      }
      return resolvedObj
    }

    return value
  }

  private resolveTemplateString(template: string, nodeOutputs: Map<string, unknown>): string {
    const pattern = /\{\{([^}]+)\}\}/g
    return template.replace(pattern, (match, path) => {
      const parts = path.trim().split('.')
      const nodeId = parts[0]
      
      if (nodeId === 'item') {
        const item = nodeOutputs.get('item')
        if (parts.length === 1) {
          return item !== undefined ? String(item) : match
        }
        return this.getValueAtPath(item, parts.slice(1).join('.'))
      }

      if (nodeId === 'index') {
        const index = nodeOutputs.get('index')
        return index !== undefined ? String(index) : match
      }

      if (parts[1] === 'output' && parts.length > 2) {
        const outputPath = parts.slice(2)
        let current = nodeOutputs.get(nodeId)
        
        for (const part of outputPath) {
          const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
          if (arrayMatch) {
            const arrayKey = arrayMatch[1]
            const index = parseInt(arrayMatch[2], 10)
            if (current && typeof current === 'object' && arrayKey in current) {
              const arr = (current as Record<string, unknown>)[arrayKey]
              if (Array.isArray(arr)) {
                current = arr[index]
              } else {
                return match
              }
            } else {
              return match
            }
          } else {
            if (current && typeof current === 'object' && part in current) {
              current = (current as Record<string, unknown>)[part]
            } else {
              return match
            }
          }
        }
        
        return current !== undefined ? String(current) : match
      } else if (parts.length === 2 && parts[1] === 'output') {
        const output = nodeOutputs.get(nodeId)
        return output !== undefined ? String(output) : match
      }
      
      return match
    })
  }

  private getValueAtPath(data: unknown, path: string): string {
    const parts = path.split('.')
    let current = data

    for (const part of parts) {
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
      if (arrayMatch) {
        const key = arrayMatch[1]
        const index = parseInt(arrayMatch[2], 10)
        if (current && typeof current === 'object' && key in current) {
          const arr = (current as Record<string, unknown>)[key]
          current = Array.isArray(arr) ? arr[index] : undefined
        } else {
          return ''
        }
      } else {
        if (current && typeof current === 'object' && part in current) {
          current = (current as Record<string, unknown>)[part]
        } else {
          return ''
        }
      }
    }

    return current !== undefined ? String(current) : ''
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
        await new Promise(resolve => setTimeout(resolve, backoffDelay * 1000))
      }
    }

    return lastResult!
  }

  private async executeActionNode(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): Promise<unknown> {
    const service = config.service as string
    const method = config.method as string
    const args = (config.args as unknown[]) ?? []
    
    const detailStartTime = Date.now()
    let detailId: string | null = null

    // EMIT: workflow_node_start
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'action',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    if (this.dryRun) {
      const mockResponse = this.testData[node.id]?.mockResponse || {
        success: true,
        message: '[Dry Run] API call skipped',
        service,
        method,
        mockData: true,
      }

      cronEvents.emitWorkflowNodeOutput(node.id, mockResponse, this.executionLogId || 'test-run')

      // EMIT: workflow_node_complete
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'action',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result: mockResponse,
          workflowId: this.workflowId,
        })
      }

      return mockResponse
    }

    if (this.executionLogId) {
      detailId = await this.db.createExecutionLogDetail({
        log_id: this.executionLogId,
        node_id: node.id,
        node_type: 'action',
        service_name: service,
        method_name: method,
        input_payload: JSON.stringify(args),
        started_at: new Date().toISOString(),
      })
    }

    try {
      const result = await this.serviceRegistry.call(service, method, args)

      if (detailId) {
        await this.db.updateExecutionLogDetail(detailId, {
          output_result: JSON.stringify(result),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - detailStartTime,
        })
      }

      // EMIT: workflow_node_complete
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'action',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result,
          workflowId: this.workflowId,
        })
      }

      return result
    } catch (error) {
      if (detailId) {
        await this.db.updateExecutionLogDetail(detailId, {
          error_message: (error as Error).message,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - detailStartTime,
        })
      }

      // EMIT: workflow_node_error
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'action',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }
      throw error
    }
  }

  private async executeConditionNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<boolean> {
    const condition = config.condition as string | undefined
    if (!condition) {
      throw new Error('Condition node requires a condition config')
    }

    const detailStartTime = Date.now()

    // EMIT: workflow_node_start
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'condition',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    try {
      const resolvedCondition = this.resolveTemplateString(condition, nodeOutputs)
      const result = this.evaluateCondition(resolvedCondition)

      // EMIT: workflow_node_complete
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'condition',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result,
          workflowId: this.workflowId,
        })
      }

      return result
    } catch (error) {
      // EMIT: workflow_node_error
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'condition',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }
      throw error
    }
  }

  private evaluateCondition(condition: string): boolean {
    const truthyValues = ['true', 'yes', '1', 'success']
    const falsyValues = ['false', 'no', '0', 'fail', 'null', 'undefined', '']
    
    if (truthyValues.includes(condition.toLowerCase())) return true
    if (falsyValues.includes(condition.toLowerCase())) return false

    const comparisonPatterns = [
      { pattern: /^(.+)==(.+)$/, evaluate: (a: string, b: string) => a.trim() === b.trim() },
      { pattern: /^(.+)!=(.+)$/, evaluate: (a: string, b: string) => a.trim() !== b.trim() },
      { pattern: /^(.+)>=(.+)$/, evaluate: (a: string, b: string) => parseFloat(a.trim()) >= parseFloat(b.trim()) },
      { pattern: /^(.+)<=(.+)$/, evaluate: (a: string, b: string) => parseFloat(a.trim()) <= parseFloat(b.trim()) },
      { pattern: /^(.+)>(.+)$/, evaluate: (a: string, b: string) => parseFloat(a.trim()) > parseFloat(b.trim()) },
      { pattern: /^(.+)<(.+)$/, evaluate: (a: string, b: string) => parseFloat(a.trim()) < parseFloat(b.trim()) },
      { pattern: /^(.+)contains(.+)$/, evaluate: (a: string, b: string) => a.trim().includes(b.trim()) },
    ]

    for (const { pattern, evaluate } of comparisonPatterns) {
      const match = condition.match(pattern)
      if (match) {
        return evaluate(match[1], match[2])
      }
    }

    return condition.trim().length > 0
  }

  private async executeLoopNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<{ iterations: number; results: unknown[] }> {
    const items = config.items as string | undefined
    const maxIterations = (config.maxIterations as number) ?? 10
    const condition = config.condition as string | undefined
    const subNodes = config.subNodes as WorkflowNode[] | undefined
    const subEdges = config.subEdges as WorkflowEdge[] | undefined
    
    const detailStartTime = Date.now()

    // EMIT: workflow_node_start
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'loop',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    try {
      let itemsArray: unknown[] = []
      if (items) {
        const resolved = this.resolveTemplateString(items, nodeOutputs)
        try {
          itemsArray = JSON.parse(resolved)
        } catch {
          itemsArray = [resolved]
        }
      }

      const bodyNodes = this.findLoopBodyNodes(node.id)
      const bodyEdges = this.findLoopBodyEdges(node.id)

      const results: unknown[] = []
      let iterationCount = 0

      while (iterationCount < maxIterations) {
        if (itemsArray.length > 0 && iterationCount >= itemsArray.length) break

        if (itemsArray.length > 0) {
          nodeOutputs.set('item', itemsArray[iterationCount])
        }
        nodeOutputs.set('index', iterationCount)

        if (condition) {
          const resolved = this.resolveTemplateString(condition, nodeOutputs)
          if (!this.evaluateCondition(resolved)) break
        }

        const nodesToExecute = bodyNodes.length > 0 ? bodyNodes : subNodes
        const edgesToUse = bodyNodes.length > 0 ? bodyEdges : subEdges

        if (nodesToExecute && nodesToExecute.length > 0) {
          const iterationOutputs = new Map(nodeOutputs)
          const subGraph: WorkflowGraph = { nodes: nodesToExecute, edges: edgesToUse || [] }
          const executionOrder = this.buildExecutionOrder(subGraph)
          
          let iterationResult: unknown = undefined
          for (const subNodeId of executionOrder) {
            const subNode = nodesToExecute.find(n => n.id === subNodeId)
            if (!subNode) continue
            
            const resolvedConfig = this.resolveNodeConfig(subNode.data.config, iterationOutputs)
            const subResult = await this.executeNode(subNode, resolvedConfig, iterationOutputs)
            
            if (!subResult.success) {
              throw new Error(`Loop iteration ${iterationCount}: subNode ${subNodeId} failed - ${subResult.error}`)
            }
            
            if (subResult.data !== undefined) {
              iterationOutputs.set(subNodeId, subResult.data)
              iterationResult = subResult.data
            }
          }
          results.push(iterationResult)
        } else {
          results.push({ iteration: iterationCount })
        }

        iterationCount++
      }

      nodeOutputs.delete('item')
      nodeOutputs.delete('index')

      const loopResult = { iterations: iterationCount, results }

      // EMIT: workflow_node_complete
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'loop',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result: loopResult,
          workflowId: this.workflowId,
        })
      }

      return loopResult
    } catch (error) {
      // EMIT: workflow_node_error
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'loop',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }
      throw error
    }
  }

  private findLoopBodyNodes(loopNodeId: string): WorkflowNode[] {
    const bodyNodeIds = new Set<string>()
    
    for (const edge of this.workflowEdges) {
      if (edge.source === loopNodeId && edge.sourceHandle === 'body') {
        bodyNodeIds.add(edge.target)
      }
    }

    return this.workflowNodes.filter(n => bodyNodeIds.has(n.id))
  }

  private findLoopBodyEdges(loopNodeId: string): WorkflowEdge[] {
    const bodyNodeIds = new Set<string>()
    
    for (const edge of this.workflowEdges) {
      if (edge.source === loopNodeId && edge.sourceHandle === 'body') {
        bodyNodeIds.add(edge.target)
      }
    }

    return this.workflowEdges.filter(edge => 
      bodyNodeIds.has(edge.source) && bodyNodeIds.has(edge.target)
    )
  }

  private async executeTransformNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<unknown> {
    const transformType = (config.transformType as string) || 'passthrough'
    const inputPath = config.inputPath as string | undefined
    const outputFormat = config.outputFormat as string | undefined
    const inputNodeId = config.inputNode as string | undefined
    
    const detailStartTime = Date.now()

    // EMIT: workflow_node_start
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'transform',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    try {
      let inputData: unknown

      if (inputNodeId) {
        inputData = nodeOutputs.get(inputNodeId)
        if (inputPath && inputData) {
          inputData = this.getValueAtPath(inputData, inputPath)
        }
      }

      let outputData: unknown = inputData

      switch (transformType) {
        case 'passthrough':
          outputData = inputData
          break
        case 'extract':
          if (outputFormat) {
            outputData = this.extractData(inputData, outputFormat)
          }
          break
        case 'map': {
          const mapFunction = config.mapFunction as string | undefined
          if (mapFunction && Array.isArray(inputData)) {
            const sanitizedFunction = mapFunction
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;')
              .replace(/\//g, '&#x2F;')
            outputData = inputData.map((item, index) => {
              return sanitizedFunction
                .replace(/\$item/g, JSON.stringify(item))
                .replace(/\$index/g, String(index))
            })
          }
          break
        }
        case 'filter': {
          const filterCondition = config.filterCondition as string | undefined
          if (filterCondition && Array.isArray(inputData)) {
            const sanitizedCondition = filterCondition
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
            outputData = inputData.filter(item => {
              const conditionStr = sanitizedCondition.replace(/\$item/g, JSON.stringify(item))
              return this.evaluateCondition(conditionStr)
            })
          }
          break
        }
        case 'format':
          if (typeof inputData === 'object' && outputFormat) {
            outputData = this.formatOutput(inputData, outputFormat)
          }
          break
        default:
          throw new Error(`Unknown transform type: ${transformType}`)
      }

      // EMIT: workflow_node_complete
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'transform',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result: outputData,
          workflowId: this.workflowId,
        })
      }

      return outputData
    } catch (error) {
      // EMIT: workflow_node_error
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'transform',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }
      throw error
    }
  }

  private extractData(data: unknown, format: string): unknown {
    if (typeof data !== 'object' || data === null) return data

    const dataObj = data as Record<string, unknown>
    
    if (format.includes('.')) {
      return this.getValueAtPath(data, format)
    }

    if (format in dataObj) {
      return dataObj[format]
    }

    return data
  }

  private formatOutput(data: unknown, format: string): unknown {
    if (typeof data !== 'object' || data === null) return data

    try {
      if (format.startsWith('{') || format.startsWith('[')) {
        const template = JSON.parse(format)
        return this.applyFormatTemplate(data, template)
      }
      
      return this.getValueAtPath(data, format)
    } catch {
      return data
    }
  }

  private applyFormatTemplate(data: unknown, template: unknown): unknown {
    if (typeof template === 'string') {
      return this.getValueAtPath(data, template)
    }
    
    if (Array.isArray(template)) {
      return template.map(t => this.applyFormatTemplate(data, t))
    }
    
    if (typeof template === 'object' && template !== null) {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.applyFormatTemplate(data, value)
      }
      return result
    }

    return template
  }

  private async executeQueueNode(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): Promise<{ total: number; succeeded: number; failed: number }> {
    const jobId = config.jobId as string | undefined
    const taskType = config.taskType as string | undefined
    const limit = (config.limit as number) ?? 10

    const detailStartTime = Date.now()

    // EMIT: workflow_node_start
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'queue',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    try {
      let tasks: { id: string; task_type: string; payload: string; retry_count: number; max_retries: number }[] = []

      if (jobId) {
        tasks = await this.db.getPendingTasksByJob(jobId, limit)
      } else if (taskType) {
        tasks = await this.db.getPendingTasksByType(taskType, limit)
      }

      const total = tasks.length
      let succeeded = 0
      let failed = 0

      for (const task of tasks) {
        try {
          await this.db.markTaskRunning(task.id)

          const payload = JSON.parse(task.payload)
          let result: TaskResult

          if (this.taskExecutor) {
            result = await this.taskExecutor.executeTask(task.task_type, payload)
          } else {
            result = await this.serviceRegistry.call('task-executor', 'executeTask', [
              task.task_type,
              payload,
            ]) as TaskResult
          }

          await this.db.markTaskCompleted(task.id, JSON.stringify(result))
          succeeded++
        } catch (error) {
          const errorMessage = (error as Error).message
          await this.db.markTaskFailed(task.id, errorMessage)
          failed++

          const newRetryCount = task.retry_count + 1
          if (newRetryCount >= task.max_retries) {
            await this.db.createDeadLetterQueueItem({
              original_task_id: task.id,
              job_id: jobId ?? undefined,
              task_type: task.task_type,
              payload: JSON.parse(task.payload),
              error_message: errorMessage,
              retry_count: newRetryCount,
              max_retries: task.max_retries,
            })
          }
        }
      }

      const queueResult = { total, succeeded, failed }

      // EMIT: workflow_node_complete
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'queue',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result: queueResult,
          workflowId: this.workflowId,
        })
      }

      return queueResult
    } catch (error) {
      // EMIT: workflow_node_error
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'queue',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }
      throw error
    }
  }

  private async executeDelayNode(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): Promise<{ delayed: number }> {
    const detailStartTime = Date.now()

    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'delay',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    try {
      let delayMs = 0
      if (config.duration !== undefined) {
        delayMs = Math.max(0, config.duration as number)
      } else if (config.until !== undefined) {
        const targetTime = new Date(config.until as string).getTime()
        delayMs = Math.max(0, targetTime - Date.now())
      }

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      const result = { delayed: delayMs }

      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'delay',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result,
          workflowId: this.workflowId,
        })
      }

      return result
    } catch (error) {
      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'delay',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }
      throw error
    }
  }

  private async executeErrorBoundaryNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<{ success: boolean; error?: { message: string; stack?: string } }> {
    const detailStartTime = Date.now()

    if (this.executionLogId) {
      cronEvents.emit('workflow_node_start', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'errorBoundary',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowId,
      })
    }

    try {
      const successNodes = this.findErrorBoundarySuccessNodes(node.id)
      
      if (successNodes.length === 0) {
        if (this.executionLogId) {
          cronEvents.emit('workflow_node_complete', {
            executionId: this.executionLogId,
            nodeId: node.id,
            nodeType: 'errorBoundary',
            nodeLabel: node.data?.label || node.id,
            startedAt: new Date(detailStartTime).toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - detailStartTime,
            result: { success: true, message: 'No nodes to protect' },
            workflowId: this.workflowId,
          })
        }
        return { success: true }
      }

      for (const successNodeId of successNodes) {
        const successNode = this.workflowNodes.find(n => n.id === successNodeId)
        if (!successNode) continue

        const resolvedConfig = this.resolveNodeConfig(successNode.data.config, nodeOutputs)
        const result = await this.executeNode(successNode, resolvedConfig, nodeOutputs)

        if (!result.success) {
          const errorInfo = {
            success: false,
            error: {
              message: result.error || 'Unknown error',
            }
          }

          nodeOutputs.set(node.id, errorInfo)

          if (this.executionLogId) {
            cronEvents.emit('workflow_node_complete', {
              executionId: this.executionLogId,
              nodeId: node.id,
              nodeType: 'errorBoundary',
              nodeLabel: node.data?.label || node.id,
              startedAt: new Date(detailStartTime).toISOString(),
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - detailStartTime,
              result: errorInfo,
              workflowId: this.workflowId,
            })
          }

          return errorInfo
        }

        if (result.data !== undefined) {
          nodeOutputs.set(successNodeId, result.data)
        }
      }

      if (this.executionLogId) {
        cronEvents.emit('workflow_node_complete', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'errorBoundary',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - detailStartTime,
          result: { success: true },
          workflowId: this.workflowId,
        })
      }

      return { success: true }
    } catch (error) {
      const errorInfo = {
        success: false,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
        }
      }

      nodeOutputs.set(node.id, errorInfo)

      if (this.executionLogId) {
        cronEvents.emit('workflow_node_error', {
          executionId: this.executionLogId,
          nodeId: node.id,
          nodeType: 'errorBoundary',
          nodeLabel: node.data?.label || node.id,
          startedAt: new Date(detailStartTime).toISOString(),
          errorMessage: (error as Error).message,
          workflowId: this.workflowId,
        })
      }

      return errorInfo
    }
  }

  private findErrorBoundarySuccessNodes(errorBoundaryNodeId: string): string[] {
    const successNodeIds: string[] = []
    
    for (const edge of this.workflowEdges) {
      if (edge.source === errorBoundaryNodeId && edge.sourceHandle === 'success') {
        successNodeIds.push(edge.target)
        const downstreamNodes = this.findAllDownstreamNodes(edge.target)
        successNodeIds.push(...downstreamNodes)
      }
    }
    
    return [...new Set(successNodeIds)]
  }

  private findAllDownstreamNodes(startNodeId: string): string[] {
    const downstream: string[] = []
    const visited = new Set<string>()
    const queue = [startNodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      for (const edge of this.workflowEdges) {
        if (edge.source === currentId && !visited.has(edge.target)) {
          if (edge.sourceHandle !== 'error') {
            downstream.push(edge.target)
            queue.push(edge.target)
          }
        }
      }
    }

    return downstream
  }
}