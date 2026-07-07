/**
 * MediaService Implementation
 *
 * Domain service handling all MediaRecord-related operations.
 * Depends on MediaRepository for data access — no DatabaseService facade.
 */

import type { MediaRepository } from '../../repositories/media-repository.js'
import type { MediaRecord, CreateMediaRecord } from '../../database/types.js'
import type { IMediaService, MediaFilter, MediaQueryResult, MediaUpdateInput } from './interfaces/index.js'

export class MediaService implements IMediaService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  async getById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> {
    return this.mediaRepo.getById(id, ownerId, includePublic)
  }

  async getAll(filter: MediaFilter): Promise<MediaQueryResult> {
    const result = await this.mediaRepo.list({
      type: filter.type,
      source: filter.source,
      search: filter.search,
      limit: filter.limit ?? 20,
      offset: filter.offset ?? 0,
      includeDeleted: filter.includeDeleted,
      visibilityOwnerId: filter.visibilityOwnerId,
      favoriteFilter: filter.favoriteFilter,
      publicFilter: filter.publicFilter,
      favoriteUserId: filter.favoriteUserId,
      pinnedUserId: filter.pinnedUserId,
      role: filter.role,
    })
    return { records: result.items, total: result.total }
  }

  async create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    return this.mediaRepo.create(data, ownerId)
  }

  async update(id: string, data: MediaUpdateInput, ownerId?: string): Promise<MediaRecord | null> {
    const updateData: MediaUpdateInput = {}
    if (data.original_name !== undefined) {
      updateData.original_name = data.original_name
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata
    }
    return this.mediaRepo.update(id, updateData, ownerId)
  }

  async softDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.softDelete(id, ownerId)
  }

  async hardDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.hardDelete(id, ownerId)
  }

  async getByIds(ids: string[], ownerId?: string): Promise<MediaRecord[]> {
    return this.mediaRepo.getByIds(ids, ownerId)
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
    return this.mediaRepo.toggleFavorite(userId, mediaId)
  }

  async togglePin(userId: string, mediaId: string): Promise<{ isPinned: boolean; action: 'added' | 'removed' }> {
    return this.mediaRepo.togglePin(userId, mediaId)
  }

  async togglePublic(id: string, isPublic: boolean, ownerId?: string): Promise<MediaRecord | null> {
    return this.mediaRepo.togglePublic(id, isPublic, ownerId)
  }

  async batchTogglePublic(ids: string[], isPublic: boolean, userId?: string): Promise<number> {
    return this.mediaRepo.batchTogglePublic(ids, isPublic, userId)
  }

  async softDeleteBatch(ids: string[], ownerId?: string): Promise<{ deleted: number; failed: number }> {
    return this.mediaRepo.softDeleteBatch(ids, ownerId)
  }
}
