import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  MediaRecord,
  MediaRecordRow,
  CreateMediaRecord,
  FavoriteRecord,
  FavoriteRecordRow,
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
  search?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
  ownerId?: string
  ownerIdNot?: string
  favorite?: boolean
  favoriteUserId?: string
  role?: 'user' | 'pro' | 'admin' | 'super'
  isPublic?: boolean
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
    const { type, source, search, limit = 50, offset = 0, includeDeleted = false, ownerId, favorite, favoriteUserId, role, isPublic } = options

    let selectClause = 'm.*'
    let joinClause = ''
    let whereClause = ''
    const params: (string | number | boolean)[] = []
    let paramIndex = 1

    // Handle favorite filtering
    if (favoriteUserId) {
      selectClause += ', CASE WHEN f.id IS NOT NULL AND f.is_deleted = false THEN true ELSE false END as is_favorite'
      if (favorite) {
        // INNER JOIN - only return favorited records
        joinClause = 'INNER JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $1 AND f.is_deleted = false'
        params.push(favoriteUserId)
        paramIndex++
      } else {
        // LEFT JOIN - return all records with is_favorite status
        joinClause = 'LEFT JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $1'
        params.push(favoriteUserId)
        paramIndex++
      }
    }

    // Visibility filtering based on role
    const isAdminOrSuper = role === 'admin' || role === 'super'
    if (!isAdminOrSuper && ownerId) {
      // user/pro: see own private + all public
      whereClause += `(m.owner_id = $${paramIndex} OR m.is_public = true)`
      params.push(ownerId)
      paramIndex++
    } else if (ownerId) {
      // admin/super with ownerId: filter by owner
      whereClause += whereClause ? ` AND m.owner_id = $${paramIndex}` : `m.owner_id = $${paramIndex}`
      params.push(ownerId)
      paramIndex++
    }

    if (!includeDeleted) {
      if (this.isPostgres()) {
        whereClause += whereClause ? ` AND m.is_deleted = false` : `m.is_deleted = false`
      } else {
        whereClause += whereClause ? ` AND m.is_deleted = 0` : `m.is_deleted = 0`
      }
    }

    if (type) {
      whereClause += whereClause ? ` AND m.type = $${paramIndex}` : `m.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (source) {
      whereClause += whereClause ? ` AND m.source = $${paramIndex}` : `m.source = $${paramIndex}`
      params.push(source)
      paramIndex++
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      whereClause += whereClause 
        ? ` AND (m.filename LIKE $${paramIndex} OR m.original_name LIKE $${paramIndex})`
        : `(m.filename LIKE $${paramIndex} OR m.original_name LIKE $${paramIndex})`
      params.push(searchTerm)
      paramIndex++
    }

    if (isPublic !== undefined) {
      whereClause += whereClause ? ` AND m.is_public = $${paramIndex}` : `m.is_public = $${paramIndex}`
      params.push(isPublic)
      paramIndex++
    }

    if (ownerIdNot) {
      whereClause += whereClause ? ` AND (m.owner_id IS NULL OR m.owner_id != $${paramIndex})` : `(m.owner_id IS NULL OR m.owner_id != $${paramIndex})`
      params.push(ownerIdNot)
      paramIndex++
    }

    if (whereClause) {
      whereClause = 'WHERE ' + whereClause
    }

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM media_records m ${joinClause} ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<MediaRecordRow & { is_favorite?: boolean }>(
      `SELECT ${selectClause} FROM media_records m ${joinClause} ${whereClause} ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      items: rows.map(row => {
        const record = rowToMediaRecord(row)
        if (favoriteUserId) {
          record.is_favorite = row.is_favorite ?? false
        }
        return record
      }),
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
    const now = toISODate()
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
    const now = toISODate()
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
      } catch (error: any) {
        if (error.code === '23505') {
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

  async togglePublic(id: string, isPublic: boolean): Promise<MediaRecord | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const now = toISODate()

    if (this.isPostgres()) {
      const rows = await this.conn.query<MediaRecordRow>(
        `UPDATE media_records SET is_public = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [isPublic, now, id]
      )
      return rows[0] ? rowToMediaRecord(rows[0]) : null
    } else {
      await this.conn.execute(
        `UPDATE media_records SET is_public = ?, updated_at = ? WHERE id = ?`,
        [isPublic ? 1 : 0, now, id]
      )
      return this.getById(id)
    }
  }
}
