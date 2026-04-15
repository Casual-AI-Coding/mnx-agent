import type { DatabaseService } from '../database/service-async.js'
import type { ExecutionState, ExecutionStateRow, CreateExecutionState, UpdateExecutionState } from '../database/types.js'
import { randomUUID } from 'crypto'
import { toLocalISODateString } from '../lib/date-utils.js'

function rowToExecutionState(row: ExecutionStateRow): ExecutionState {
  return {
    ...row,
    status: row.status as ExecutionState['status'],
  }
}

export class ExecutionStateManager {
  constructor(private db: DatabaseService) {}

  async create(data: CreateExecutionState): Promise<ExecutionState> {
    const id = `exec_${randomUUID().replace(/-/g, '')}`
    const now = toLocalISODateString()
    
    const status = data.status ?? 'running'
    const currentLayer = data.current_layer ?? 0
    const completedNodes = JSON.stringify(data.completed_nodes ?? [])
    const failedNodes = JSON.stringify(data.failed_nodes ?? [])
    const nodeOutputs = JSON.stringify(data.node_outputs ?? {})
    const context = JSON.stringify(data.context ?? {})
    const createdBy = data.created_by ?? null

    await this.db.run(
      `INSERT INTO execution_states (
        id, execution_log_id, workflow_id, status, current_layer,
        completed_nodes, failed_nodes, node_outputs, context, created_by,
        started_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        data.execution_log_id,
        data.workflow_id,
        status,
        currentLayer,
        completedNodes,
        failedNodes,
        nodeOutputs,
        context,
        createdBy,
        now,
        now,
      ]
    )
    
    return (await this.getById(id))!
  }

  async getById(id: string): Promise<ExecutionState | undefined> {
    const row = await this.db.get<ExecutionStateRow>(
      'SELECT * FROM execution_states WHERE id = $1',
      [id]
    )
    return row ? rowToExecutionState(row) : undefined
  }

  async getByExecutionLogId(logId: string): Promise<ExecutionState | undefined> {
    const row = await this.db.get<ExecutionStateRow>(
      'SELECT * FROM execution_states WHERE execution_log_id = $1',
      [logId]
    )
    return row ? rowToExecutionState(row) : undefined
  }

  async update(id: string, data: UpdateExecutionState): Promise<void> {
    const sets: string[] = ['updated_at = $1']
    const values: unknown[] = [toLocalISODateString()]
    let paramIndex = 2
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sets.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }
    values.push(id)
    
    await this.db.run(
      `UPDATE execution_states SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  async markNodeComplete(id: string, nodeId: string, output: unknown): Promise<void> {
    const state = await this.getById(id)
    if (!state) throw new Error(`Execution state ${id} not found`)

    const completedNodes = JSON.parse(state.completed_nodes) as string[]
    const nodeOutputs = JSON.parse(state.node_outputs) as Record<string, unknown>

    if (!completedNodes.includes(nodeId)) {
      completedNodes.push(nodeId)
    }
    nodeOutputs[nodeId] = output

    await this.update(id, {
      completed_nodes: JSON.stringify(completedNodes),
      node_outputs: JSON.stringify(nodeOutputs),
    })
  }

  async markNodeFailed(id: string, nodeId: string, error: string): Promise<void> {
    const state = await this.getById(id)
    if (!state) throw new Error(`Execution state ${id} not found`)

    const failedNodes = JSON.parse(state.failed_nodes) as Array<{ nodeId: string; error: string; timestamp: string }>
    failedNodes.push({ nodeId, error, timestamp: toLocalISODateString() })

    await this.update(id, {
      failed_nodes: JSON.stringify(failedNodes),
    })
  }

  async pause(id: string): Promise<void> {
    await this.update(id, {
      status: 'paused',
      paused_at: toLocalISODateString(),
    })
  }

  async resume(id: string): Promise<void> {
    await this.update(id, {
      status: 'resumed',
      resumed_at: toLocalISODateString(),
    })
  }

  async complete(id: string): Promise<void> {
    await this.update(id, {
      status: 'completed',
      completed_at: toLocalISODateString(),
    })
  }

  async fail(id: string): Promise<void> {
    await this.update(id, {
      status: 'failed',
      completed_at: toLocalISODateString(),
    })
  }

  async getRunningExecutions(): Promise<ExecutionState[]> {
    const rows = await this.db.all<ExecutionStateRow>(
      "SELECT * FROM execution_states WHERE status = 'running'"
    )
    return rows.map(rowToExecutionState)
  }

  async getPausedExecutions(): Promise<ExecutionState[]> {
    const rows = await this.db.all<ExecutionStateRow>(
      "SELECT * FROM execution_states WHERE status = 'paused'"
    )
    return rows.map(rowToExecutionState)
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM execution_states WHERE id = $1', [id])
  }
}