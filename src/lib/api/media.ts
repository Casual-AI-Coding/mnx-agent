import { apiClient } from './client'
import type { MediaType, MediaSource, MediaRecord, MediaListResponse } from '@/types/media'

// Re-export types for backward compatibility
export type { MediaType, MediaSource, MediaRecord }

export type FavoriteFilter = 'favorite' | 'non-favorite'
export type PublicFilter = 'private' | 'public' | 'others-public'

export interface ListMediaParams {
  type?: MediaType
  source?: MediaSource
  search?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
  favoriteFilter?: FavoriteFilter[]
  publicFilter?: PublicFilter[]
}

export type ListMediaResponse = MediaListResponse

export interface CreateMediaData {
  filename: string
  original_name?: string
  filepath: string
  type: MediaType
  mime_type?: string
  size_bytes: number
  source?: MediaSource
  task_id?: string
  metadata?: Record<string, unknown>
}

export async function listMedia(params?: ListMediaParams): Promise<ListMediaResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    type: params?.type,
    source: params?.source,
    search: params?.search,
    page: params?.page,
    limit: params?.limit,
    includeDeleted: params?.includeDeleted,
  }
  
  if (params?.favoriteFilter?.length) {
    queryParams.favoriteFilter = params.favoriteFilter.join(',')
  }
  if (params?.publicFilter?.length) {
    queryParams.publicFilter = params.publicFilter.join(',')
  }
  
  return apiClient.get<ListMediaResponse>('/media', queryParams)
}

export async function getMedia(id: string): Promise<{ success: boolean; data: MediaRecord }> {
  return apiClient.get<{ success: boolean; data: MediaRecord }>(`/media/${id}`)
}

export async function createMedia(data: CreateMediaData): Promise<{ success: boolean; data: MediaRecord }> {
  return apiClient.post<{ success: boolean; data: MediaRecord }>('/media', data)
}

export async function updateMedia(id: string, data: { original_name?: string; metadata?: Record<string, unknown> }): Promise<{ success: boolean; data: MediaRecord }> {
  return apiClient.put<{ success: boolean; data: MediaRecord }>(`/media/${id}`, data)
}

export async function deleteMedia(id: string): Promise<{ success: boolean; data: { deleted: boolean } }> {
  return apiClient.delete<{ success: boolean; data: { deleted: boolean } }>(`/media/${id}`)
}

export async function getMediaDownloadUrl(id: string): Promise<string> {
  const response = await apiClient.get<{ success: boolean; data: { downloadUrl?: string }; error?: string }>(`/media/${id}/token`)
  if (response.success && response.data.downloadUrl) {
    return response.data.downloadUrl
  }
  throw new Error(response.error || 'Failed to get download URL')
}

export async function batchDeleteMedia(ids: string[]): Promise<{ success: boolean; data: { deletedCount: number } }> {
  return apiClient.delete<{ success: boolean; data: { deletedCount: number } }>('/media/batch', { data: { ids } })
}

export async function batchDownloadMedia(ids: string[]): Promise<Blob> {
  return apiClient.post<Blob>('/media/batch/download', { ids }, {
    responseType: 'blob',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getMediaTypeLabel(type: MediaType): string {
  const labels: Record<MediaType, string> = {
    audio: '音频',
    image: '图片',
    video: '视频',
    music: '音乐',
    lyrics: '歌词',
  }
  return labels[type]
}

export function getMediaSourceLabel(source: MediaSource): string {
  const labels: Record<MediaSource, string> = {
    voice_sync: '语音同步',
    voice_async: '语音异步',
    image_generation: '图像生成',
    video_generation: '视频生成',
    music_generation: '音乐生成',
    lyrics_generation: '歌词生成',
    external_debug: '外部调试',
  }
  return labels[source]
}

export async function uploadMedia(
  blob: Blob,
  filename: string,
  type: MediaType,
  source?: MediaSource,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; data: MediaRecord }> {
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('type', type)
  if (source) {
    formData.append('source', source)
  }
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  return apiClient.post<{ success: boolean; data: MediaRecord }>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function uploadMediaFromUrl(
  url: string,
  filename: string,
  type: MediaType,
  source?: MediaSource,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; data: MediaRecord }> {
  return apiClient.post<{ success: boolean; data: MediaRecord }>('/media/upload-from-url', {
    url,
    filename,
    type,
    source,
    metadata,
  })
}

export async function toggleFavorite(mediaId: string): Promise<{
  success: boolean
  data: {
    mediaId: string
    isFavorite: boolean
    action: 'added' | 'removed'
  }
}> {
  return apiClient.patch<{
    success: boolean
    data: {
      mediaId: string
      isFavorite: boolean
      action: 'added' | 'removed'
    }
  }>(`/media/${mediaId}/favorite`)
}

export async function togglePublic(id: string, isPublic: boolean): Promise<{
  success: boolean
  data: MediaRecord
}> {
  return apiClient.patch<{
    success: boolean
    data: MediaRecord
  }>(`/media/${id}/public`, { isPublic })
}

export async function batchTogglePublic(ids: string[], isPublic: boolean): Promise<{
  success: boolean
  data: Array<{ id: string; success: boolean; data?: MediaRecord; error?: string }>
}> {
  return apiClient.post<{
    success: boolean
    data: Array<{ id: string; success: boolean; data?: MediaRecord; error?: string }>
  }>('/media/batch/public', { ids, isPublic })
}

export interface RecoverableMediaRecord {
  log_id: number
  operation: string
  type: string
  source: string
  resource_url: string
  image_index?: number
  created_at: string
  metadata: Record<string, unknown>
}

export async function getRecoverableMedia(): Promise<{
  success: boolean
  data: { records: RecoverableMediaRecord[]; total: number }
}> {
  return apiClient.get<{
    success: boolean
    data: { records: RecoverableMediaRecord[]; total: number }
  }>('/media/recoverable')
}

export async function recoverMedia(logId: number, resourceUrl?: string): Promise<{
  success: boolean
  data: { message: string; record: MediaRecord }
}> {
  return apiClient.post<{
    success: boolean
    data: { message: string; record: MediaRecord }
  }>(`/media/recover/${logId}`, { resource_url: resourceUrl })
}

export async function getMediaToken(mediaId: string): Promise<{
  success: boolean
  data: { downloadUrl: string; token: string }
}> {
  return apiClient.get<{
    success: boolean
    data: { downloadUrl: string; token: string }
  }>(`/media/${mediaId}/token`)
}
