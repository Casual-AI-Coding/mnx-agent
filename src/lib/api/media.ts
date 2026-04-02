import { apiClient } from './client'

const client = apiClient.client_

export type MediaType = 'audio' | 'image' | 'video' | 'music'
export type MediaSource = 'voice_sync' | 'voice_async' | 'image_generation' | 'video_generation' | 'music_generation'

export interface MediaRecord {
  id: string
  filename: string
  original_name: string | null
  filepath: string
  type: MediaType
  mime_type: string | null
  size_bytes: number
  source: MediaSource | null
  task_id: string | null
  metadata: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ListMediaParams {
  type?: MediaType
  source?: MediaSource
  page?: number
  limit?: number
  includeDeleted?: boolean
}

export interface ListMediaResponse {
  success: boolean
  data: {
    records: MediaRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

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
  const response = await client.get('/media', { params })
  return response.data
}

export async function getMedia(id: string): Promise<{ success: boolean; data: MediaRecord }> {
  const response = await client.get(`/media/${id}`)
  return response.data
}

export async function createMedia(data: CreateMediaData): Promise<{ success: boolean; data: MediaRecord }> {
  const response = await client.post('/media', data)
  return response.data
}

export async function updateMedia(id: string, data: { original_name?: string; metadata?: Record<string, unknown> }): Promise<{ success: boolean; data: MediaRecord }> {
  const response = await client.put(`/media/${id}`, data)
  return response.data
}

export async function deleteMedia(id: string): Promise<{ success: boolean; data: { deleted: boolean } }> {
  const response = await client.delete(`/media/${id}`)
  return response.data
}

export async function getMediaDownloadUrl(id: string): Promise<string> {
  const response = await client.get(`/media/${id}/token`)
  if (response.data.success && response.data.data.downloadUrl) {
    return response.data.data.downloadUrl
  }
  throw new Error(response.data.error || 'Failed to get download URL')
}

export async function batchDeleteMedia(ids: string[]): Promise<{ success: boolean; data: { deletedCount: number } }> {
  const response = await client.delete('/media/batch', { data: { ids } })
  return response.data
}

export async function batchDownloadMedia(ids: string[]): Promise<Blob> {
  const response = await client.post('/media/batch/download', { ids }, {
    responseType: 'blob',
  })
  return response.data
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
  }
  return labels[source]
}

export async function uploadMedia(
  blob: Blob,
  filename: string,
  type: MediaType,
  source?: MediaSource
): Promise<{ success: boolean; data: MediaRecord }> {
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('type', type)
  if (source) {
    formData.append('source', source)
  }

  const response = await client.post('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function uploadMediaFromUrl(
  url: string,
  filename: string,
  type: MediaType,
  source?: MediaSource
): Promise<{ success: boolean; data: MediaRecord }> {
  const response = await client.post('/media/upload-from-url', {
    url,
    filename,
    type,
    source,
  })
  return response.data
}