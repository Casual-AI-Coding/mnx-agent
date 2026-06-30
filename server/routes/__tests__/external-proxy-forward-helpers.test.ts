import { describe, expect, it } from 'vitest'
import {
  buildForwardHeaders,
  executeExternalProxyRequest,
  sanitizeResponseHeaders,
} from '../external-proxy/external-proxy-forward-helpers.js'

describe('external proxy forward helpers', () => {
  it('buildForwardHeaders keeps caller headers but removes host', () => {
    const headers = buildForwardHeaders({
      Host: 'evil.internal',
      Authorization: 'Bearer test-token',
      'X-Trace-Id': 'trace-1',
    })

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
      'X-Trace-Id': 'trace-1',
    })
  })

  it('sanitizeResponseHeaders removes hop-by-hop and encoded transfer headers', () => {
    const headers = new Headers({
      Connection: 'keep-alive',
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'X-Request-Id': 'req-1',
    })

    expect(sanitizeResponseHeaders(headers)).toEqual({
      'content-type': 'application/json',
      'x-request-id': 'req-1',
    })
  })

  it('executeExternalProxyRequest sends JSON body and parses JSON response text', async () => {
    let capturedUrl: string | undefined
    let capturedInit: RequestInit | undefined
    const fetcher = async (url: string, init: RequestInit): Promise<Response> => {
      capturedUrl = url
      capturedInit = init
      return new Response('{"ok":true}', {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await executeExternalProxyRequest({
      url: 'https://api.sisyphusx.com/v1/test',
      method: 'POST',
      headers: { Host: 'blocked.host', Authorization: 'Bearer token' },
      body: { prompt: 'hello' },
      timeoutMs: 1000,
      fetcher,
    })

    if (!capturedInit) {
      throw new Error('fetcher was not called')
    }

    expect(capturedUrl).toBe('https://api.sisyphusx.com/v1/test')
    expect(capturedInit.method).toBe('POST')
    expect(capturedInit.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    })
    expect(capturedInit.body).toBe('{"prompt":"hello"}')
    expect(capturedInit.signal).toBeDefined()
    expect(result.status).toBe(201)
    expect(result.body).toEqual({ ok: true })
    expect(result.headers).toEqual({ 'content-type': 'application/json' })
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})
