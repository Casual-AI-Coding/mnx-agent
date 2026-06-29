import type { ApiResponse } from './errors'
import { toApiResponse } from './errors'

export interface ApiEnvelopeResponse<TPayload> {
  readonly data: {
    readonly data: TPayload
  }
}

export async function withApiResponse<TPayload>(
  request: () => Promise<unknown>
): Promise<ApiResponse<TPayload>>

export async function withApiResponse<TPayload, TResult>(
  request: () => Promise<unknown>,
  transformResult?: (payload: TPayload) => TResult
): Promise<ApiResponse<TResult>>

export async function withApiResponse<TPayload, TResult>(
  request: () => Promise<unknown>,
  transformResult?: (payload: TPayload) => TResult
): Promise<ApiResponse<TPayload | TResult>> {
  try {
    const response = await request()
    if (!isApiEnvelopeResponse<TPayload>(response)) {
      throw new Error('Invalid API response format')
    }

    const payload = response.data.data
    const data = transformResult ? transformResult(payload) : payload

    return { success: true, data }
  } catch (error) {
    return toApiResponse(error)
  }
}

function isApiEnvelopeResponse<TPayload>(response: unknown): response is ApiEnvelopeResponse<TPayload> {
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return false
  }

  const envelope = response.data

  return typeof envelope === 'object' && envelope !== null && 'data' in envelope
}
