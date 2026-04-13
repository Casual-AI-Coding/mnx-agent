/**
 * MediaService Domain Interface
 *
 * Defines the contract for all MediaRecord-related operations.
 */

import type { MediaRecord, CreateMediaRecord } from '../../../database/types.js'

/**
 * MediaFilter
 */
export interface MediaFilter {
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

/**
 * MediaQueryResult
 */
export interface MediaQueryResult {
  records: MediaRecord[]
  total: number
}

export interface IMediaService {
  /**
   * Get a single media record by ID
   */
  getById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null>

  /**
   * Get all media records with pagination and filtering
   */
  getAll(filter: MediaFilter): Promise<MediaQueryResult>

  /**
   * Create a new media record
   */
  create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord>

  /**
   * Update an existing media record
   */
  update(id: string, data: Partial<MediaRecord>, ownerId?: string): Promise<MediaRecord | null>

  /**
   * Soft delete a media record
   */
  softDelete(id: string, ownerId?: string): Promise<boolean>

  /**
   * Hard delete a media record
   */
  hardDelete(id: string, ownerId?: string): Promise<boolean>

  /**
   * Get multiple media records by IDs
   */
  getByIds(ids: string[], ownerId?: string): Promise<MediaRecord[]>

  /**
   * Toggle the public visibility of a media record
   */
  togglePublic(id: string, isPublic: boolean): Promise<MediaRecord | null>
}
