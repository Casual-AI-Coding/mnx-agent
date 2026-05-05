import type { CreateMediaRecord, MediaRecord } from '../types.js'
import type { MediaRepository } from '../../repositories/index.js'

export class MediaService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  async getMediaRecords(options: {
    type?: string
    source?: string
    search?: string
    limit: number
    offset: number
    includeDeleted?: boolean
    visibilityOwnerId?: string
    favoriteFilter?: ('favorite' | 'non-favorite')[]
    publicFilter?: ('private' | 'public' | 'others-public')[]
    favoriteUserId?: string
    role?: 'user' | 'pro' | 'admin' | 'super'
  }): Promise<{ records: MediaRecord[]; total: number }> {
    const result = await this.mediaRepo.list(options)
    return { records: result.items, total: result.total }
  }

  async getMediaRecordById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> {
    return this.mediaRepo.getById(id, ownerId, includePublic)
  }

  async createMediaRecord(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    return this.mediaRepo.create(data, ownerId)
  }

  async updateMediaRecord(id: string, data: { original_name?: string | null; metadata?: Record<string, unknown> | null }, ownerId?: string): Promise<MediaRecord | null> {
    return this.mediaRepo.update(id, data, ownerId)
  }

  async softDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.softDelete(id, ownerId)
  }

  async hardDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.hardDelete(id, ownerId)
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
    return this.mediaRepo.toggleFavorite(userId, mediaId)
  }

  async togglePublicMediaRecord(id: string, isPublic: boolean): Promise<MediaRecord | null> {
    return this.mediaRepo.togglePublic(id, isPublic)
  }

  async softDeleteMediaRecords(ids: string[]): Promise<{ deleted: number; failed: number }> {
    return this.mediaRepo.softDeleteBatch(ids)
  }

  async getMediaRecordsByIds(ids: string[]): Promise<MediaRecord[]> {
    return this.mediaRepo.getByIds(ids)
  }
}
