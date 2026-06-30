import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  MediaRecord,
  CreateMediaRecord,
  FavoriteRecord,
  FavoriteRecordRow,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'
import { buildMediaListQuery } from './media/media-list-query-builder.js'
import { mapMediaListRow, mapMediaRecordRow } from './media/media-row-mapper.js'
import type { MediaListDatabaseRow, MediaRecordDatabaseRow } from './media/media-row-mapper.js'

import { toLocalISODateString } from '../lib/date-utils.js'

export interface MediaListOptions {
  type?: string
  source?: string
  search?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
  visibilityOwnerId?: string
  favoriteFilter?: ('favorite' | 'non-favorite')[]
  publicFilter?: ('private' | 'public' | 'others-public')[]
  favoriteUserId?: string
  role?: 'user' | 'pro' | 'admin' | 'super'
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
    return mapMediaRecordRow(row)
  }

  async getById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> {
    if (ownerId) {
      // For read operations, allow access to public records
      // For write operations, strict owner check
      const whereClause = includePublic
        ? `SELECT * FROM media_records WHERE id = $1 AND (owner_id = $2 OR is_public = true)`
        : `SELECT * FROM media_records WHERE id = $1 AND owner_id = $2`
      const rows = await this.conn.query<MediaRecordDatabaseRow>(whereClause, [id, ownerId])
      return rows[0] ? mapMediaRecordRow(rows[0]) : null
    }
    const rows = await this.conn.query<MediaRecordDatabaseRow>(
      `SELECT * FROM media_records WHERE id = $1`,
      [id]
    )
    return rows[0] ? mapMediaRecordRow(rows[0]) : null
  }

  async list(options: MediaListOptions = {}): Promise<{ items: MediaRecord[]; total: number }> {
    const { type, source, search, limit = 50, offset = 0, includeDeleted = false, visibilityOwnerId, favoriteFilter, publicFilter, favoriteUserId, role } = options
    const query = buildMediaListQuery({
      type,
      source,
      search,
      limit,
      offset,
      includeDeleted,
      visibilityOwnerId,
      favoriteFilter,
      publicFilter,
      favoriteUserId,
      role,
      isPostgres: this.isPostgres(),
    })

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM media_records m ${query.joinClause} ${query.whereClause}`,
      [...query.params]
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    const rows = await this.conn.query<MediaListDatabaseRow>(
      `SELECT ${query.selectClause} FROM media_records m ${query.joinClause} ${query.whereClause} ORDER BY m.created_at DESC ${query.pagination.clause}`,
      [...query.params, ...query.pagination.params]
    )

    return {
      items: rows.map(row => mapMediaListRow(row, Boolean(favoriteUserId))),
      total,
    }
  }

  async create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null

    await this.conn.execute(
      `INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, created_at, updated_at, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, data.filename, data.original_name ?? null, data.filepath, data.type, data.mime_type ?? null, data.size_bytes, data.source ?? null, data.task_id ?? null, metadata, now, now, ownerId ?? null]
    )

    const created = await this.getById(id)
    if (!created) {
      throw new Error(`Failed to create media record ${id}`)
    }
    return created
  }

  async update(
    id: string,
    data: { original_name?: string | null; metadata?: Record<string, unknown> | null },
    ownerId?: string
  ): Promise<MediaRecord | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const now = toLocalISODateString()
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

    const now = toLocalISODateString()

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

  async softDeleteBatch(ids: string[], ownerId?: string): Promise<{ deleted: number; failed: number }> {
    if (ids.length === 0) {
      return { deleted: 0, failed: 0 }
    }

    const now = toLocalISODateString()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')

    if (this.isPostgres()) {
      // deleted_at 和 updated_at 共享同一个参数索引 $[ids.length+2]
      const params: (string | number | boolean)[] = [...ids, true, now]
      let whereClause = `WHERE id IN (${placeholders})`

      if (ownerId) {
        const idx = ids.length + 3
        whereClause += ` AND owner_id = $${idx}`
        params.push(ownerId)
      }

      const result = await this.conn.execute(
        `UPDATE media_records SET is_deleted = $${ids.length + 1}, deleted_at = $${ids.length + 2}, updated_at = $${ids.length + 2} ${whereClause}`,
        params
      )
      return { deleted: result.changes, failed: ids.length - result.changes }
    } else {
      // SQLite: ? 按位置映射，需要 [now, now, ...ids] 的顺序
      const sqlitePlaceholders = ids.map(() => '?').join(',')
      const params: (string | number | boolean)[] = [now, now, ...ids]
      let whereClause = `WHERE id IN (${sqlitePlaceholders})`

      if (ownerId) {
        whereClause += ` AND owner_id = ?`
        params.push(ownerId)
      }

      const result = await this.conn.execute(
        `UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? ${whereClause}`,
        params
      )
      return { deleted: result.changes, failed: ids.length - result.changes }
    }
  }

  async getByIds(ids: string[], ownerId?: string): Promise<MediaRecord[]> {
    if (ids.length === 0) return []

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const params: string[] = [...ids]
    let whereClause = `WHERE id IN (${placeholders}) AND is_deleted = false`

    if (ownerId) {
      const idx = ids.length + 1
      whereClause += ` AND owner_id = $${idx}`
      params.push(ownerId)
    }

    if (this.isPostgres()) {
      const rows = await this.conn.query<MediaRecordDatabaseRow>(
        `SELECT * FROM media_records ${whereClause}`,
        params
      )
      return rows.map(mapMediaRecordRow)
    } else {
      const rows = await this.conn.query<MediaRecordDatabaseRow>(
        `SELECT * FROM media_records ${whereClause}`,
        params
      )
      return rows.map(mapMediaRecordRow)
    }
  }

  async findFavorite(userId: string, mediaId: string): Promise<FavoriteRecord | null> {
    const rows = await this.conn.query<FavoriteRecordRow>(
      `SELECT id, user_id, media_id, is_deleted, created_at, updated_at
       FROM user_media_favorites
       WHERE user_id = $1 AND media_id = $2`,
      [userId, mediaId]
    )
    return rows.length > 0 ? rows[0] : null
  }

  async insertFavorite(userId: string, mediaId: string): Promise<FavoriteRecord> {
    const now = toLocalISODateString()
    await this.conn.execute(
      `INSERT INTO user_media_favorites (user_id, media_id, is_deleted, created_at, updated_at)
       VALUES ($1, $2, FALSE, $3, $3)`,
      [userId, mediaId, now]
    )
    const result = await this.findFavorite(userId, mediaId)
    if (!result) {
      throw new Error(`Failed to insert favorite for user ${userId} and media ${mediaId}`)
    }
    return result
  }

  async updateFavorite(id: number, isDeleted: boolean): Promise<void> {
    const now = toLocalISODateString()
    await this.conn.execute(
      `UPDATE user_media_favorites
       SET is_deleted = $1, updated_at = $2
       WHERE id = $3`,
      [isDeleted, now, id]
    )
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
    const existing = await this.findFavorite(userId, mediaId)

    if (!existing) {
      try {
        await this.insertFavorite(userId, mediaId)
        return { isFavorite: true, action: 'added' }
      } catch (error: unknown) {
        if (isUniqueViolationError(error)) {
          const raceExisting = await this.findFavorite(userId, mediaId)
          if (raceExisting) {
            if (raceExisting.is_deleted) {
              await this.updateFavorite(raceExisting.id, false)
              return { isFavorite: true, action: 'added' }
            }
            return { isFavorite: true, action: 'added' }
          }
        }
        throw error
      }
    }

    if (existing.is_deleted) {
      await this.updateFavorite(existing.id, false)
      return { isFavorite: true, action: 'added' }
    }

    await this.updateFavorite(existing.id, true)
    return { isFavorite: false, action: 'removed' }
  }

  async togglePublic(id: string, isPublic: boolean, ownerId?: string): Promise<MediaRecord | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const now = toLocalISODateString()

    if (this.isPostgres()) {
      const params: (string | boolean)[] = [isPublic, now, id]
      let whereClause = 'WHERE id = $3 AND is_deleted = false'

      if (ownerId) {
        whereClause += ' AND owner_id = $4'
        params.push(ownerId)
      }

      const rows = await this.conn.query<MediaRecordDatabaseRow>(
        `UPDATE media_records SET is_public = $1, updated_at = $2 ${whereClause} RETURNING *`,
        params
      )
      return rows[0] ? mapMediaRecordRow(rows[0]) : null
    } else {
      const params: (string | number)[] = [isPublic ? 1 : 0, now, id]
      let whereClause = 'WHERE id = ? AND is_deleted = 0'

      if (ownerId) {
        whereClause += ' AND owner_id = ?'
        params.push(ownerId)
      }

      await this.conn.execute(
        `UPDATE media_records SET is_public = ?, updated_at = ? ${whereClause}`,
        params
      )
      return this.getById(id, ownerId)
    }
  }

  /**
   * 批量设置公开状态 — 一次 UPDATE 替代 N+1
   */
  async batchTogglePublic(
    ids: string[],
    isPublic: boolean,
    userId?: string
  ): Promise<number> {
    if (ids.length === 0) return 0

    const now = toLocalISODateString()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const params: (string | number | boolean)[] = [...ids, isPublic, now]
    let whereClause = `WHERE id IN (${placeholders})`

    if (userId) {
      const idx = ids.length + 3
      // 允许 owner 或者无 owner 的记录（super 操作）
      whereClause += ` AND (owner_id = $${idx} OR owner_id IS NULL)`
      params.push(userId)
    }

    if (this.isPostgres()) {
      const result = await this.conn.execute(
        `UPDATE media_records SET is_public = $${ids.length + 1}, updated_at = $${ids.length + 2} ${whereClause} AND is_deleted = false`,
        params
      )
      return result.changes
    } else {
      const result = await this.conn.execute(
        `UPDATE media_records SET is_public = ?, updated_at = ? ${whereClause} AND is_deleted = 0`,
        params
      )
      return result.changes
    }
  }
}

function isUniqueViolationError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505')
}
