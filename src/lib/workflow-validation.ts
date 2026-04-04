import type { WorkflowNode, WorkflowEdge } from '@/types/cron'

// Error codes for workflow validation
export const ValidationErrorCode = {
  ORPHANED_NODE: 'ORPHANED_NODE',
  MISSING_SERVICE: 'MISSING_SERVICE',
  MISSING_METHOD: 'MISSING_METHOD',
  MISSING_CONDITION: 'MISSING_CONDITION',
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  INVALID_TEMPLATE: 'INVALID_TEMPLATE',
} as const

export type ValidationErrorCode = typeof ValidationErrorCode[keyof typeof ValidationErrorCode]

export interface ValidationError {
  nodeId: string
  field: string
  message: string
  severity: 'error' | 'warning'
  code: ValidationErrorCode
}

/**
 * Validate a single workflow node
 */
export function validateNode(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = []

  if (!node.data?.label || node.data.label.trim() === '') {
    errors.push({
      nodeId: node.id,
      field: 'label',
      message: '节点名称不能为空',
      severity: 'error',
      code: 'MISSING_LABEL' as ValidationErrorCode,
    })
  }

  if (node.type === 'action') {
    const config = node.data?.config as { service?: string; method?: string; args?: unknown[] } | undefined

    if (!config?.service || config.service.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'service',
        message: '动作节点需要选择服务',
        severity: 'error',
        code: ValidationErrorCode.MISSING_SERVICE,
      })
    }

    if (!config?.method || config.method.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'method',
        message: '动作节点需要选择方法',
        severity: 'error',
        code: ValidationErrorCode.MISSING_METHOD,
      })
    }

    if (config?.args !== undefined) {
      try {
        JSON.stringify(config.args)
      } catch {
        errors.push({
          nodeId: node.id,
          field: 'args',
          message: '参数必须是有效的 JSON',
          severity: 'error',
          code: ValidationErrorCode.INVALID_TEMPLATE,
        })
      }
    }
  }

  if (node.type === 'condition') {
    const conditionType = node.data?.config?.conditionType as string | undefined
    if (!conditionType || conditionType.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'conditionType',
        message: '条件类型是必需的',
        severity: 'error',
        code: ValidationErrorCode.MISSING_CONDITION,
      })
    }

    const serviceType = node.data?.config?.serviceType as string | undefined
    if (!serviceType || serviceType.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'serviceType',
        message: '服务类型是必需的',
        severity: 'error',
        code: ValidationErrorCode.MISSING_CONDITION,
      })
    }
  }

  if (node.type === 'loop') {
    const maxIterations = node.data?.config?.maxIterations as number | undefined
    if (maxIterations !== undefined && maxIterations < 1) {
      errors.push({
        nodeId: node.id,
        field: 'maxIterations',
        message: '最大迭代次数必须至少为 1',
        severity: 'error',
        code: 'INVALID_ITERATION' as ValidationErrorCode,
      })
    }
  }

  if (node.type === 'transform') {
    const transformType = node.data?.config?.transformType as string | undefined
    if (!transformType || transformType.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'transformType',
        message: '转换类型是必需的',
        severity: 'error',
        code: ValidationErrorCode.INVALID_TEMPLATE,
      })
    }

    const mapping = node.data?.config?.mapping
    if (mapping !== undefined) {
      try {
        JSON.stringify(mapping)
      } catch {
        errors.push({
          nodeId: node.id,
          field: 'mapping',
          message: '映射必须是有效的 JSON',
          severity: 'error',
          code: ValidationErrorCode.INVALID_TEMPLATE,
        })
      }
    }
  }

  return errors
}

/**
 * Get errors for a specific node
 */
export function getNodeErrors(nodeId: string, errors: ValidationError[]): ValidationError[] {
  return errors.filter(e => e.nodeId === nodeId)
}

/**
 * Get the highest severity for a node
 */
export function getNodeSeverity(nodeId: string, errors: ValidationError[]): 'error' | 'warning' | null {
  const nodeErrors = getNodeErrors(nodeId, errors)
  if (nodeErrors.length === 0) return null
  if (nodeErrors.some(e => e.severity === 'error')) return 'error'
  return 'warning'
}

/**
 * Check if a node has validation errors
 */
export function hasNodeErrors(nodeId: string, errors: ValidationError[]): boolean {
  return getNodeErrors(nodeId, errors).some(e => e.severity === 'error')
}

/**
 * Check if a node has validation warnings
 */
export function hasNodeWarnings(nodeId: string, errors: ValidationError[]): boolean {
  return getNodeErrors(nodeId, errors).some(e => e.severity === 'warning')
}

/**
 * Get validation summary
 */
export function getValidationSummary(errors: ValidationError[]): {
  total: number
  errors: number
  warnings: number
} {
  return {
    total: errors.length,
    errors: errors.filter(e => e.severity === 'error').length,
    warnings: errors.filter(e => e.severity === 'warning').length,
  }
}

/**
 * Detect cycles in the workflow using DFS
 */
function detectCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
  const cycles: string[][] = []
  const graph = new Map<string, string[]>()

  edges.forEach(edge => {
    if (!graph.has(edge.source)) graph.set(edge.source, [])
    graph.get(edge.source)!.push(edge.target)
  })

  const visited = new Set<string>()
  const recStack = new Set<string>()
  const nodeIds = new Set(nodes.map(n => n.id))

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId)
    recStack.add(nodeId)
    path.push(nodeId)

    const neighbors = graph.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path])
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor)
        cycles.push(path.slice(cycleStart))
      }
    }

    recStack.delete(nodeId)
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, [])
    }
  })

  return cycles
}

/**
 * Validate the entire workflow
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const node of nodes) {
    errors.push(...validateNode(node))
  }

  if (nodes.length > 1) {
    const connectedNodeIds = new Set<string>()
    for (const edge of edges) {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    }

    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        errors.push({
          nodeId: node.id,
          field: 'connection',
          message: '节点未连接到工作流',
          severity: 'warning',
          code: ValidationErrorCode.ORPHANED_NODE,
        })
      }
    }
  }

  const cycles = detectCycles(nodes, edges)
  const nodeIdSet = new Set(nodes.map(n => n.id))
  cycles.forEach(cycle => {
    cycle.forEach(nodeId => {
      if (nodeIdSet.has(nodeId)) {
        errors.push({
          nodeId,
          field: 'connection',
          message: '检测到循环依赖',
          severity: 'error',
          code: ValidationErrorCode.CYCLE_DETECTED,
        })
      }
    })
  })

  return errors
}

/**
 * Validate a workflow and return detailed results
 */
export function validateWorkflowDetailed(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): {
  isValid: boolean
  errors: ValidationError[]
  summary: { total: number; errors: number; warnings: number }
  nodeStatus: Map<string, { hasErrors: boolean; hasWarnings: boolean }>
} {
  const errors = validateWorkflow(nodes, edges)
  const summary = getValidationSummary(errors)
  
  const nodeStatus = new Map<string, { hasErrors: boolean; hasWarnings: boolean }>()
  for (const node of nodes) {
    nodeStatus.set(node.id, {
      hasErrors: hasNodeErrors(node.id, errors),
      hasWarnings: hasNodeWarnings(node.id, errors),
    })
  }

  return {
    isValid: summary.errors === 0,
    errors,
    summary,
    nodeStatus,
  }
}
