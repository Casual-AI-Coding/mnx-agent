import type { WorkflowNode, WorkflowEdge } from '@/types/cron'

export interface ValidationError {
  nodeId: string
  field: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Validate a single workflow node
 */
export function validateNode(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required fields based on node type
  if (!node.data?.label || node.data.label.trim() === '') {
    errors.push({
      nodeId: node.id,
      field: 'label',
      message: 'Node label is required',
      severity: 'error',
    })
  }

  // Validate action nodes
  if (node.type === 'action') {
    const config = node.data?.config as { service?: string; method?: string; args?: unknown[] } | undefined

    if (!config?.service || config.service.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'service',
        message: 'Service is required for action nodes',
        severity: 'error',
      })
    }

    if (!config?.method || config.method.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'method',
        message: 'Method is required for action nodes',
        severity: 'error',
      })
    }

    // Validate args is valid JSON if provided
    if (config?.args !== undefined) {
      try {
        JSON.stringify(config.args)
      } catch {
        errors.push({
          nodeId: node.id,
          field: 'args',
          message: 'Arguments must be valid JSON',
          severity: 'error',
        })
      }
    }
  }

  // Validate condition nodes
  if (node.type === 'condition') {
    const conditionType = node.data?.config?.conditionType as string | undefined
    if (!conditionType || conditionType.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'conditionType',
        message: 'Condition type is required',
        severity: 'error',
      })
    }

    const serviceType = node.data?.config?.serviceType as string | undefined
    if (!serviceType || serviceType.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'serviceType',
        message: 'Service type is required',
        severity: 'error',
      })
    }
  }

  // Validate loop nodes
  if (node.type === 'loop') {
    const maxIterations = node.data?.config?.maxIterations as number | undefined
    if (maxIterations !== undefined && maxIterations < 1) {
      errors.push({
        nodeId: node.id,
        field: 'maxIterations',
        message: 'Max iterations must be at least 1',
        severity: 'error',
      })
    }
  }

  // Validate transform nodes
  if (node.type === 'transform') {
    const transformType = node.data?.config?.transformType as string | undefined
    if (!transformType || transformType.trim() === '') {
      errors.push({
        nodeId: node.id,
        field: 'transformType',
        message: 'Transform type is required',
        severity: 'error',
      })
    }

    // Validate mapping is valid JSON if provided
    const mapping = node.data?.config?.mapping
    if (mapping !== undefined) {
      try {
        JSON.stringify(mapping)
      } catch {
        errors.push({
          nodeId: node.id,
          field: 'mapping',
          message: 'Mapping must be valid JSON',
          severity: 'error',
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
 * Validate the entire workflow
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate each node
  for (const node of nodes) {
    errors.push(...validateNode(node))
  }

  // Check for disconnected nodes (warning)
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
          message: 'Node is not connected to any other node',
          severity: 'warning',
        })
      }
    }
  }

  // Check for nodes with only incoming edges (end nodes without action)
  const outgoingNodeIds = new Set(edges.map(e => e.source))
  const actionNodes = nodes.filter(n => n.type === 'action')
  
  // Warn if action nodes have no outgoing edges but could benefit from them
  for (const node of actionNodes) {
    if (!outgoingNodeIds.has(node.id) && nodes.length > 1) {
      // This is a terminal node - not necessarily an error, but could be a warning
      // Only warn if there are other nodes that could connect
      const otherNodes = nodes.filter(n => n.id !== node.id)
      if (otherNodes.length > 0 && !errors.some(e => e.nodeId === node.id && e.field === 'connection')) {
        // Optional: add a warning that this is a terminal action
        // Keeping it silent for now as terminal actions are valid
      }
    }
  }

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
