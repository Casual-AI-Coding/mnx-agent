import type { DatabaseService } from '../database/service-async.js'
import type { TaskStatus } from '../database/types'

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

export interface WorkflowNode {
  id: string
  type: 'action' | 'condition' | 'queue' | 'loop' | 'transform' | 'text-generation' | 'voice-sync' | 'voice-async' | 'image-generation' | 'music-generation' | 'video-generation'
  subtype?: string
  config: Record<string, unknown>
  position?: { x: number; y: number }
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

export interface TaskExecutor {
  executeTask(taskType: string, payload: Record<string, unknown>): Promise<TaskResult>
}

export interface CapacityChecker {
  hasCapacity(serviceType: string): Promise<boolean>
  decrementCapacity(serviceType: string): Promise<void>
}

export interface QueueProcessor {
  processQueue(jobId: string, options?: QueueOptions): Promise<QueueResult>
}

export interface QueueOptions {
  batchSize?: number
  maxConcurrent?: number
  skipFailed?: boolean
}

export interface QueueResult {
  success: boolean
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
  error?: string
}

export class WorkflowEngine {
  private db: DatabaseService
  private taskExecutor: TaskExecutor
  private capacityChecker: CapacityChecker
  private queueProcessor: QueueProcessor | null = null
  private workflowNodes: WorkflowNode[] = []

  constructor(
    db: DatabaseService,
    taskExecutor: TaskExecutor,
    capacityChecker: CapacityChecker
  ) {
    this.db = db
    this.taskExecutor = taskExecutor
    this.capacityChecker = capacityChecker
  }

  setQueueProcessor(queueProcessor: QueueProcessor): void {
    this.queueProcessor = queueProcessor
  }

  async executeWorkflow(workflowJson: string): Promise<WorkflowResult> {
    const startTime = Date.now()
    const nodeResults = new Map<string, TaskResult>()
    let executionError: string | undefined

    try {
      const workflow = this.parseWorkflowJson(workflowJson)
      this.validateWorkflow(workflow)
      this.workflowNodes = workflow.nodes
      const executionOrder = this.buildExecutionOrder(workflow)
      const nodeOutputs = new Map<string, unknown>()

      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId)
        if (!node) {
          throw new Error(`Node ${nodeId} not found in workflow`)
        }

        const resolvedConfig = this.resolveNodeConfig(node.config, nodeOutputs)
        const result = await this.executeNode(node, resolvedConfig, nodeOutputs)
        nodeResults.set(nodeId, result)

        if (result.success && result.data !== undefined) {
          nodeOutputs.set(nodeId, result.data)
        }

        if (!result.success) {
          executionError = `Node ${nodeId} failed: ${result.error}`
          break
        }
      }

    } catch (error) {
      const err = error as Error
      executionError = err.message
    }

