# SP-4: WorkflowEngine Refactor

> 本方案重构 WorkflowEngine，统一 action 节点处理，集成 ServiceNodeRegistry。

## 1. 目标

- 删除旧的节点类型（text-generation、image-generation 等）
- 统一 action 节点处理逻辑
- 集成 ServiceNodeRegistry
- 记录详细的执行日志

## 2. 变更内容

### 2.1 删除的节点类型

```typescript
// 旧的节点类型（删除）
'text-generation' | 'voice-sync' | 'voice-async' | 
'image-generation' | 'music-generation' | 'video-generation'

// 新的节点类型（统一）
'action'
```

### 2.2 修改的文件

| 文件 | 变更 |
|------|------|
| `server/services/workflow-engine.ts` | 重构节点执行逻辑 |
| `server/types/workflow.ts` | 新增类型定义 |
| `src/types/cron.ts` | 前端类型定义更新 |

## 3. 实现代码

### 3.1 类型定义

```typescript
// server/types/workflow.ts

export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position?: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
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

// 执行结果
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

// 配置类型
export interface ActionNodeConfig {
  service: string
  method: string
  args?: unknown[]
}

export interface ConditionNodeConfig {
  condition: string
}

export interface LoopNodeConfig {
  items?: string
  maxIterations?: number
  condition?: string
}

export interface TransformNodeConfig {
  transformType: 'extract' | 'map' | 'filter' | 'format'
  inputPath?: string
  outputFormat?: string
}
```

### 3.2 WorkflowEngine 重构

```typescript
// server/services/workflow-engine.ts

import type { DatabaseService } from '../database/service-async.js'
import type { ServiceNodeRegistry } from './service-node-registry.js'
import type { 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowGraph,
  TaskResult,
  WorkflowResult,
  ActionNodeConfig,
  ConditionNodeConfig,
  LoopNodeConfig,
  TransformNodeConfig,
} from '../types/workflow.js'

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
      // 1. 解析 workflow JSON
      const workflow = this.parseWorkflowJson(workflowJson)
      
      // 2. 验证 workflow
      this.validateWorkflow(workflow)
      
      // 3. 保存节点引用（用于 loop 节点查找 body）
      this.workflowNodes = workflow.nodes

      // 4. 拓扑排序
      const executionOrder = this.buildExecutionOrder(workflow)

      // 5. 执行节点
      const nodeOutputs = new Map<string, unknown>()

      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId)
        if (!node) {
          throw new Error(`Node ${nodeId} not found`)
        }

        // 解析配置中的模板变量
        const resolvedConfig = this.resolveNodeConfig(node.data.config, nodeOutputs)
        
        // 执行节点
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
    try {
      const parsed = JSON.parse(workflowJson)
      
      if (parsed.nodes && parsed.edges) {
        return parsed as WorkflowGraph
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
        throw new Error(`Edge references non-existent source: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        throw new Error(`Edge references non-existent target: ${edge.target}`)
      }
    }
  }

  private buildExecutionOrder(workflow: WorkflowGraph): string[] {
    // ... 拓扑排序逻辑（保持不变）
    // 参考现有实现
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
      
      // 支持特殊变量
      if (nodeId === 'item' && parts.length > 1) {
        // loop 中的当前项
        const item = nodeOutputs.get('item')
        return this.getValueAtPath(item, parts.slice(1).join('.'))
      }
      
      if (parts[1] === 'output' && parts.length > 2) {
        const outputPath = parts.slice(2)
        let current = nodeOutputs.get(nodeId)
        return this.getValueAtPath(current, outputPath.join('.'))
      } else if (parts.length === 2 && parts[1] === 'output') {
        const output = nodeOutputs.get(nodeId)
        return output !== undefined ? String(output) : match
      }
      
      return match
    })
  }

  private getValueAtPath(data: unknown, path: string): string {
    // ... 路径访问逻辑（保持不变）
  }

  // ============================================
  // 节点执行
  // ============================================

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
          result = await this.executeActionNode(node, config as ActionNodeConfig)
          break
        case 'condition':
          result = await this.executeConditionNode(config as ConditionNodeConfig, nodeOutputs)
          break
        case 'loop':
          result = await this.executeLoopNode(config as LoopNodeConfig, nodeOutputs)
          break
        case 'transform':
          result = await this.executeTransformNode(config as TransformNodeConfig, nodeOutputs)
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

  // ============================================
  // Action Node（核心变更）
  // ============================================

  private async executeActionNode(
    node: WorkflowNode,
    config: ActionNodeConfig
  ): Promise<unknown> {
    const { service, method, args = [] } = config
    
    const detailStartTime = Date.now()
    let detailId: string | null = null

    // 创建执行详情记录
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
      // 调用服务
      const result = await this.serviceRegistry.call(service, method, args)

      // 更新执行详情
      if (detailId) {
        await this.db.updateExecutionLogDetail(detailId, {
          output_result: JSON.stringify(result),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - detailStartTime,
        })
      }

      return result
    } catch (error) {
      // 记录错误
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

  // ============================================
  // Condition Node（保持不变）
  // ============================================

  private async executeConditionNode(
    config: ConditionNodeConfig,
    nodeOutputs: Map<string, unknown>
  ): Promise<boolean> {
    const { condition } = config
    const resolved = this.resolveTemplateString(condition, nodeOutputs)
    return this.evaluateCondition(resolved)
  }

  private evaluateCondition(condition: string): boolean {
    // ... 保持现有实现
  }

  // ============================================
  // Loop Node（保持不变，略作调整）
  // ============================================

  private async executeLoopNode(
    config: LoopNodeConfig,
    nodeOutputs: Map<string, unknown>
  ): Promise<{ iterations: number; results: unknown[] }> {
    const { items, maxIterations = 10, condition } = config
    
    // 解析 items
    let itemsArray: unknown[] = []
    if (items) {
      const resolved = this.resolveTemplateString(items, nodeOutputs)
      // 尝试解析为数组
      try {
        itemsArray = JSON.parse(resolved)
      } catch {
        itemsArray = [resolved]
      }
    }

    const results: unknown[] = []
    let iterationCount = 0

    while (iterationCount < maxIterations) {
      // 检查终止条件
      if (condition) {
        const resolved = this.resolveTemplateString(condition, nodeOutputs)
        if (!this.evaluateCondition(resolved)) break
      }

      // 检查是否还有 items
      if (itemsArray.length > 0 && iterationCount >= itemsArray.length) break

      // 设置当前 item
      if (itemsArray.length > 0) {
        nodeOutputs.set('item', itemsArray[iterationCount])
      }

      // 记录迭代结果
      results.push({ iteration: iterationCount })
      iterationCount++
    }

    return { iterations: iterationCount, results }
  }

  // ============================================
  // Transform Node（保持不变）
  // ============================================

  private async executeTransformNode(
    config: TransformNodeConfig,
    nodeOutputs: Map<string, unknown>
  ): Promise<unknown> {
    // ... 保持现有实现
  }
}
```

## 4. DatabaseService 方法

```typescript
// server/database/service-async.ts 新增方法

