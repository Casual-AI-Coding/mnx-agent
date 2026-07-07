import { z } from 'zod'
import { batchDeleteSchema, listMediaQuerySchema, mediaSourceEnum, mediaTypeEnum } from '../../validation/media-schemas.js'
import type { MediaSource, MediaType } from '../../database/types.js'

export type MediaRouteRole = 'user' | 'pro' | 'admin' | 'super'

export interface MediaListRouteInput {
  readonly query: unknown
  readonly userId?: string
  readonly role?: MediaRouteRole
  readonly visibilityOwnerId?: string
}

export interface MediaListServiceOptions {
  readonly type?: string
  readonly source?: string
  readonly search?: string
  readonly limit: number
  readonly offset: number
  readonly includeDeleted?: boolean
  readonly visibilityOwnerId?: string
  readonly favoriteFilter?: ('favorite' | 'non-favorite')[]
  readonly publicFilter?: ('private' | 'public' | 'others-public')[]
  readonly favoriteUserId?: string
  readonly pinnedUserId?: string
  readonly role?: MediaRouteRole
}

export interface MediaListRouteOptions {
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly offset: number
  }
  readonly mediaOptions: MediaListServiceOptions
}

export type UploadMetadataParseResult =
  | { readonly ok: true; readonly metadata?: Record<string, unknown> }
  | { readonly ok: false; readonly error: string }

export type BatchIdsParseResult =
  | { readonly ok: true; readonly ids: string[] }
  | { readonly ok: false; readonly error: string }

export type MediaUploadFieldsParseResult =
  | { readonly ok: true; readonly type: MediaType; readonly source?: MediaSource }
  | { readonly ok: false; readonly error: string }

export type UploadFromUrlBodyParseResult =
  | {
      readonly ok: true
      readonly url: string
      readonly filename?: string
      readonly type: MediaType
      readonly source?: MediaSource
      readonly metadata?: Record<string, unknown>
    }
  | { readonly ok: false; readonly error: string }

const uploadFieldsSchema = z.object({
  type: mediaTypeEnum,
  source: mediaSourceEnum.optional(),
})

const uploadFromUrlBodySchema = uploadFieldsSchema.extend({
  url: z.string().min(1),
  filename: z.string().min(1).optional(),
  metadata: z.unknown().optional(),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function optionalText(value: string | undefined): string | undefined {
  if (!value || value.length === 0) {
    return undefined
  }
  return value
}

export function buildMediaListRouteOptions(input: MediaListRouteInput): MediaListRouteOptions {
  const query = listMediaQuerySchema.parse(input.query)
  const offset = (query.page - 1) * query.limit

  return {
    pagination: {
      page: query.page,
      limit: query.limit,
      offset,
    },
    mediaOptions: {
      type: optionalText(query.type),
      source: optionalText(query.source),
      search: optionalText(query.search),
      limit: query.limit,
      offset,
      includeDeleted: query.includeDeleted,
      visibilityOwnerId: input.visibilityOwnerId,
      favoriteFilter: query.favoriteFilter,
      publicFilter: query.publicFilter,
      favoriteUserId: input.userId,
      pinnedUserId: input.userId,
      role: input.role,
    },
  }
}

export function parseUploadMetadata(value: unknown): UploadMetadataParseResult {
  if (value === undefined || value === null || value === '') {
    return { ok: true }
  }

  if (isRecord(value)) {
    return { ok: true, metadata: value }
  }

  if (typeof value !== 'string') {
    return { ok: false, error: 'Invalid metadata JSON' }
  }

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) {
      return { ok: false, error: 'Invalid metadata JSON' }
    }
    return { ok: true, metadata: parsed }
  } catch (parseError: unknown) {
    const parseFailure = parseError instanceof Error ? parseError.message : String(parseError)
    if (parseFailure.length === 0) {
      return { ok: false, error: 'Invalid metadata JSON' }
    }
    return { ok: false, error: 'Invalid metadata JSON' }
  }
}

export function parseBatchIds(value: unknown): BatchIdsParseResult {
  const parsed = batchDeleteSchema.safeParse(value)
  if (!parsed.success) {
    return { ok: false, error: 'ids must be non-empty array' }
  }

  return { ok: true, ids: [...parsed.data.ids] }
}

export function parseMediaUploadFields(value: unknown): MediaUploadFieldsParseResult {
  const parsed = uploadFieldsSchema.safeParse(value)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid media upload fields' }
  }

  return {
    ok: true,
    type: parsed.data.type,
    source: parsed.data.source,
  }
}

export function parseUploadFromUrlBody(value: unknown): UploadFromUrlBodyParseResult {
  const parsed = uploadFromUrlBodySchema.safeParse(value)
  if (!parsed.success) {
    return { ok: false, error: 'url and type are required' }
  }

  const metadataResult = parseUploadMetadata(parsed.data.metadata)
  if (!metadataResult.ok) {
    return metadataResult
  }

  return {
    ok: true,
    url: parsed.data.url,
    filename: parsed.data.filename,
    type: parsed.data.type,
    source: parsed.data.source,
    metadata: metadataResult.metadata,
  }
}
