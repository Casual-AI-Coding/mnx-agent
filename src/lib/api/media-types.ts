import type { MediaListResponse, MediaRecord, MediaSource, MediaType } from '@/types/media'

export type { MediaListResponse, MediaRecord, MediaSource, MediaType }
export type ListMediaResponse = MediaListResponse

export type FavoriteFilter = 'favorite' | 'non-favorite'
export type PublicFilter = 'private' | 'public' | 'others-public'

export interface ListMediaParams {
  readonly type?: MediaType
  readonly source?: MediaSource
  readonly search?: string
  readonly page?: number
  readonly limit?: number
  readonly includeDeleted?: boolean
  readonly favoriteFilter?: readonly FavoriteFilter[]
  readonly publicFilter?: readonly PublicFilter[]
}

export interface CreateMediaData {
  readonly filename: string
  readonly original_name?: string
  readonly filepath: string
  readonly type: MediaType
  readonly mime_type?: string
  readonly size_bytes: number
  readonly source?: MediaSource
  readonly task_id?: string
  readonly metadata?: Record<string, unknown>
}

export interface UpdateMediaData {
  readonly original_name?: string
  readonly metadata?: Record<string, unknown>
}

export interface RecoverableMediaRecord {
  readonly log_id: number
  readonly operation: string
  readonly type: string
  readonly source: string
  readonly resource_url: string
  readonly image_index?: number
  readonly created_at: string
  readonly metadata: Record<string, unknown>
}

export interface ApiSuccessResponse<TData> {
  readonly success: boolean
  readonly data: TData
}

export interface ApiMaybeErrorResponse<TData> extends ApiSuccessResponse<TData> {
  readonly error?: string
}

export interface MediaToggleFavoriteResult {
  readonly mediaId: string
  readonly isFavorite: boolean
  readonly action: 'added' | 'removed'
}

export interface MediaTogglePinResult {
  readonly mediaId: string
  readonly isPinned: boolean
  readonly action: 'added' | 'removed'
}

export interface BatchTogglePublicResult {
  readonly id: string
  readonly success: boolean
  readonly data?: MediaRecord
  readonly error?: string
}
