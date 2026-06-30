import { describe, expect, it } from 'vitest'
import {
  getProxyErrorMessage,
  parseExternalProxyResponseText,
  parseExternalProxyUrl,
} from '../external-proxy/external-proxy-request-helpers'

describe('external-proxy-request-helpers', () => {
  it('parses valid urls and returns explicit errors for invalid urls', () => {
    const parsed = parseExternalProxyUrl('https://api.sisyphusx.com/v1/images')
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.url.hostname).toBe('api.sisyphusx.com')
    }

    expect(parseExternalProxyUrl('not a url')).toEqual({ ok: false, error: '无效的 URL' })
  })

  it('parses json response text and falls back to raw text', () => {
    expect(parseExternalProxyResponseText('{"ok":true,"count":2}')).toEqual({ ok: true, count: 2 })
    expect(parseExternalProxyResponseText('[1,2,3]')).toEqual([1, 2, 3])
    expect(parseExternalProxyResponseText('plain text')).toBe('plain text')
  })

  it('normalizes unknown errors to stable messages', () => {
    expect(getProxyErrorMessage(new Error('network failed'), 'fallback')).toBe('network failed')
    expect(getProxyErrorMessage('string failed', 'fallback')).toBe('fallback')
    expect(getProxyErrorMessage(undefined, 'fallback')).toBe('fallback')
  })
})
