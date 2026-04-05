import * as React from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { ValidationError } from '@/lib/workflow-validation'
import { validateWorkflow } from '@/lib/workflow-validation'
import type { WorkflowNode, WorkflowEdge } from '@/types/cron'

export interface ValidationSummary {
  total: number
  errors: number
  warnings: number
}

export interface ValidationResult {
  valid: boolean
  message: string
}

export interface UseWorkflowValidationReturn {
  errors: ValidationError[]
  summary: ValidationSummary
  validationResult: ValidationResult | null
  setValidationResult: (result: ValidationResult | null) => void
  validate: (nodes: Node[], edges: Edge[]) => { valid: boolean; message: string }
  clearValidationResult: () => void
}

export function useWorkflowValidation(): UseWorkflowValidationReturn {
  const [errors, setErrors] = React.useState<ValidationError[]>([])
  const [summary, setSummary] = React.useState<ValidationSummary>({ total: 0, errors: 0, warnings: 0 })
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null)

  const validate = React.useCallback((nodes: Node[], edges: Edge[]): { valid: boolean; message: string } => {
    const storeNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type as WorkflowNode['type'],
      position: node.position,
      data: {
        label: (node.data as Record<string, unknown>).label as string || (node.type as string),
        config: node.data as Record<string, unknown>,
      },
    })) as WorkflowNode[]

    const storeEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })) as WorkflowEdge[]

    const validationErrors = validateWorkflow(storeNodes, storeEdges)
    setErrors(validationErrors)

    const errorCount = validationErrors.filter((e) => e.severity === 'error').length
    const warningCount = validationErrors.filter((e) => e.severity === 'warning').length
    setSummary({
      total: validationErrors.length,
      errors: errorCount,
      warnings: warningCount,
    })

    let message = ''
    const hasAction = storeNodes.some((n) => n.type === 'action')

    if (validationErrors.length === 0) {
      message = 'Workflow is valid!'
    } else if (storeNodes.length === 0) {
      message = 'Workflow is empty. Add some nodes first.'
    } else if (!hasAction) {
      message = 'Missing action node. Add an action to process the workflow.'
    } else {
      message = 'Some nodes are not connected. Connect all nodes.'
    }

    return { valid: validationErrors.length === 0, message }
  }, [])

  const clearValidationResult = React.useCallback(() => {
    setValidationResult(null)
  }, [])

  return {
    errors,
    summary,
    validationResult,
    setValidationResult,
    validate,
    clearValidationResult,
  }
}
