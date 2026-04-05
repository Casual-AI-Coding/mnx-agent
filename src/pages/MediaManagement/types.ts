import type { ReactNode } from 'react'
import { Image, Music, Video, FileAudio, RefreshCw, type LucideIcon } from 'lucide-react'

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

export interface MediaTab {
  value: string
  label: string
  icon: LucideIcon
}

export const MEDIA_TABS: MediaTab[] = [
  { value: 'all', label: '全部', icon: RefreshCw },
  { value: 'image', label: '图片', icon: Image },
  { value: 'audio', label: '音频', icon: FileAudio },
  { value: 'video', label: '视频', icon: Video },
  { value: 'music', label: '音乐', icon: Music },
]

export const TYPE_VARIANTS: Record<MediaType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  image: 'default',
  audio: 'secondary',
  video: 'destructive',
  music: 'outline',
}

export const TYPE_LABELS: Record<MediaType, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
  music: '音乐',
}

export const SOURCE_LABELS: Record<MediaSource, string> = {
  voice_sync: '语音同步',
  voice_async: '语音异步',
  image_generation: '图像生成',
  video_generation: '视频生成',
  music_generation: '音乐生成',
}

export const TYPE_GRADIENTS: Record<MediaType, string> = {
  image: 'bg-muted/50',
  audio: 'bg-blue-950/50',
  video: 'bg-destructive-950/50',
  music: 'bg-purple-950/50',
}
