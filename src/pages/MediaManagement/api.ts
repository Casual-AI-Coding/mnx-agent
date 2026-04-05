import { apiClient } from '@/lib/api/client'
import type { MediaType, MediaListResponse, MediaRecord, PaginationInfo } from './types'

export async function listMedia(params: {
  type?: MediaType
  page: number
  limit: number
}): Promise<MediaListResponse> {
  const { type, page, limit } = params
  const queryParams = new URLSearchParams()
  if (type) queryParams.append('type', type)
  queryParams.append('page', String(page))
  queryParams.append('limit', String(limit))

  const response = await apiClient.client_.get(`/media?${queryParams.toString()}`)
  return response.data
}

export async function deleteMediaRecord(id: string): Promise<void> {
  await apiClient.client_.delete(`/media/${id}`)
}

export function getDownloadUrl(id: string): string {
  return `/api/media/${id}/download`
}
