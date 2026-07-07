import type { MediaRecord, MediaSource, MediaType } from '../../database/types.js'

export interface MediaRecordDatabaseRow {
  readonly [key: string]: unknown
  readonly id: string
  readonly filename: string
  readonly original_name: string | null
  readonly filepath: string
  readonly type: string
  readonly mime_type: string | null
  readonly size_bytes: number | string
  readonly source?: string | null
  readonly task_id: string | null
  readonly metadata: string | Record<string, unknown> | null
  readonly is_deleted: boolean | number
  readonly is_public?: boolean
  readonly owner_id?: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly deleted_at: string | null
  readonly is_favorite?: boolean
  readonly is_pinned?: boolean
}

export interface MediaListDatabaseRow extends MediaRecordDatabaseRow {
  readonly is_favorite?: boolean
  readonly is_pinned?: boolean
}

function parseMediaType(value: string): MediaType {
  switch (value) {
    case 'audio':
    case 'image':
    case 'video':
    case 'music':
    case 'lyrics':
    case 'document':
      return value
  }
  throw new Error(`Unsupported media type: ${value}`)
}

function parseMediaSource(value: string | null | undefined): MediaSource | null {
  switch (value) {
    case undefined:
    case null:
      return null
    case 'voice_sync':
    case 'voice_async':
    case 'image_generation':
    case 'video_generation':
    case 'music_generation':
    case 'lyrics_generation':
    case 'external_debug':
    case 'generation':
      return value
  }
  throw new Error(`Unsupported media source: ${value}`)
}

function parseMetadata(value: MediaRecordDatabaseRow['metadata']): MediaRecord['metadata'] {
  if (!value) {
    return null
  }
  if (typeof value !== 'string') {
    return value
  }
  const parsed: unknown = JSON.parse(value)
  if (isRecord(parsed)) {
    return parsed
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') {
    throw new Error(`Invalid media row string field: ${key}`)
  }
  return value
}

function readStringOrDefault(row: Record<string, unknown>, key: string, fallback: string): string {
  const value = row[key]
  if (value === undefined || value === null) {
    return fallback
  }
  if (typeof value === 'string') {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  throw new Error(`Invalid media row string field: ${key}`)
}

function readNullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== 'string') {
    if (value instanceof Date) {
      return value.toISOString()
    }
    throw new Error(`Invalid media row nullable string field: ${key}`)
  }
  return value
}

function readOptionalNullableString(row: Record<string, unknown>, key: string): string | null | undefined {
  const value = row[key]
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid media row optional nullable string field: ${key}`)
  }
  return value
}

function readSizeBytes(row: Record<string, unknown>): number | string {
  const value = row.size_bytes
  if (value === undefined || value === null) {
    return 0
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }
  throw new Error('Invalid media row size_bytes field')
}

function readDeletedFlag(row: Record<string, unknown>): boolean | number {
  const value = row.is_deleted
  if (value === undefined || value === null) {
    return false
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value
  }
  throw new Error('Invalid media row is_deleted field')
}

function readOptionalBoolean(row: Record<string, unknown>, key: string): boolean | undefined {
  const value = row[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid media row optional boolean field: ${key}`)
  }
  return value
}

function readMetadata(row: Record<string, unknown>): MediaRecordDatabaseRow['metadata'] {
  const value = row.metadata
  if (value === null || value === undefined || typeof value === 'string' || isRecord(value)) {
    return value ?? null
  }
  throw new Error('Invalid media row metadata field')
}

function parseMediaRecordDatabaseRow(value: unknown): MediaRecordDatabaseRow {
  if (!isRecord(value)) {
    throw new Error('Invalid media row')
  }
  return {
    id: readString(value, 'id'),
    filename: readString(value, 'filename'),
    original_name: readNullableString(value, 'original_name'),
    filepath: readStringOrDefault(value, 'filepath', ''),
    type: readString(value, 'type'),
    mime_type: readNullableString(value, 'mime_type'),
    size_bytes: readSizeBytes(value),
    source: readOptionalNullableString(value, 'source'),
    task_id: readNullableString(value, 'task_id'),
    metadata: readMetadata(value),
    is_deleted: readDeletedFlag(value),
    is_public: readOptionalBoolean(value, 'is_public'),
    owner_id: readOptionalNullableString(value, 'owner_id'),
    created_at: readStringOrDefault(value, 'created_at', ''),
    updated_at: readStringOrDefault(value, 'updated_at', ''),
    deleted_at: readNullableString(value, 'deleted_at'),
    is_favorite: readOptionalBoolean(value, 'is_favorite'),
    is_pinned: readOptionalBoolean(value, 'is_pinned'),
  }
}

export function mapMediaRecordRow(value: unknown): MediaRecord {
  const row = parseMediaRecordDatabaseRow(value)
  const { is_favorite: _isFavorite, is_pinned: _isPinned, ...recordRow } = row
  return {
    ...recordRow,
    type: parseMediaType(row.type),
    source: parseMediaSource(row.source),
    size_bytes: typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
    is_deleted: typeof row.is_deleted === 'boolean' ? row.is_deleted : row.is_deleted === 1,
    metadata: parseMetadata(row.metadata),
  }
}

export function mapMediaListRow(value: unknown, includeFavorite: boolean, includePinned: boolean): MediaRecord {
  const row = parseMediaRecordDatabaseRow(value)
  const record = mapMediaRecordRow(row)
  const favoriteProjection = includeFavorite ? { is_favorite: row.is_favorite ?? false } : {}
  const pinnedProjection = includePinned ? { is_pinned: row.is_pinned ?? false } : {}
  return {
    ...record,
    ...favoriteProjection,
    ...pinnedProjection,
  }
}
