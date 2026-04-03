import type { DatabaseService } from '../database/service-async.js'
import type { ServiceNodeRegistry } from './service-node-registry.js'
import { WorkflowNodeType } from '../types/workflow.js'

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
  type: WorkflowNodeType
  data: {
    label: string
    config: Record<string, unknown>
  }
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

export class WorkflowEngine {
  private db: DatabaseService
  private serviceRegistry: ServiceNodeRegistry
  private executionLogId: string | null = null
  private workflowNodes: WorkflowNode[] = []

  constructor(db: DatabaseService, serviceRegistry: ServiceNodeRegistry) {
    this.db = db
    this.serviceRegistry = serviceRegistry
  }

  async executeWorkflow(
    workflowJson: string,
    executionLogId?: string
  ): Promise<WorkflowResult> {
    const startTime = Date.now()
    const nodeResults = new Map<string, TaskResult>()
    let executionError: string | undefined

    this.executionLogId = executionLogId || null

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

        const resolvedConfig = this.resolveNodeConfig(node.data.config, nodeOutputs)
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
      executionError = (error as Error).message
    }

    return {
      success: !executionError,
      nodeResults,
      totalDurationMs: Date.now() - startTime,
      error: executionError,
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
      
      if (nodeId === 'item' && parts.length > 1) {
        const item = nodeOutputs.get('item')
        return this.getValueAtPath(item, parts.slice(1).join('.'))
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

    try {
      let result: unknown

      switch (node.type) {
        case 'action':
          result = await this.executeActionNode(node, config)
          break
        case 'condition':
          result = await this.executeConditionNode(config, nodeOutputs)
          break
        case 'loop':
          result = await this.executeLoopNode(config, nodeOutputs)
          break
        case 'transform':
          result = await this.executeTransformNode(config, nodeOutputs)
          break
        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }

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

  private async executeActionNode(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): Promise<unknown> {
    const service = config.service as string
    const method = config.method as string
    const args = (config.args as unknown[]) ?? []
    
    const detailStartTime = Date.now()
    let detailId: string | null = null

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

      return result
    } catch (error) {
      if (detailId) {
        await this.db.updateExecutionLogDetail(detailId, {
          error_message: (error as Error).message,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - detailStartTime,
        })
      }
      throw error
    }
  }

  private async executeConditionNode(
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<boolean> {
    const condition = config.condition as string | undefined
    if (!condition) {
      throw new Error('Condition node requires a condition config')
    }

    const resolvedCondition = this.resolveTemplateString(condition, nodeOutputs)
    return this.evaluateCondition(resolvedCondition)
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
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<{ iterations: number; results: unknown[] }> {
    const items = config.items as string | undefined
    const maxIterations = (config.maxIterations as number) ?? 10
    const condition = config.condition as string | undefined
    
    let itemsArray: unknown[] = []
    if (items) {
      const resolved = this.resolveTemplateString(items, nodeOutputs)
      try {
        itemsArray = JSON.parse(resolved)
      } catch {
        itemsArray = [resolved]
      }
    }

    const results: unknown[] = []
    let iterationCount = 0

    while (iterationCount < maxIterations) {
      if (condition) {
        const resolved = this.resolveTemplateString(condition, nodeOutputs)
        if (!this.evaluateCondition(resolved)) break
      }

      if (itemsArray.length > 0 && iterationCount >= itemsArray.length) break

      if (itemsArray.length > 0) {
        nodeOutputs.set('item', itemsArray[iterationCount])
      }

      results.push({ iteration: iterationCount })
      iterationCount++
    }

    return { iterations: iterationCount, results }
  }

  private async executeTransformNode(
    config: Record<string, unknown>,
    nodeOutputs: Map<string, unknown>
  ): Promise<unknown> {
    const transformType = (config.transformType as string) || 'passthrough'
    const inputPath = config.inputPath as string | undefined
    const outputFormat = config.outputFormat as string | undefined
    const inputNodeId = config.inputNode as string | undefined
    
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
          outputData = inputData.map((item, index) => {
            return mapFunction
              .replace(/\$item/g, JSON.stringify(item))
              .replace(/\$index/g, String(index))
          })
        }
        break
      }
      case 'filter': {
        const filterCondition = config.filterCondition as string | undefined
        if (filterCondition && Array.isArray(inputData)) {
          outputData = inputData.filter(item => {
            const conditionStr = filterCondition.replace(/\$item/g, JSON.stringify(item))
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

    return outputData
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