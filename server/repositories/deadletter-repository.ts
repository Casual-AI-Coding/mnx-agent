import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  DeadLetterQueueItem,
  DeadLetterQueueRow,
  CreateDeadLetterQueueItem,
  UpdateDeadLetterQueueItem,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToDeadLetterQueueItem(row: DeadLetterQueueRow): DeadLetterQueueItem {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
  return {
    ...row,
    payload,
  }
}

export class DeadLetterRepository extends BaseRepository<DeadLetterQueueItem, CreateDeadLetterQueueItem, UpdateDeadLetterQueueItem> {
  protected readonly tableName = 'dead_letter_queue'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): DeadLetterQueueItem {
    return rowToDeadLetterQueueItem(row as DeadLetterQueueRow)
  }

  async create(data: CreateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem> {
    const id = uuidv4()
    const now = toISODate()
    const payload = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload)

    await this.conn.execute(
      `INSERT INTO dead_letter_queue (id, original_task_id, job_id, owner_id, task_type, payload, error_message, retry_count, max_retries, failed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, data.original_task_id ?? null, data.job_id ?? null, ownerId ?? null, data.task_type, payload, data.error_message ?? null, data.retry_count ?? 0, data.max_retries ?? 3, now, now]
    )

    return (await this.getById(id))!
  }

  async listItems(ownerId?: string, limit: number = 50): Promise<DeadLetterQueueItem[]> {
    let sql: string
    let params: (string | number)[]

    if (ownerId) {
      sql = `SELECT * FROM dead_letter_queue WHERE owner_id = $1 AND resolved_at IS NULL ORDER BY failed_at DESC LIMIT $2`
      params = [ownerId, limit]
    } else {
      sql = `SELECT * FROM dead_letter_queue WHERE resolved_at IS NULL ORDER BY failed_at DESC LIMIT $1`
      params = [limit]
    }

    const rows = await this.conn.query<DeadLetterQueueRow>(sql, params)
    return rows.map(rowToDeadLetterQueueItem)
  }

  async update(id: string, data: UpdateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number)[] = []
    let paramIndex = 1

    if (data.resolved_at !== undefined) {
      fields.push(`resolved_at = $${paramIndex}`)
      values.push(data.resolved_at)
      paramIndex++
    }
    if (data.resolution !== undefined) {
      fields.push(`resolution = $${paramIndex}`)
      values.push(data.resolution)
      paramIndex++
    }
    if (data.retry_count !== undefined) {
      fields.push(`retry_count = $${paramIndex}`)
      values.push(data.retry_count)
      paramIndex++
    }

    if (fields.length === 0) return existing

    values.push(id)
    if (ownerId) {
      values.push(ownerId)
      await this.conn.execute(
        `UPDATE dead_letter_queue SET ${fields.join(', ')} WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}`,
        values
      )
    } else {
      await this.conn.execute(
        `UPDATE dead_letter_queue SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      )
    }

    return this.getById(id, ownerId)
  }

  async markResolved(id: string, resolution: string, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    return this.update(id, {
      resolved_at: toISODate(),
      resolution,
    }, ownerId)
  }
}
