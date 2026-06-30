import type { MediaType } from '../../database/types'

export const EXTERNAL_PROXY_MEDIA_TYPES = [
  'image',
  'video',
  'audio',
  'music',
] as const satisfies readonly MediaType[]

export type ExternalProxyMediaType = (typeof EXTERNAL_PROXY_MEDIA_TYPES)[number]

export type ExternalProxyMediaTypeParseResult =
  | { readonly ok: true; readonly mediaType: ExternalProxyMediaType }
  | { readonly ok: false; readonly error: string }

export function parseExternalProxyMediaType(value: unknown): ExternalProxyMediaTypeParseResult {
  if (typeof value !== 'string') {
    return { ok: false, error: 'Invalid external proxy media type' }
  }

  for (const mediaType of EXTERNAL_PROXY_MEDIA_TYPES) {
    if (value === mediaType) {
      return { ok: true, mediaType }
    }
  }

  return { ok: false, error: 'Invalid external proxy media type' }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
