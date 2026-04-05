import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import { TaskStatus } from '../database/types.js'
import type {
  TaskQueueItem,
  TaskQueueRow,
  CreateTaskQueueItem,
  UpdateTaskQueueItem,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToTaskQueueItem(row: TaskQueueRow): TaskQueueItem {
  return { ...row, status: row.status as TaskStatus }
}

export interface TaskListOptions {
  status?: TaskStatus
  ownerId?: string
  jobId?: string
  limit?: number
  offset?: number
}

export class TaskRepository extends BaseRepository<TaskQueueItem, CreateTaskQueueItem, UpdateTaskQueueItem> {
  protected readonly tableName = 'task_queue'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): TaskQueueItem {
    return rowToTaskQueueItem(row as TaskQueueRow)
  }

  async listTasks(options: TaskListOptions = {}): Promise<{ tasks: TaskQueueItem[]; total: number }> {
    const { status, ownerId, jobId, limit = 50, offset = 0 } = options

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      conditions.push(`owner_id = $${paramIndex}`)
      params.push(ownerId)
      paramIndex++
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (jobId) {
      conditions.push(`job_id = $${paramIndex}`)
      params.push(jobId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM task_queue ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<TaskQueueRow>(
      `SELECT * FROM task_queue ${whereClause} ORDER BY priority DESC, created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      tasks: rows.map(rowToTaskQueueItem),
      total,
    }
  }

  async getPayload(id: string): Promise<{ payload: string; result: string | null } | null> {
    const rows = await this.conn.query<{ payload: string; result: string | null }>(
      'SELECT payload, result FROM task_queue WHERE id = $1',
      [id]
    )
    return rows[0] ?? null
  }

  async create(task: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO task_queue (id, job_id, task_type, payload, priority, status, max_retries, created_at, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, task.job_id ?? null, task.task_type, task.payload, task.priority ?? 0, task.status ?? TaskStatus.PENDING, task.max_retries ?? 3, now, ownerId ?? null]
    )
    return (await this.getById(id))!
  }

  async update(id: string, updates: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`)
      values.push(updates.status)
      paramIndex++
    }
    if (updates.retry_count !== undefined) {
      fields.push(`retry_count = $${paramIndex}`)
      values.push(updates.retry_count)
      paramIndex++
    }
    if (updates.error_message !== undefined) {
      fields.push(`error_message = $${paramIndex}`)
      values.push(updates.error_message)
      paramIndex++
    }
    if (updates.result !== undefined) {
      fields.push(`result = $${paramIndex}`)
      values.push(updates.result)
      paramIndex++
    }
    if (updates.started_at !== undefined) {
      fields.push(`started_at = $${paramIndex}`)
      values.push(updates.started_at)
      paramIndex++
    }
    if (updates.completed_at !== undefined) {
      fields.push(`completed_at = $${paramIndex}`)
      values.push(updates.completed_at)
      paramIndex++
    }

    if (fields.length === 0) return existing
    values.push(id)

    await this.conn.execute(
      `UPDATE task_queue SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getById(id)
  }

  async getPendingByJob(jobId: string | null, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    let rows: TaskQueueRow[]
    if (jobId) {
      if (ownerId) {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE job_id = $1 AND status = $2 AND owner_id = $3 ORDER BY priority DESC, created_at ASC LIMIT $4',
          [jobId, 'pending', ownerId, limit]
        )
      } else {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE job_id = $1 AND status = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
          [jobId, 'pending', limit]
        )
      }
    } else {
      if (ownerId) {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE status = $1 AND owner_id = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
          ['pending', ownerId, limit]
        )
      } else {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2',
          ['pending', limit]
        )
      }
    }
    return rows.map(rowToTaskQueueItem)
  }

  async getPendingCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM task_queue WHERE status = $1',
      ['pending']
    )
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getPendingByType(taskType: string, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    let rows: TaskQueueRow[]
    if (ownerId) {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE task_type = $1 AND status = $2 AND owner_id = $3 ORDER BY priority DESC, created_at ASC LIMIT $4',
        [taskType, 'pending', ownerId, limit]
      )
    } else {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE task_type = $1 AND status = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
        [taskType, 'pending', limit]
      )
    }
    return rows.map(rowToTaskQueueItem)
  }

  async getRunningCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM task_queue WHERE status = $1',
      ['running']
    )
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getFailedCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM task_queue WHERE status = $1',
      ['failed']
    )
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getCountsByStatus(ownerId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    const sql = ownerId
      ? `SELECT status, COUNT(*) as count FROM task_queue WHERE owner_id = $1 GROUP BY status`
      : `SELECT status, COUNT(*) as count FROM task_queue GROUP BY status`
    const rows = await this.conn.query<{ status: string; count: string }>(
      ownerId ? sql : sql.replace('WHERE owner_id = $1', ''),
      ownerId ? [ownerId] : []
    )
    const counts = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }
    for (const row of rows) {
      const count = parseInt(row.count, 10)
      counts.total += count
      if (row.status in counts) {
        (counts as Record<string, number>)[row.status] = count
      }
    }
    return counts
  }

  async markRunning(id: string): Promise<TaskQueueItem | null> {
    await this.conn.execute(
      `UPDATE task_queue SET status = 'running', started_at = $1 WHERE id = $2`,
      [toISODate(), id]
    )
    return this.getById(id)
  }

  async markCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> {
    if (ownerId) {
      await this.conn.execute(
        `UPDATE task_queue SET status = 'completed', completed_at = $1, result = $2 WHERE id = $3 AND owner_id = $4`,
        [toISODate(), result ?? null, id, ownerId]
      )
    } else {
      await this.conn.execute(
        `UPDATE task_queue SET status = 'completed', completed_at = $1, result = $2 WHERE id = $3`,
        [toISODate(), result ?? null, id]
      )
    }
    return this.getById(id, ownerId)
  }

  async markFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const newRetryCount = existing.retry_count + 1
    const newStatus = newRetryCount >= existing.max_retries ? 'failed' : 'pending'

    if (ownerId) {
      await this.conn.execute(
        `UPDATE task_queue SET status = $1, retry_count = $2, error_message = $3, completed_at = $4 WHERE id = $5 AND owner_id = $6`,
        [newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id, ownerId]
      )
    } else {
      await this.conn.execute(
        `UPDATE task_queue SET status = $1, retry_count = $2, error_message = $3, completed_at = $4 WHERE id = $5`,
        [newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id]
      )
    }
    return this.getById(id, ownerId)
  }

  async getByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> {
    if (ownerId) {
      const rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE job_id = $1 AND owner_id = $2 ORDER BY created_at ASC',
        [jobId, ownerId]
      )
      return rows.map(rowToTaskQueueItem)
    }
    const rows = await this.conn.query<TaskQueueRow>(
      'SELECT * FROM task_queue WHERE job_id = $1 ORDER BY created_at ASC',
      [jobId]
    )
    return rows.map(rowToTaskQueueItem)
  }

  async updateStatus(
    taskId: string,
    status: TaskStatus,
    updates?: {
      started_at?: string | null
      completed_at?: string | null
      error_message?: string | null
      result?: string | null
    },
    ownerId?: string
  ): Promise<void> {
    const existing = await this.getById(taskId, ownerId)
    if (!existing) return

    const fields: string[] = ['status = $1']
    const values: (string | number | null)[] = [status]
    let paramIndex = 2

    if (updates?.started_at !== undefined) {
      fields.push(`started_at = $${paramIndex}`)
      values.push(updates.started_at)
      paramIndex++
    }
    if (updates?.completed_at !== undefined) {
      fields.push(`completed_at = $${paramIndex}`)
      values.push(updates.completed_at)
      paramIndex++
    }
    if (updates?.error_message !== undefined) {
      fields.push(`error_message = $${paramIndex}`)
      values.push(updates.error_message)
      paramIndex++
    }
    if (updates?.result !== undefined) {
      fields.push(`result = $${paramIndex}`)
      values.push(updates.result)
      paramIndex++
    }
    values.push(taskId)
    if (ownerId) {
      values.push(ownerId)
    }

    const whereClause = ownerId ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}` : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE task_queue SET ${fields.join(', ')} ${whereClause}`,
      values
    )
  }

  async updateStatusBatch(taskIds: string[], status: TaskStatus, ownerId?: string): Promise<number> {
    if (taskIds.length === 0) {
      return 0
    }

    const values: (string | number)[] = [status]
    let paramIndex = 2

    const idPlaceholders: string[] = []
    for (let i = 0; i < taskIds.length; i++) {
      idPlaceholders.push(this.isPostgres() ? `$${paramIndex}` : '?')
      values.push(taskIds[i])
      paramIndex++
    }

    let sql: string
    if (ownerId) {
      values.push(ownerId)
      sql = `UPDATE task_queue SET status = $1 WHERE id IN (${idPlaceholders.join(', ')}) AND owner_id = $${paramIndex}`
    } else {
      sql = `UPDATE task_queue SET status = $1 WHERE id IN (${idPlaceholders.join(', ')})`
    }

    const result = await this.conn.execute(sql, values)
    return result.changes
  }

  async getQueueStats(jobId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    const stats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    }

    let rows: { status: string; count: string }[]

    if (jobId) {
      rows = await this.conn.query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) as count FROM task_queue WHERE job_id = $1 GROUP BY status',
        [jobId]
      )
    } else {
      rows = await this.conn.query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) as count FROM task_queue GROUP BY status'
      )
    }

    for (const row of rows) {
      const count = parseInt(row.count, 10)
      stats.total += count
      switch (row.status) {
        case 'pending':
          stats.pending = count
          break
        case 'running':
          stats.running = count
          break
        case 'completed':
          stats.completed = count
          break
        case 'failed':
          stats.failed = count
          break
        case 'cancelled':
          stats.cancelled = count
          break
      }
    }

    return stats
  }
}
