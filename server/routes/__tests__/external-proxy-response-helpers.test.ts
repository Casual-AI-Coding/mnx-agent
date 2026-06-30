import { describe, expect, it } from 'vitest'
import {
  extractAllImages,
  extractErrorMessage,
  stripBase64Images,
  toExternalProxyResultData,
} from '../external-proxy/external-proxy-response-helpers'

describe('external-proxy-response-helpers', () => {
  it('extracts url and base64 image payloads from response data arrays', () => {
    const images = extractAllImages({
      data: [
        { url: 'https://example.com/a.png' },
        { b64_json: 'YmFzZTY0' },
        { ignored: true },
        'not-record',
      ],
    })

    expect(images).toEqual([
      { url: 'https://example.com/a.png', base64: undefined },
      { url: undefined, base64: 'YmFzZTY0' },
    ])
  })

  it('strips base64 image fields without mutating the original response body', () => {
    const body = {
      data: [
        { b64_json: 'large-payload', url: 'https://example.com/a.png' },
        { url: 'https://example.com/b.png' },
      ],
      keep: true,
    }

    const cleaned = stripBase64Images(body)

    expect(cleaned).toEqual({
      data: [
        { url: 'https://example.com/a.png' },
        { url: 'https://example.com/b.png' },
      ],
      keep: true,
    })
    expect(body.data[0]).toEqual({ b64_json: 'large-payload', url: 'https://example.com/a.png' })
  })

  it('extracts provider specific error messages before falling back to http status', () => {
    expect(extractErrorMessage({ error: { message: 'openai error' } }, 500)).toBe('openai error')
    expect(extractErrorMessage({ base_resp: { status_msg: 'minimax error' } }, 500)).toBe('minimax error')
    expect(extractErrorMessage({ error: 'plain error' }, 500)).toBe('plain error')
    expect(extractErrorMessage({ message: 'message error' }, 500)).toBe('message error')
    expect(extractErrorMessage('server exploded', 502)).toBe('HTTP 502')
  })

  it('keeps result data only for object responses', () => {
    expect(toExternalProxyResultData({ data: [{ url: 'https://example.com/a.png' }] })).toEqual({
      data: [{ url: 'https://example.com/a.png' }],
    })
    expect(toExternalProxyResultData(['array'])).toBeNull()
    expect(toExternalProxyResultData('text')).toBeNull()
    expect(toExternalProxyResultData(null)).toBeNull()
  })
})
