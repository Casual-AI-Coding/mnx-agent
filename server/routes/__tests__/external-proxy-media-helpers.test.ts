import { describe, expect, it } from 'vitest'
import {
  EXTERNAL_PROXY_MEDIA_TYPES,
  isRecord,
  parseExternalProxyMediaType,
} from '../external-proxy/external-proxy-media-helpers'

describe('external-proxy-media-helpers', () => {
  it('parses allowed external proxy media types', () => {
    expect(EXTERNAL_PROXY_MEDIA_TYPES).toEqual(['image', 'video', 'audio', 'music'])
    expect(parseExternalProxyMediaType('image')).toEqual({ ok: true, mediaType: 'image' })
    expect(parseExternalProxyMediaType('video')).toEqual({ ok: true, mediaType: 'video' })
    expect(parseExternalProxyMediaType('audio')).toEqual({ ok: true, mediaType: 'audio' })
    expect(parseExternalProxyMediaType('music')).toEqual({ ok: true, mediaType: 'music' })
  })

  it('rejects media types that external proxy must not persist', () => {
    expect(parseExternalProxyMediaType('document')).toEqual({
      ok: false,
      error: 'Invalid external proxy media type',
    })
    expect(parseExternalProxyMediaType('lyrics')).toEqual({
      ok: false,
      error: 'Invalid external proxy media type',
    })
    expect(parseExternalProxyMediaType(undefined)).toEqual({
      ok: false,
      error: 'Invalid external proxy media type',
    })
  })

  it('narrows records without accepting arrays or null values', () => {
    expect(isRecord({ data: [{ url: 'https://example.com/a.png' }] })).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord(['not', 'record'])).toBe(false)
    expect(isRecord('not-record')).toBe(false)
  })
})
