import type { ApiResponse } from './errors'
import { toApiResponse } from './errors'

export interface ApiEnvelopeResponse<TPayload> {
  readonly data: {
    readonly data: TPayload
  }
}

export async function withApiResponse<TPayload>(
  request: () => Promise<ApiEnvelopeResponse<TPayload>>
): Promise<ApiResponse<TPayload>>

export async function withApiResponse<TPayload, TResult>(
  request: () => Promise<ApiEnvelopeResponse<TPayload>>,
  transformResult?: (payload: TPayload) => TResult
): Promise<ApiResponse<TResult>>

export async function withApiResponse<TPayload, TResult>(
  request: () => Promise<ApiEnvelopeResponse<TPayload>>,
  transformResult?: (payload: TPayload) => TResult
): Promise<ApiResponse<TPayload | TResult>> {
  try {
    const response = await request()
    const payload = response.data.data
    const data = transformResult ? transformResult(payload) : payload

    return { success: true, data }
  } catch (error) {
    return toApiResponse(error)
  }
}
