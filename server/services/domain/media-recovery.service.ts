import type { ExternalApiLog } from '../../../packages/shared-types/entities/external-api-log.js'
import type { MediaSource, MediaType } from '../../database/types.js'

type MediaRecoveryOperation = 'image_generation' | 'music_generation' | 'text_to_audio_sync'

type MediaRecoveryConfig = {
  readonly type: MediaType
  readonly source: MediaSource
  readonly extension: string
}

type RecoveryResponseData = {
  readonly imageUrls: readonly string[]
  readonly audio: string | null
  readonly audioUrl: string | null
  readonly songTitle: unknown
  readonly lyrics: unknown
}

type ParseRecoveryResponseResult =
  | { readonly ok: true; readonly value: RecoveryResponseData }
  | { readonly ok: false; readonly error: 'invalid_json' }

type ParseJsonRecordResult =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false }

type ExistingMediaForRecovery = {
  readonly metadata?: unknown | null
}

export type RecoverableMediaCandidate = {
  readonly log_id: number
  readonly operation: MediaRecoveryOperation
  readonly type: MediaType
  readonly source: MediaSource
  readonly resource_url: string
  readonly image_index?: number
  readonly created_at: string
  readonly metadata: Record<string, unknown>
}

export type BuildRecoverableMediaCandidatesInput = {
  readonly logs: readonly ExternalApiLog[]
  readonly existingMedia: readonly ExistingMediaForRecovery[]
}

export type MediaRecoveryPlan = {
  readonly resourceUrl: string
  readonly originalName: string
  readonly type: MediaType
  readonly source: MediaSource
  readonly metadata: Record<string, unknown>
}

export type CreateMediaRecoveryPlanInput = {
  readonly log: ExternalApiLog
  readonly requestedResourceUrl?: string
}

export type CreateMediaRecoveryPlanResult =
  | { readonly ok: true; readonly value: MediaRecoveryPlan }
  | {
    readonly ok: false
    readonly error: 'unsupported_operation' | 'invalid_log_response' | 'no_resource_url' | 'resource_url_not_found'
  }

function getRecoveryOperation(operation: string): MediaRecoveryOperation | null {
  switch (operation) {
    case 'image_generation':
      return 'image_generation'
    case 'music_generation':
      return 'music_generation'
    case 'text_to_audio_sync':
      return 'text_to_audio_sync'
    default:
      return null
  }
}

function getRecoveryConfig(operation: MediaRecoveryOperation): MediaRecoveryConfig {
  switch (operation) {
    case 'image_generation':
      return { type: 'image', source: 'image_generation', extension: '.png' }
    case 'music_generation':
      return { type: 'music', source: 'music_generation', extension: '.mp3' }
    case 'text_to_audio_sync':
      return { type: 'audio', source: 'voice_sync', extension: '.wav' }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' ? value : null
}

function getStringArrayField(record: Record<string, unknown>, key: string): readonly string[] {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.filter(item => typeof item === 'string')
}

function parseRecoveryResponseBody(responseBody: string): ParseRecoveryResponseResult {
  try {
    const parsed: unknown = JSON.parse(responseBody)
    if (!isRecord(parsed)) {
      return {
        ok: true,
        value: { imageUrls: [], audio: null, audioUrl: null, songTitle: undefined, lyrics: undefined },
      }
    }

    const dataValue = parsed.data
    const data = isRecord(dataValue) ? dataValue : {}

    return {
      ok: true,
      value: {
        imageUrls: getStringArrayField(parsed, 'image_urls'),
        audio: getStringField(data, 'audio'),
        audioUrl: getStringField(data, 'audio_url'),
        songTitle: data.song_title,
        lyrics: data.lyrics,
      },
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, error: 'invalid_json' }
    }
    throw error
  }
}

function parseJsonRecord(value: string): ParseJsonRecordResult {
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? { ok: true, value: parsed } : { ok: false }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false }
    }
    throw error
  }
}

function extractResourceUrls(operation: MediaRecoveryOperation, responseData: RecoveryResponseData): readonly string[] {
  switch (operation) {
    case 'image_generation':
      return responseData.imageUrls
    case 'music_generation':
      return responseData.audio ? [responseData.audio] : []
    case 'text_to_audio_sync':
      return responseData.audioUrl ? [responseData.audioUrl] : []
  }
}

