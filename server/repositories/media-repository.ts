import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  MediaRecord,
  MediaRecordRow,
  CreateMediaRecord,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'
import type { MediaType, MediaSource } from '../database/types.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToMediaRecord(row: MediaRecordRow): MediaRecord {
  const metadata = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null
  return {
    ...row,
    type: row.type as MediaType,
    source: row.source as MediaSource | null,
    size_bytes: typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
    is_deleted: typeof row.is_deleted === 'boolean' ? row.is_deleted : row.is_deleted === 1,
    metadata,
  }
}

export interface MediaListOptions {
  type?: string
  source?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
  ownerId?: string
}

export class MediaRepository extends BaseRepository<MediaRecord, CreateMediaRecord, Partial<MediaRecord>> {
  protected readonly tableName = 'media_records'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): MediaRecord {
    return rowToMediaRecord(row as MediaRecordRow)
  }

  async getById(id: string, ownerId?: string): Promise<MediaRecord | null> {
    if (ownerId) {
      const rows = await this.conn.query<MediaRecordRow>(
        `SELECT * FROM media_records WHERE id = $1 AND owner_id = $2`,
        [id, ownerId]
      )
      return rows[0] ? rowToMediaRecord(rows[0]) : null
    }
    const rows = await this.conn.query<MediaRecordRow>(
      `SELECT * FROM media_records WHERE id = $1`,
      [id]
    )
    return rows[0] ? rowToMediaRecord(rows[0]) : null
  }

  async list(options: MediaListOptions = {}): Promise<{ items: MediaRecord[]; total: number }> {
    const { type, source, limit = 50, offset = 0, includeDeleted = false, ownerId } = options

    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      whereClause = `owner_id = $${paramIndex}`
      params.push(ownerId)
      paramIndex++
    }

    if (!includeDeleted) {
      if (this.isPostgres()) {
        whereClause += whereClause ? ` AND is_deleted = false` : `is_deleted = false`
      } else {
        whereClause += whereClause ? ` AND is_deleted = 0` : `is_deleted = 0`
      }
    }

    if (type) {
      whereClause += whereClause ? ` AND type = $${paramIndex}` : `type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (source) {
      whereClause += whereClause ? ` AND source = $${paramIndex}` : `source = $${paramIndex}`
      params.push(source)
      paramIndex++
    }

    if (whereClause) {
      whereClause = 'WHERE ' + whereClause
    }

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM media_records ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<MediaRecordRow>(
      `SELECT * FROM media_records ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      items: rows.map(rowToMediaRecord),
      total,
    }
  }

  async create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    const id = uuidv4()
    const now = toISODate()
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null

    await this.conn.execute(
      `INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, created_at, updated_at, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, data.filename, data.original_name ?? null, data.filepath, data.type, data.mime_type ?? null, data.size_bytes, data.source ?? null, data.task_id ?? null, metadata, now, now, ownerId ?? null]
    )

    return (await this.getById(id))!
  }

  async update(
    id: string,
    data: { original_name?: string | null; metadata?: Record<string, unknown> | null },
    ownerId?: string
  ): Promise<MediaRecord | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const now = toISODate()
    const metadata = data.metadata !== undefined
      ? (data.metadata ? JSON.stringify(data.metadata) : null)
      : existing.metadata

    if (ownerId) {
      await this.conn.execute(
        'UPDATE media_records SET original_name = $1, metadata = $2, updated_at = $3 WHERE id = $4 AND owner_id = $5',
        [data.original_name ?? existing.original_name, metadata, now, id, ownerId]
      )
    } else {
      await this.conn.execute(
        'UPDATE media_records SET original_name = $1, metadata = $2, updated_at = $3 WHERE id = $4',
        [data.original_name ?? existing.original_name, metadata, now, id]
      )
    }

    return this.getById(id, ownerId)
  }

  async softDelete(id: string, ownerId?: string): Promise<boolean> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return false

    const now = toISODate()

    if (ownerId) {
      if (this.isPostgres()) {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = true, deleted_at = $1, updated_at = $2 WHERE id = $3 AND owner_id = $4',
          [now, now, id, ownerId]
        )
      } else {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
          [now, now, id, ownerId]
        )
      }
    } else {
      if (this.isPostgres()) {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = true, deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
      } else {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?',
          [now, now, id]
        )
      }
    }
    return true
  }

  async hardDelete(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM media_records WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM media_records WHERE id = $1', [id])
    return result.changes > 0
  }

  async softDeleteBatch(ids: string[]): Promise<{ deleted: number; failed: number }> {
    if (ids.length === 0) {
      return { deleted: 0, failed: 0 }
    }

    const now = toISODate()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')

    if (this.isPostgres()) {
      const result = await this.conn.execute(
        `UPDATE media_records SET is_deleted = true, deleted_at = $${ids.length + 1}, updated_at = $${ids.length + 2} WHERE id IN (${placeholders})`,
        [...ids, now, now]
      )
      return { deleted: result.changes, failed: ids.length - result.changes }
    } else {
      const result = await this.conn.execute(
        `UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [now, now, ...ids]
      )
      return { deleted: result.changes, failed: ids.length - result.changes }
    }
  }

  async getByIds(ids: string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) return []

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')

    if (this.isPostgres()) {
      const rows = await this.conn.query<MediaRecordRow>(
        `SELECT * FROM media_records WHERE id IN (${placeholders}) AND is_deleted = false`,
        ids
      )
      return rows.map(rowToMediaRecord)
    } else {
      const rows = await this.conn.query<MediaRecordRow>(
        `SELECT * FROM media_records WHERE id IN (${placeholders}) AND is_deleted = 0`,
        ids
      )
      return rows.map(rowToMediaRecord)
    }
  }
}
