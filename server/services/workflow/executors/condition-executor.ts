import type { WorkflowNode } from '../types.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { resolveTemplateString } from '../template-resolver.js'

export interface ConditionExecutorDeps {
  executionLogId: string | null
  workflowId: string | null
  eventBus: IEventBus
}

export async function executeConditionNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  deps: ConditionExecutorDeps
): Promise<boolean> {
  const { executionLogId, workflowId, eventBus } = deps
  const condition = config.condition as string | undefined
  if (!condition) {
    throw new Error('Condition node requires a condition config')
  }

  const detailStartTime = Date.now()

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
  }

  try {
    const resolvedCondition = resolveTemplateString(condition, nodeOutputs)
    const result = evaluateCondition(resolvedCondition)

    if (executionLogId) {
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, result, Date.now() - detailStartTime)
    }

    return result
  } catch (error) {
    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }
    throw error
  }
}

export function evaluateCondition(condition: string): boolean {
  const truthyValues = ['true', 'yes', '1', 'success']
  const falsyValues = ['false', 'no', '0', 'fail', 'null', 'undefined', '']

  if (truthyValues.includes(condition.toLowerCase())) return true
  if (falsyValues.includes(condition.toLowerCase())) return false

  const comparisonPatterns = [
    { pattern: /^(.+)==(.+)$/, evaluate: (a: string, b: string) => a.trim() === b.trim() },
    { pattern: /^(.+)!=(.+)$/, evaluate: (a: string, b: string) => a.trim() !== b.trim() },
    {
      pattern: /^(.+)>=(.+)$/,
      evaluate: (a: string, b: string) => parseFloat(a.trim()) >= parseFloat(b.trim()),
    },
    {
      pattern: /^(.+)<=(.+)$/,
      evaluate: (a: string, b: string) => parseFloat(a.trim()) <= parseFloat(b.trim()),
    },
    { pattern: /^(.+)>(.+)$/, evaluate: (a: string, b: string) => parseFloat(a.trim()) > parseFloat(b.trim()) },
    { pattern: /^(.+)<(.+)$/, evaluate: (a: string, b: string) => parseFloat(a.trim()) < parseFloat(b.trim()) },
    {
      pattern: /^(.+)contains(.+)$/,
      evaluate: (a: string, b: string) => a.trim().includes(b.trim()),
    },
  ]

  for (const { pattern, evaluate } of comparisonPatterns) {
    const match = condition.match(pattern)
    if (match) {
      return evaluate(match[1], match[2])
    }
  }

  return condition.trim().length > 0
}