function createBaseMetadata(log: ExternalApiLog, resourceUrl: string): Record<string, unknown> {
  return {
    source_url: resourceUrl,
    external_api_log_id: log.id,
    operation: log.operation,
    service_provider: log.service_provider,
  }
}

function createPlanMetadata(log: ExternalApiLog, resourceUrl: string, responseData: RecoveryResponseData): Record<string, unknown> {
  const baseMetadata = createBaseMetadata(log, resourceUrl)
  if (log.operation !== 'music_generation') {
    return { ...baseMetadata, restored_from_log: true }
  }

  return {
    song_title: responseData.songTitle,
    lyrics: responseData.lyrics,
    ...baseMetadata,
    restored_from_log: true,
  }
}

function getMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (isRecord(metadata)) return metadata
  if (typeof metadata !== 'string') return null

  const parsed = parseJsonRecord(metadata)
  return parsed.ok ? parsed.value : null
}

function collectRecoveredSourceKeys(existingMedia: readonly ExistingMediaForRecovery[]): ReadonlySet<string> {
  const sourceKeys = new Set<string>()
  for (const record of existingMedia) {
    const metadata = getMetadataRecord(record.metadata)
    if (!metadata) continue

    const sourceUrl = metadata.source_url
    if (typeof sourceUrl === 'string') {
      sourceKeys.add(sourceUrl)
    }

    const logId = metadata.external_api_log_id
    if (typeof logId === 'number') {
      sourceKeys.add(`__log_${logId}`)
    }
  }
  return sourceKeys
}

export function buildRecoverableMediaCandidates(input: BuildRecoverableMediaCandidatesInput): readonly RecoverableMediaCandidate[] {
  const recoveredSourceKeys = collectRecoveredSourceKeys(input.existingMedia)
  const candidates: RecoverableMediaCandidate[] = []

  for (const log of input.logs) {
    const operation = getRecoveryOperation(log.operation)
    if (!operation || !log.response_body) continue

    const parsed = parseRecoveryResponseBody(log.response_body)
    if (!parsed.ok) continue


    const config = getRecoveryConfig(operation)
    const resourceUrls = extractResourceUrls(operation, parsed.value)
    resourceUrls.forEach((resourceUrl, index) => {
      if (recoveredSourceKeys.has(resourceUrl) || recoveredSourceKeys.has(`__log_${log.id}`)) return

      const baseCandidate = {
        log_id: log.id,
        operation,
        type: config.type,
        source: config.source,
        resource_url: resourceUrl,
        created_at: log.created_at,
        metadata: createBaseMetadata(log, resourceUrl),
      }

      candidates.push(
        config.type === 'image'
          ? { ...baseCandidate, image_index: index }
          : baseCandidate
      )
    })
  }

  return candidates
}

export function createMediaRecoveryPlan(input: CreateMediaRecoveryPlanInput): CreateMediaRecoveryPlanResult {
  const operation = getRecoveryOperation(input.log.operation)
  if (!operation) {
    return { ok: false, error: 'unsupported_operation' }
  }

  if (!input.log.response_body) {
    return { ok: false, error: 'invalid_log_response' }
  }

  const parsed = parseRecoveryResponseBody(input.log.response_body)
  if (!parsed.ok) {
    return { ok: false, error: 'invalid_log_response' }
  }

  const resourceUrls = extractResourceUrls(operation, parsed.value)
  if (resourceUrls.length === 0) {
    return { ok: false, error: 'no_resource_url' }
  }

  const resourceUrl = input.requestedResourceUrl ?? resourceUrls[0]
  if (!resourceUrl) {
    return { ok: false, error: 'no_resource_url' }
  }

  if (!resourceUrls.includes(resourceUrl)) {
    return { ok: false, error: 'resource_url_not_found' }
  }

  const config = getRecoveryConfig(operation)
  return {
    ok: true,
    value: {
      resourceUrl,
      originalName: `${operation}_${input.log.id}${config.extension}`,
      type: config.type,
      source: config.source,
      metadata: createPlanMetadata(input.log, resourceUrl, parsed.value),
    },
  }
}
