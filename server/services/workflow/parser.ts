import type { WorkflowGraph } from './types.js'

export class WorkflowParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowParseError'
  }
}

export function parseWorkflowJson(workflowJson: string): WorkflowGraph {
  let parsed: unknown

  try {
    parsed = JSON.parse(workflowJson)
  } catch (error) {
    throw new WorkflowParseError(
      `Failed to parse workflow JSON: invalid JSON syntax - ${(error as Error).message}`
    )
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>

    if ('nodes' in obj && 'edges' in obj) {
      return {
        nodes: Array.isArray(obj.nodes) ? obj.nodes : [],
        edges: Array.isArray(obj.edges) ? obj.edges : [],
      }
    }

    if ('nodes_json' in obj && 'edges_json' in obj) {
      try {
        return {
          nodes: JSON.parse(String(obj.nodes_json)),
          edges: JSON.parse(String(obj.edges_json)),
        }
      } catch {
        throw new WorkflowParseError(
          'Failed to parse workflow JSON: nodes_json or edges_json contain invalid JSON'
        )
      }
    }
  }

  throw new WorkflowParseError(
    'Invalid workflow JSON structure: must contain nodes and edges arrays'
  )
}

export function validateWorkflow(workflow: WorkflowGraph): void {
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
