export type MediaType = 'audio' | 'image' | 'video' | 'music' | 'lyrics'
export type MediaSource = 'voice_sync' | 'voice_async' | 'image_generation' | 'video_generation' | 'music_generation' | 'lyrics_generation' | 'external_debug'

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
  metadata: string | Record<string, unknown> | null
  is_deleted: boolean
  is_public?: boolean
  is_favorite?: boolean
  owner_id?: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface MediaListResponse {
  success: boolean
  data: {
    records: MediaRecord[]
    pagination: PaginationInfo
  }
}