    return {
      success: !executionError,
      nodeResults,
      totalDurationMs: Date.now() - startTime,
      error: executionError,
    }
  }

  private parseWorkflowJson(workflowJson: string): WorkflowGraph {
    try {
      const parsed = JSON.parse(workflowJson)
      
      if (parsed.nodes && parsed.edges) {
        return parsed as WorkflowGraph
      }
      
      if (parsed.nodes_json && parsed.edges_json) {
        return {
          nodes: JSON.parse(parsed.nodes_json),
          edges: JSON.parse(parsed.edges_json),
        }
      }

      throw new Error('Invalid workflow JSON structure')
    } catch (error) {
      throw new Error(`Failed to parse workflow JSON: ${(error as Error).message}`)
    }
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
    const nodes = workflow.nodes
    const edges = workflow.edges || []

    const dependencies = new Map<string, Set<string>>()
    const dependents = new Map<string, Set<string>>()

    for (const node of nodes) {
      dependencies.set(node.id, new Set())
      dependents.set(node.id, new Set())
    }

    for (const edge of edges) {
      dependencies.get(edge.target)?.add(edge.source)
      dependents.get(edge.source)?.add(edge.target)
    }

    const order: string[] = []
    const visited = new Set<string>()
    const noDeps = nodes.filter(n => dependencies.get(n.id)?.size === 0)
    const queue: string[] = noDeps.map(n => n.id)

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (visited.has(nodeId)) continue
      
      visited.add(nodeId)
      order.push(nodeId)

      const dependentSet = dependents.get(nodeId)
      if (dependentSet) {
        dependentSet.forEach(dependentId => {
          const deps = dependencies.get(dependentId)
          if (deps) {
            let allVisited = true
            deps.forEach(d => {
              if (!visited.has(d)) allVisited = false
            })
            if (allVisited) {
              queue.push(dependentId)
            }
          }
        })
      }
    }

    if (order.length !== nodes.length) {
      const remaining = nodes.filter(n => !visited.has(n.id)).map(n => n.id)
      throw new Error(`Workflow contains cycle involving nodes: ${remaining.join(', ')}`)
    }

    return order
  }

  private resolveNodeConfig(
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = this.resolveValue(value, nodeOutputs)
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

  private async executeNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<TaskResult> {
    const startTime = Date.now()
    const maxRetries = 3
    let lastError: string | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let result: TaskResult

        switch (node.type) {
          case 'action':
            result = await this.executeActionNode(node, config)
            break
          case 'text-generation':
            result = await this.executeActionNode({ ...node, subtype: 'text' }, config)
            break
          case 'voice-sync':
            result = await this.executeActionNode({ ...node, subtype: 'voice-sync' }, config)
            break
          case 'voice-async':
            result = await this.executeActionNode({ ...node, subtype: 'voice-async' }, config)
            break
          case 'image-generation':
            result = await this.executeActionNode({ ...node, subtype: 'image' }, config)
            break
          case 'music-generation':
            result = await this.executeActionNode({ ...node, subtype: 'music' }, config)
            break
          case 'video-generation':
            result = await this.executeActionNode({ ...node, subtype: 'video' }, config)
            break
          case 'condition':
            result = await this.executeConditionNode(node, config, nodeOutputs)
            break
          case 'queue':
            result = await this.executeQueueNode(node, config)
            break
          case 'loop':
            result = await this.executeLoopNode(node, config, nodeOutputs)
            break
          case 'transform':
            result = await this.executeTransformNode(node, config, nodeOutputs)
            break
          default:
            throw new Error(`Unknown node type: ${node.type}`)
        }

        return result

      } catch (error) {
        lastError = (error as Error).message
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    return {
      success: false,
      error: lastError || 'Unknown error after retries',
      durationMs: Date.now() - startTime,
    }
  }

  private async executeActionNode(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): Promise<TaskResult> {
    const startTime = Date.now()
    const taskType = node.subtype || 'text'

    const hasCapacity = await this.capacityChecker.hasCapacity(taskType)
    if (!hasCapacity) {
      return {
        success: false,
        error: `No capacity available for task type: ${taskType}`,
        durationMs: Date.now() - startTime,
      }
    }

    const result = await this.taskExecutor.executeTask(taskType, config)

    if (result.success) {
      await this.capacityChecker.decrementCapacity(taskType)
    }

    return result
  }

  private async executeConditionNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<TaskResult> {
    const startTime = Date.now()
    
    const condition = config.condition as string | undefined
    if (!condition) {
      return {
        success: false,
        error: 'Condition node requires a condition config',
        durationMs: Date.now() - startTime,
      }
    }

    const resolvedCondition = this.resolveTemplateString(condition, nodeOutputs)
    const evaluated = this.evaluateCondition(resolvedCondition)

    return {
      success: true,
      data: evaluated,
      durationMs: Date.now() - startTime,
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

  private async executeQueueNode(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): Promise<TaskResult> {
    const startTime = Date.now()

    if (!this.queueProcessor) {
      return {
        success: false,
        error: 'QueueProcessor not configured',
        durationMs: Date.now() - startTime,
      }
    }

    const jobId = config.jobId as string
    if (!jobId) {
      return {
        success: false,
        error: 'Queue node requires jobId config',
        durationMs: Date.now() - startTime,
      }
    }

    const options = {
      batchSize: config.batchSize as number | undefined,
      maxConcurrent: config.maxConcurrent as number | undefined,
      skipFailed: config.skipFailed as boolean | undefined,
    }

    const result = await this.queueProcessor.processQueue(jobId, options)

    return {
      success: result.success,
      data: {
        tasksExecuted: result.tasksExecuted,
        tasksSucceeded: result.tasksSucceeded,
        tasksFailed: result.tasksFailed,
      },
      error: result.error,
      durationMs: Date.now() - startTime,
    }
  }

  private async executeLoopNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<TaskResult> {
    const startTime = Date.now()
    
    const maxIterations = (config.maxIterations as number) || 10
    const loopCondition = config.condition as string | undefined
    const bodyNodeId = config.bodyNode as string | undefined
    const outputVariable = config.outputVariable as string | undefined

    if (!bodyNodeId) {
      return {
        success: false,
        error: 'Loop node requires bodyNode config',
        durationMs: Date.now() - startTime,
      }
    }

    const bodyNode = this.workflowNodes.find(n => n.id === bodyNodeId)
    const shouldExecuteBody = bodyNode && outputVariable

    const results: unknown[] = []
    let iterationCount = 0

    while (iterationCount < maxIterations) {
      if (loopCondition) {
        const resolvedCondition = this.resolveTemplateString(loopCondition, nodeOutputs)
        const shouldContinue = this.evaluateCondition(resolvedCondition)
        if (!shouldContinue) break
      }

      if (shouldExecuteBody && bodyNode) {
        const bodyNodeConfig = this.resolveNodeConfig(bodyNode.config, nodeOutputs)
        const iterationResult = await this.executeNode(bodyNode, bodyNodeConfig, nodeOutputs)
        
        if (!iterationResult.success) {
          return {
            success: false,
            error: `Loop iteration ${iterationCount} failed: ${iterationResult.error}`,
            durationMs: Date.now() - startTime,
          }
        }
        
        results.push(iterationResult)
        nodeOutputs.set(`${node.id}.iteration.${iterationCount}`, iterationResult)
      } else {
        results.push({ iteration: iterationCount })
        nodeOutputs.set(`${node.id}.iteration.${iterationCount}`, { iteration: iterationCount })
      }
      iterationCount++
    }

    if (outputVariable) {
      nodeOutputs.set(outputVariable, results)
    }

    return {
      success: true,
      data: {
        iterations: results.length,
        results: results,
      },
      durationMs: Date.now() - startTime,
    }
  }

  private async executeTransformNode(
    node: WorkflowNode,
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<TaskResult> {
    const startTime = Date.now()

    const transformType = config.transformType as string || 'passthrough'
    const inputNodeId = config.inputNode as string | undefined
    const inputPath = config.inputPath as string | undefined
    const outputFormat = config.outputFormat as string | undefined

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
      case 'map':
        const mapFunction = config.mapFunction as string | undefined
        if (mapFunction && Array.isArray(inputData)) {
          outputData = inputData.map((item, index) => {
            return mapFunction
              .replace(/\$item/g, JSON.stringify(item))
              .replace(/\$index/g, String(index))
          })
        }
        break
      case 'filter':
        const filterCondition = config.filterCondition as string | undefined
        if (filterCondition && Array.isArray(inputData)) {
          outputData = inputData.filter(item => {
            const conditionStr = filterCondition.replace(/\$item/g, JSON.stringify(item))
            return this.evaluateCondition(conditionStr)
          })
        }
        break
      case 'format':
        if (typeof inputData === 'object' && outputFormat) {
          outputData = this.formatOutput(inputData, outputFormat)
        }
        break
      default:
        return {
          success: false,
          error: `Unknown transform type: ${transformType}`,
          durationMs: Date.now() - startTime,
        }
    }

    return {
      success: true,
      data: outputData,
      durationMs: Date.now() - startTime,
    }
  }

  private getValueAtPath(data: unknown, path: string): unknown {
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
          return undefined
        }
      } else {
        if (current && typeof current === 'object' && part in current) {
          current = (current as Record<string, unknown>)[part]
        } else {
          return undefined
        }
      }
    }

    return current
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
}