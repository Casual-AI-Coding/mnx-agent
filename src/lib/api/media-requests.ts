import { apiClient } from './client'
import type {
  ApiMaybeErrorResponse,
  ApiSuccessResponse,
  BatchTogglePublicResult,
  CreateMediaData,
  ListMediaParams,
  MediaListResponse,
  MediaRecord,
  MediaSource,
  MediaToggleFavoriteResult,
  MediaTogglePinResult,
  MediaType,
  RecoverableMediaRecord,
  UpdateMediaData,
} from './media-types'

const MEDIA_ENDPOINT = '/media'

type MediaQueryParams = Record<string, string | number | boolean | undefined>

function buildListMediaQueryParams(params?: ListMediaParams): MediaQueryParams {
  const queryParams: MediaQueryParams = {
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

  return queryParams
}

export async function listMedia(params?: ListMediaParams): Promise<MediaListResponse> {
  return apiClient.get<MediaListResponse>(MEDIA_ENDPOINT, buildListMediaQueryParams(params))
}

export async function getMedia(id: string): Promise<ApiSuccessResponse<MediaRecord>> {
  return apiClient.get<ApiSuccessResponse<MediaRecord>>(`${MEDIA_ENDPOINT}/${id}`)
}

export async function createMedia(data: CreateMediaData): Promise<ApiSuccessResponse<MediaRecord>> {
  return apiClient.post<ApiSuccessResponse<MediaRecord>>(MEDIA_ENDPOINT, data)
}

export async function updateMedia(id: string, data: UpdateMediaData): Promise<ApiSuccessResponse<MediaRecord>> {
  return apiClient.put<ApiSuccessResponse<MediaRecord>>(`${MEDIA_ENDPOINT}/${id}`, data)
}

export async function deleteMedia(id: string): Promise<ApiSuccessResponse<{ deleted: boolean }>> {
  return apiClient.delete<ApiSuccessResponse<{ deleted: boolean }>>(`${MEDIA_ENDPOINT}/${id}`)
}

export async function getMediaDownloadUrl(id: string): Promise<string> {
  const response = await apiClient.get<ApiMaybeErrorResponse<{ downloadUrl?: string }>>(`${MEDIA_ENDPOINT}/${id}/token`)
  if (response.success && response.data.downloadUrl) {
    return response.data.downloadUrl
  }
  throw new Error(response.error || 'Failed to get download URL')
}

export async function batchDeleteMedia(ids: readonly string[]): Promise<ApiSuccessResponse<{ deletedCount: number }>> {
  return apiClient.delete<ApiSuccessResponse<{ deletedCount: number }>>(`${MEDIA_ENDPOINT}/batch`, { data: { ids } })
}

export async function batchDownloadMedia(ids: readonly string[]): Promise<Blob> {
  return apiClient.post<Blob>(`${MEDIA_ENDPOINT}/batch/download`, { ids }, {
    responseType: 'blob',
  })
}

export async function uploadMedia(
  blob: Blob,
  filename: string,
  type: MediaType,
  source?: MediaSource,
  metadata?: Record<string, unknown>
): Promise<ApiSuccessResponse<MediaRecord>> {
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('type', type)
  if (source) {
    formData.append('source', source)
  }
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  return apiClient.post<ApiSuccessResponse<MediaRecord>>(`${MEDIA_ENDPOINT}/upload`, formData, {
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
): Promise<ApiSuccessResponse<MediaRecord>> {
  return apiClient.post<ApiSuccessResponse<MediaRecord>>(`${MEDIA_ENDPOINT}/upload-from-url`, {
    url,
    filename,
    type,
    source,
    metadata,
  })
}

export async function toggleFavorite(mediaId: string): Promise<ApiSuccessResponse<MediaToggleFavoriteResult>> {
  return apiClient.patch<ApiSuccessResponse<MediaToggleFavoriteResult>>(`${MEDIA_ENDPOINT}/${mediaId}/favorite`)
}

export async function togglePin(mediaId: string): Promise<ApiSuccessResponse<MediaTogglePinResult>> {
  return apiClient.patch<ApiSuccessResponse<MediaTogglePinResult>>(`${MEDIA_ENDPOINT}/${mediaId}/pin`)
}

export async function togglePublic(id: string, isPublic: boolean): Promise<ApiSuccessResponse<MediaRecord>> {
  return apiClient.patch<ApiSuccessResponse<MediaRecord>>(`${MEDIA_ENDPOINT}/${id}/public`, { isPublic })
}

export async function batchTogglePublic(
  ids: readonly string[],
  isPublic: boolean
): Promise<ApiSuccessResponse<BatchTogglePublicResult[]>> {
  return apiClient.post<ApiSuccessResponse<BatchTogglePublicResult[]>>(`${MEDIA_ENDPOINT}/batch/public`, { ids, isPublic })
}

export async function getRecoverableMedia(): Promise<ApiSuccessResponse<{ records: RecoverableMediaRecord[]; total: number }>> {
  return apiClient.get<ApiSuccessResponse<{ records: RecoverableMediaRecord[]; total: number }>>(`${MEDIA_ENDPOINT}/recoverable`)
}

export async function recoverMedia(
  logId: number,
  resourceUrl?: string
): Promise<ApiSuccessResponse<{ message: string; record: MediaRecord }>> {
  return apiClient.post<ApiSuccessResponse<{ message: string; record: MediaRecord }>>(
    `${MEDIA_ENDPOINT}/recover/${logId}`,
    { resource_url: resourceUrl }
  )
}

export async function getMediaToken(mediaId: string): Promise<ApiSuccessResponse<{ downloadUrl: string; token: string }>> {
  return apiClient.get<ApiSuccessResponse<{ downloadUrl: string; token: string }>>(`${MEDIA_ENDPOINT}/${mediaId}/token`)
}
