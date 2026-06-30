import { EXTERNAL_PROXY_TIMEOUTS } from '../../config/timeouts.js'
import { parseExternalProxyResponseText } from './external-proxy-request-helpers.js'

export type ExternalProxyFetcher = (url: string, init: RequestInit) => Promise<Response>

export interface ExternalProxyForwardInput {
  readonly url: string
  readonly method: string
  readonly headers?: Readonly<Record<string, string>>
  readonly body?: unknown
  readonly timeoutMs?: number
  readonly fetcher?: ExternalProxyFetcher
}

export interface ExternalProxyForwardResult {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly body: unknown
  readonly durationMs: number
}

const BLOCKED_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'content-encoding',
  'connection',
])

export function buildForwardHeaders(headers?: Readonly<Record<string, string>>): Record<string, string> {
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (!headers) {
    return forwardHeaders
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== 'host') {
      forwardHeaders[key] = value
    }
  }

  return forwardHeaders
}

export function sanitizeResponseHeaders(headers: Headers): Record<string, string> {
  const responseHeaders: Record<string, string> = {}

  headers.forEach((value, key) => {
    if (!BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders[key] = value
    }
  })

  return responseHeaders
}

export async function executeExternalProxyRequest(input: ExternalProxyForwardInput): Promise<ExternalProxyForwardResult> {
  const startTime = performance.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? EXTERNAL_PROXY_TIMEOUTS.PROXY_REQUEST_MS
  )

  try {
    const fetcher = input.fetcher ?? fetch
    const response = await fetcher(input.url, {
      method: input.method,
      headers: buildForwardHeaders(input.headers),
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: controller.signal,
    })
    const durationMs = Math.round(performance.now() - startTime)
    const responseText = await response.text()

    return {
      status: response.status,
      headers: sanitizeResponseHeaders(response.headers),
      body: parseExternalProxyResponseText(responseText),
      durationMs,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
