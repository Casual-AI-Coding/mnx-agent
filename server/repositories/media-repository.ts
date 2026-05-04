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

import { toLocalISODateString } from '../lib/date-utils.js'

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
    return rowToMediaRecord(row as MediaRecordRow)
  }

  async getById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> {
    if (ownerId) {
      // For read operations, allow access to public records
      // For write operations, strict owner check
      const whereClause = includePublic
        ? `SELECT * FROM media_records WHERE id = $1 AND (owner_id = $2 OR is_public = true)`
        : `SELECT * FROM media_records WHERE id = $1 AND owner_id = $2`
      const rows = await this.conn.query<MediaRecordRow>(whereClause, [id, ownerId])
      return rows[0] ? rowToMediaRecord(rows[0]) : null
    }
    const rows = await this.conn.query<MediaRecordRow>(
      `SELECT * FROM media_records WHERE id = $1`,
      [id]
    )
    return rows[0] ? rowToMediaRecord(rows[0]) : null
  }

  async list(options: MediaListOptions = {}): Promise<{ items: MediaRecord[]; total: number }> {
    const { type, source, search, limit = 50, offset = 0, includeDeleted = false, visibilityOwnerId, favoriteFilter, publicFilter, favoriteUserId, role } = options

    let selectClause = 'm.*'
    let joinClause = ''
    let whereClause = ''
    const params: (string | number | boolean)[] = []
    let paramIndex = 1

    const hasFavorite = favoriteFilter?.includes('favorite')
    const hasNonFavorite = favoriteFilter?.includes('non-favorite')
    const hasPrivate = publicFilter?.includes('private')
    const hasPublic = publicFilter?.includes('public')
    const hasOthersPublic = publicFilter?.includes('others-public')
    const isAdminOrSuper = role === 'admin' || role === 'super'

    // Favorite filter - join with favorites table
    if (favoriteUserId) {
      selectClause += ', CASE WHEN f.id IS NOT NULL AND f.is_deleted = false THEN true ELSE false END as is_favorite'
      
      if (hasFavorite && !hasNonFavorite) {
        joinClause = 'INNER JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $1 AND f.is_deleted = false'
        params.push(favoriteUserId)
        paramIndex++
      } else if (!hasFavorite && hasNonFavorite) {
        joinClause = 'LEFT JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $1'
        params.push(favoriteUserId)
        paramIndex++
        whereClause += whereClause 
          ? ` AND (f.id IS NULL OR f.is_deleted = true)` 
          : `(f.id IS NULL OR f.is_deleted = true)`
      } else {
        joinClause = 'LEFT JOIN user_media_favorites f ON m.id = f.media_id AND f.user_id = $1'
        params.push(favoriteUserId)
        paramIndex++
      }
    }

    // Visibility filter: user/pro can only see own private + all public
    // Admin/super can see all records regardless of visibility
    if (visibilityOwnerId && !isAdminOrSuper) {
      whereClause += whereClause 
        ? ` AND (m.owner_id = $${paramIndex} OR m.is_public = true)` 
        : `(m.owner_id = $${paramIndex} OR m.is_public = true)`
      params.push(visibilityOwnerId)
      paramIndex++
    }

    // Public filter - apply user's selection
    if (publicFilter && publicFilter.length > 0) {
      if (hasPrivate && !hasPublic && !hasOthersPublic) {
        // Only private
        if (isAdminOrSuper) {
          whereClause += whereClause ? ` AND (m.owner_id = $${paramIndex} OR m.owner_id IS NULL) AND m.is_public = false` : `(m.owner_id = $${paramIndex} OR m.owner_id IS NULL) AND m.is_public = false`
          params.push(visibilityOwnerId!)
          paramIndex++
        } else {
          whereClause += whereClause 
            ? ` AND m.owner_id = $${paramIndex} AND m.is_public = false` 
            : `m.owner_id = $${paramIndex} AND m.is_public = false`
          params.push(visibilityOwnerId!)
          paramIndex++
        }
      } else if (!hasPrivate && hasPublic && !hasOthersPublic) {
        // Only own public (for admin/super: includes owner_id=null public)
        if (isAdminOrSuper) {
          whereClause += whereClause 
            ? ` AND (m.owner_id = $${paramIndex} OR m.owner_id IS NULL) AND m.is_public = true` 
            : `(m.owner_id = $${paramIndex} OR m.owner_id IS NULL) AND m.is_public = true`
          params.push(visibilityOwnerId!)
          paramIndex++
        } else {
          whereClause += whereClause 
            ? ` AND m.owner_id = $${paramIndex} AND m.is_public = true` 
            : `m.owner_id = $${paramIndex} AND m.is_public = true`
          params.push(visibilityOwnerId!)
          paramIndex++
        }
      } else if (!hasPrivate && !hasPublic && hasOthersPublic) {
        // Only others' public (for admin/super: excludes owner_id=null)
        if (isAdminOrSuper && visibilityOwnerId) {
          whereClause += whereClause 
            ? ` AND m.owner_id != $${paramIndex} AND m.owner_id IS NOT NULL AND m.is_public = true` 
            : `m.owner_id != $${paramIndex} AND m.owner_id IS NOT NULL AND m.is_public = true`
          params.push(visibilityOwnerId)
          paramIndex++
        } else if (visibilityOwnerId) {
          whereClause += whereClause 
            ? ` AND (m.owner_id IS NULL OR m.owner_id != $${paramIndex}) AND m.is_public = true` 
            : `(m.owner_id IS NULL OR m.owner_id != $${paramIndex}) AND m.is_public = true`
          params.push(visibilityOwnerId)
          paramIndex++
        } else {
          whereClause += whereClause ? ` AND m.is_public = true` : `m.is_public = true`
        }
      } else if (hasPrivate && hasPublic && !hasOthersPublic) {
        // Own private + own public (for admin/super: owner_id=null all)
        if (isAdminOrSuper) {
          whereClause += whereClause 
            ? ` AND (m.owner_id = $${paramIndex} OR m.owner_id IS NULL)` 
            : `(m.owner_id = $${paramIndex} OR m.owner_id IS NULL)`
          params.push(visibilityOwnerId!)
          paramIndex++
        } else {
          whereClause += whereClause ? ` AND m.owner_id = $${paramIndex}` : `m.owner_id = $${paramIndex}`
          params.push(visibilityOwnerId!)
          paramIndex++
        }
      } else if (hasPrivate && !hasPublic && hasOthersPublic) {
        // Own private + others' public
        if (isAdminOrSuper && visibilityOwnerId) {
          whereClause += whereClause 
            ? ` AND ((m.owner_id = $${paramIndex} OR m.owner_id IS NULL) AND m.is_public = false OR m.owner_id != $${paramIndex} AND m.owner_id IS NOT NULL AND m.is_public = true)` 
            : `((m.owner_id = $${paramIndex} OR m.owner_id IS NULL) AND m.is_public = false OR m.owner_id != $${paramIndex} AND m.owner_id IS NOT NULL AND m.is_public = true)`
          params.push(visibilityOwnerId)
          paramIndex++
        } else if (visibilityOwnerId) {
          whereClause += whereClause 
            ? ` AND (m.owner_id = $${paramIndex} AND m.is_public = false OR m.is_public = true AND (m.owner_id IS NULL OR m.owner_id != $${paramIndex}))` 
            : `(m.owner_id = $${paramIndex} AND m.is_public = false OR m.is_public = true AND (m.owner_id IS NULL OR m.owner_id != $${paramIndex}))`
          params.push(visibilityOwnerId)
          paramIndex++
        }
      } else if (!hasPrivate && hasPublic && hasOthersPublic) {
        // All public (for admin/super: public + others-public = all public including owner_id=null)
        whereClause += whereClause ? ` AND m.is_public = true` : `m.is_public = true`
      }
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
    const now = toLocalISODateString()
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

  async softDeleteBatch(ids: string[]): Promise<{ deleted: number; failed: number }> {
    if (ids.length === 0) {
      return { deleted: 0, failed: 0 }
    }

    const now = toLocalISODateString()
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
        const pgError = error as { code?: unknown }
        if (pgError.code === '23505') {
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

    const now = toLocalISODateString()

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
