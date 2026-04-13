import { apiClient } from './client'
import { toApiResponse } from './errors'

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
          response = await apiClient.get(path, { params: params.query as Record<string, unknown> | undefined })
          break
        case 'POST':
          response = await apiClient.post(path, params.body)
          break
        case 'PUT':
          response = await apiClient.put(path, params.body)
          break
        case 'PATCH':
          response = await apiClient.patch(path, params.body)
          break
        case 'DELETE':
          response = await apiClient.delete(path)
          break
      }

      const typedResponse = response as { data: { data: unknown } }
      const data = config.transformResult ? config.transformResult(typedResponse.data.data) : typedResponse.data.data
      return { success: true, data: data as TResult }
    } catch (error) {
      return toApiResponse(error)
    }
  }
}

function resolvePathParams(path: string, params: Record<string, unknown>): string {
  return path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
    return params[key]?.toString() ?? ''
  })
}