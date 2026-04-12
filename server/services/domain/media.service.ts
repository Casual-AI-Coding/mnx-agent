/**
 * MediaService Implementation
 * 
 * Domain service handling all MediaRecord-related operations.
 * Delegates to DatabaseService for data access.
 */

import type { DatabaseService } from '../../database/service-async.js'
import type { MediaRecord, CreateMediaRecord } from '../../database/types.js'
import type { IMediaService, MediaFilter, MediaQueryResult } from './interfaces/index.js'

export class MediaService implements IMediaService {
  constructor(private readonly db: DatabaseService) {}

  async getById(id: string, ownerId?: string): Promise<MediaRecord | null> {
    return this.db.getMediaRecordById(id, ownerId)
  }

  async getAll(filter: MediaFilter): Promise<MediaQueryResult> {
    const limit = filter.limit ?? 20
    const offset = filter.offset ?? 0
    return this.db.getMediaRecords({
      type: filter.type,
      source: filter.source,
      limit,
      offset,
      includeDeleted: filter.includeDeleted,
      ownerId: filter.ownerId,
      favorite: filter.favorite,
      favoriteUserId: filter.favoriteUserId,
    })
  }

  async create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    return this.db.createMediaRecord(data, ownerId)
  }

  async update(id: string, data: Partial<MediaRecord>, ownerId?: string): Promise<MediaRecord | null> {
    const updateData: { original_name?: string | null; metadata?: Record<string, unknown> | null } = {}
    if (data.original_name !== undefined) {
      updateData.original_name = data.original_name
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata as Record<string, unknown> | null
    }
    return this.db.updateMediaRecord(id, updateData, ownerId)
  }

  async softDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.db.softDeleteMediaRecord(id, ownerId)
  }

  async hardDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.db.hardDeleteMediaRecord(id, ownerId)
  }

  async getByIds(ids: string[], ownerId?: string): Promise<MediaRecord[]> {
    return this.db.getMediaRecordsByIds(ids)
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
    return this.db.toggleFavorite(userId, mediaId)
  }
}
