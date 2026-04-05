/**
 * Media Entity Types
 */

import { MediaType, MediaSource } from './enums.js'

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

export interface CreateMediaRecord {
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

export interface UpdateMediaRecord {
  filename?: string
  original_name?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
}

export interface MediaRecordRow {
  id: string
  filename: string
  original_name: string | null
  filepath: string
  type: string
  mime_type: string | null
  size_bytes: number
  source: string | null
  task_id: string | null
  metadata: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}