async createExecutionLogDetail(data: {
  log_id: string
  node_id: string
  node_type: string
  service_name?: string
  method_name?: string
  input_payload?: string
  started_at: string
}): Promise<string> {
  const id = uuidv4()
  await this.db.run(`
    INSERT INTO execution_log_details 
    (id, log_id, node_id, node_type, service_name, method_name, input_payload, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.log_id, data.node_id, data.node_type, 
      data.service_name || null, data.method_name || null, 
      data.input_payload || null, data.started_at])
  return id
}

async updateExecutionLogDetail(
  id: string, 
  data: {
    output_result?: string
    error_message?: string
    completed_at?: string
    duration_ms?: number
  }
): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.output_result !== undefined) {
    updates.push('output_result = ?')
    values.push(data.output_result)
  }
  if (data.error_message !== undefined) {
    updates.push('error_message = ?')
    values.push(data.error_message)
  }
  if (data.completed_at !== undefined) {
    updates.push('completed_at = ?')
    values.push(data.completed_at)
  }
  if (data.duration_ms !== undefined) {
    updates.push('duration_ms = ?')
    values.push(data.duration_ms)
  }

  if (updates.length === 0) return

  values.push(id)
  await this.db.run(`
    UPDATE execution_log_details 
    SET ${updates.join(', ')}
    WHERE id = ?
  `, values)
}
```

## 5. 实施步骤

1. 创建 `server/types/workflow.ts` 类型定义
2. 重构 `server/services/workflow-engine.ts`
   - 删除旧的节点类型处理
   - 实现 executeActionNode
   - 集成 ServiceNodeRegistry
   - 添加执行详情记录
3. 添加 DatabaseService 方法
4. 更新前端类型定义
5. 编写单元测试

## 6. 验证检查清单

- [ ] 类型定义正确
- [ ] 旧节点类型处理已删除
- [ ] action 节点统一处理
- [ ] ServiceNodeRegistry 集成
- [ ] 执行详情记录
- [ ] 模板变量解析正确
- [ ] 单元测试通过