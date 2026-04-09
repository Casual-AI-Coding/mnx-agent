import type { TaskResult, WorkflowEdge, WorkflowGraph, WorkflowNode } from '../types.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { resolveTemplateString } from '../template-resolver.js'
import { buildExecutionOrder } from '../topological-sort.js'

export interface LoopExecutorDeps {
  executionLogId: string | null
  workflowId: string | null
  workflowNodes: WorkflowNode[]
  workflowEdges: WorkflowEdge[]
  resolveNodeConfig: (config: Record<string, unknown>, nodeOutputs: Map<string, unknown>) => Record<string, unknown>
  executeNode: (node: WorkflowNode, config: Record<string, unknown>, nodeOutputs: Map<string, unknown>) => Promise<TaskResult>
  eventBus: IEventBus
}

export async function executeLoopNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  deps: LoopExecutorDeps
): Promise<{ iterations: number; results: unknown[] }> {
  const {
    executionLogId,
    workflowId,
    workflowNodes,
    workflowEdges,
    resolveNodeConfig,
    executeNode,
    eventBus,
  } = deps

  const items = config.items as string | undefined
  const maxIterations = (config.maxIterations as number) ?? 10
  const condition = config.condition as string | undefined
  const subNodes = config.subNodes as WorkflowNode[] | undefined
  const subEdges = config.subEdges as WorkflowEdge[] | undefined

  const detailStartTime = Date.now()

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
  }

  try {
    let itemsArray: unknown[] = []
    if (items) {
      const resolved = resolveTemplateString(items, nodeOutputs)
      try {
        itemsArray = JSON.parse(resolved)
      } catch {
        itemsArray = [resolved]
      }
    }

    const bodyNodes = findLoopBodyNodes(node.id, workflowNodes, workflowEdges)
    const bodyEdges = findLoopBodyEdges(node.id, workflowNodes, workflowEdges)

    const results: unknown[] = []
    let iterationCount = 0

    while (iterationCount < maxIterations) {
      if (itemsArray.length > 0 && iterationCount >= itemsArray.length) break

      if (itemsArray.length > 0) {
        nodeOutputs.set('item', itemsArray[iterationCount])
      }
      nodeOutputs.set('index', iterationCount)

      if (condition) {
        const resolved = resolveTemplateString(condition, nodeOutputs)
        if (!evaluateLoopCondition(resolved)) break
      }

      const nodesToExecute = bodyNodes.length > 0 ? bodyNodes : subNodes
      const edgesToUse = bodyNodes.length > 0 ? bodyEdges : subEdges

      if (nodesToExecute && nodesToExecute.length > 0) {
        const iterationOutputs = new Map(nodeOutputs)
        const subGraph: WorkflowGraph = { nodes: nodesToExecute, edges: edgesToUse || [] }
        const executionOrder = buildExecutionOrder(subGraph)

        let iterationResult: unknown = undefined
        for (const subNodeId of executionOrder) {
          const subNode = nodesToExecute.find((n) => n.id === subNodeId)
          if (!subNode) continue

          const resolvedConfig = resolveNodeConfig(subNode.data.config, iterationOutputs)
          const subResult = await executeNode(subNode, resolvedConfig, iterationOutputs)

          if (!subResult.success) {
            throw new Error(
              `Loop iteration ${iterationCount}: subNode ${subNodeId} failed - ${subResult.error}`
            )
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

    if (executionLogId) {
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, loopResult, Date.now() - detailStartTime)
    }

    return loopResult
  } catch (error) {
    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }
    throw error
  }
}

function findLoopBodyNodes(
  loopNodeId: string,
  workflowNodes: WorkflowNode[],
  workflowEdges: WorkflowEdge[]
): WorkflowNode[] {
  const bodyNodeIds = new Set<string>()

  for (const edge of workflowEdges) {
    if (edge.source === loopNodeId && edge.sourceHandle === 'body') {
      bodyNodeIds.add(edge.target)
    }
  }

  return workflowNodes.filter((n) => bodyNodeIds.has(n.id))
}

function findLoopBodyEdges(
  loopNodeId: string,
  _workflowNodes: WorkflowNode[],
  workflowEdges: WorkflowEdge[]
): WorkflowEdge[] {
  const bodyNodeIds = new Set<string>()

  for (const edge of workflowEdges) {
    if (edge.source === loopNodeId && edge.sourceHandle === 'body') {
      bodyNodeIds.add(edge.target)
    }
  }

  return workflowEdges.filter(
    (edge) => bodyNodeIds.has(edge.source) && bodyNodeIds.has(edge.target)
  )
}

function evaluateLoopCondition(condition: string): boolean {
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
