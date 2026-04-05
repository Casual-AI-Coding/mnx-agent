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
  metadata: Record<string, unknown> | null
  is_deleted: boolean
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
