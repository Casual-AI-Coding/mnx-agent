import { apiClient } from './client'
import { toApiResponse } from './errors'

interface ApiEnvelope<TResult> {
  readonly data: TResult
}

interface ApiClientResponse<TResult> {
  readonly data: ApiEnvelope<TResult>
}

interface ApiMethodConfig<TParams, TResult> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string | ((params: TParams) => string)
  transformResult?: (data: unknown) => TResult
}

export function createApiMethod<TParams extends Record<string, unknown>, TResult>(
  config: ApiMethodConfig<TParams, TResult>
): (params: TParams) => Promise<{ success: boolean; data?: TResult; error?: string }> {
  return async (params: TParams): Promise<{ success: boolean; data?: TResult; error?: string }> => {
    try {
      const path = typeof config.path === 'function' ? config.path(params) : resolvePathParams(config.path, params)

      let response: unknown
      switch (config.method) {
        case 'GET':
          response = await apiClient.get<ApiClientResponse<TResult>>(path, { params: getQueryParams(params) })
          break
        case 'POST':
          response = await apiClient.post<ApiClientResponse<TResult>>(path, params.body)
          break
        case 'PUT':
          response = await apiClient.put<ApiClientResponse<TResult>>(path, params.body)
          break
        case 'PATCH':
          response = await apiClient.patch<ApiClientResponse<TResult>>(path, params.body)
          break
        case 'DELETE':
          response = await apiClient.delete<ApiClientResponse<TResult>>(path)
          break
      }

      if (!isApiClientResponse<TResult>(response)) {
        throw new Error('Invalid API response format')
      }

      const data = config.transformResult ? config.transformResult(response.data.data) : response.data.data
      return { success: true, data }
    } catch (error) {
      return toApiResponse(error)
    }
  }
}

function isApiClientResponse<TResult>(response: unknown): response is ApiClientResponse<TResult> {
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return false
  }

  const envelope = response.data

  return typeof envelope === 'object' && envelope !== null && 'data' in envelope
}

function getQueryParams(params: Record<string, unknown>): Record<string, unknown> | undefined {
  const query = params.query

  if (typeof query !== 'object' || query === null || Array.isArray(query)) {
    return undefined
  }

  return Object.fromEntries(Object.entries(query))
}

function resolvePathParams(path: string, params: Record<string, unknown>): string {
  return path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
    return params[key]?.toString() ?? ''
  })
}
