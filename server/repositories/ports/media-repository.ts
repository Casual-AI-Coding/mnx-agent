/**
 * Media Repository Port
 */

import type { MediaRecord } from '@mnx/shared-types/entities'
import type { MediaType, MediaSource } from '@mnx/shared-types/entities'
import type { PaginationParams, PaginatedResult, RepositoryWithOwner } from './repository-port'

export type { PaginationParams, PaginatedResult }
export type { MediaType, MediaSource }

export interface MediaRepositoryPort extends RepositoryWithOwner<MediaRecord> {
  findByType(type: MediaType, params?: PaginationParams): Promise<PaginatedResult<MediaRecord>>
  findBySource(source: MediaSource, params?: PaginationParams): Promise<PaginatedResult<MediaRecord>>
  findByJob(jobId: string, params?: PaginationParams): Promise<PaginatedResult<MediaRecord>>
  softDelete(id: string): Promise<boolean>
  restore(id: string): Promise<MediaRecord | null>
  hardDelete(id: string): Promise<boolean>
  softDeleteBatch(ids: string[]): Promise<{ deleted: number; failed: number }>
  getByIds(ids: string[]): Promise<MediaRecord[]>
  updateMetadata(
    id: string,
    metadata: Record<string, unknown> | null
  ): Promise<MediaRecord | null>
  rename(id: string, newName: string): Promise<MediaRecord | null>
}

export interface MediaListOptions {
  type?: MediaType
  source?: MediaSource
  includeDeleted?: boolean
  ownerId?: string
  limit?: number
  offset?: number
}
