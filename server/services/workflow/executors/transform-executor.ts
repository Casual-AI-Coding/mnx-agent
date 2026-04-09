import type { WorkflowNode } from '../types.js'
import type { IEventBus } from '../../interfaces/event-bus.interface.js'
import { getValueAtPath } from '../template-resolver.js'
import { evaluateCondition } from './condition-executor.js'

export interface TransformExecutorDeps {
  executionLogId: string | null
  workflowId: string | null
  eventBus: IEventBus
}

export async function executeTransformNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  nodeOutputs: Map<string, unknown>,
  deps: TransformExecutorDeps
): Promise<unknown> {
  const { executionLogId, workflowId, eventBus } = deps
  const transformType = (config.transformType as string) || 'passthrough'
  const inputPath = config.inputPath as string | undefined
  const outputFormat = config.outputFormat as string | undefined
  const inputNodeId = config.inputNode as string | undefined

  const detailStartTime = Date.now()

  if (executionLogId) {
    eventBus.emitWorkflowNodeStart(node.id, executionLogId, workflowId || undefined)
  }

  try {
    let inputData: unknown

    if (inputNodeId) {
      inputData = nodeOutputs.get(inputNodeId)
      if (inputPath && inputData) {
        inputData = getValueAtPath(inputData, inputPath)
      }
    }

    let outputData: unknown = inputData

    switch (transformType) {
      case 'passthrough':
        outputData = inputData
        break
      case 'extract':
        if (outputFormat) {
          outputData = extractData(inputData, outputFormat)
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
          const sanitizedCondition = filterCondition.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          outputData = inputData.filter((item) => {
            const conditionStr = sanitizedCondition.replace(/\$item/g, JSON.stringify(item))
            return evaluateCondition(conditionStr)
          })
        }
        break
      }
      case 'format':
        if (typeof inputData === 'object' && outputFormat) {
          outputData = formatOutput(inputData, outputFormat)
        }
        break
      default:
        throw new Error(`Unknown transform type: ${transformType}`)
    }

    if (executionLogId) {
      eventBus.emitWorkflowNodeComplete(node.id, executionLogId, outputData, Date.now() - detailStartTime)
    }

    return outputData
  } catch (error) {
    if (executionLogId) {
      eventBus.emitWorkflowNodeError(node.id, executionLogId, (error as Error).message)
    }
    throw error
  }
}

function extractData(data: unknown, format: string): unknown {
  if (typeof data !== 'object' || data === null) return data

  const dataObj = data as Record<string, unknown>

  if (format.includes('.')) {
    return getValueAtPath(data, format)
  }

  if (format in dataObj) {
    return dataObj[format]
  }

  return data
}

function formatOutput(data: unknown, format: string): unknown {
  if (typeof data !== 'object' || data === null) return data

  try {
    if (format.startsWith('{') || format.startsWith('[')) {
      const template = JSON.parse(format)
      return applyFormatTemplate(data, template)
    }

    return getValueAtPath(data, format)
  } catch {
    return data
  }
}

function applyFormatTemplate(data: unknown, template: unknown): unknown {
  if (typeof template === 'string') {
    return getValueAtPath(data, template)
  }

  if (Array.isArray(template)) {
    return template.map((t) => applyFormatTemplate(data, t))
  }

  if (typeof template === 'object' && template !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(template)) {
      result[key] = applyFormatTemplate(data, value)
    }
    return result
  }

  return template
}
