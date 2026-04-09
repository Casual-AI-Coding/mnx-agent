import { isAxiosError, type AxiosError } from 'axios'
import { ApiError, isApiError } from './errors'

export { isApiError } from './errors'

/**
 * Unified error handler for API calls.
 * Handles both AxiosError and regular Error objects consistently.
 */
export function handleApiError(error: unknown, context: string): ApiError {
  const message = extractErrorMessage(error)
  const statusCode = extractStatusCode(error)

  console.error(`[API Error] ${context}:`, { message, statusCode, originalError: error })

  return new ApiError(message, statusCode)
}

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string; data?: { error?: string }; base_resp?: { status_msg?: string } }>
    return (
      axiosError.response?.data?.error ||
      axiosError.response?.data?.data?.error ||
      axiosError.response?.data?.message ||
      axiosError.response?.data?.base_resp?.status_msg ||
      axiosError.message ||
      'Unknown error'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unknown error'
}

function extractStatusCode(error: unknown): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status
  }
  if (isApiError(error)) {
    return error.statusCode
  }
  return undefined
}

/**
 * Wrapper for API calls that automatically extracts and throws unified ApiError
 */
export async function callApi<T>(
  apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>,
  context: string = 'api call'
): Promise<T> {
  try {
    const response = await apiCall()
    if (!response.success || response.data === undefined) {
      throw handleApiError(
        { message: response.error || 'API call failed' },
        context
      )
    }
    return response.data
  } catch (error) {
    if (isApiError(error)) {
      throw error
    }
    throw handleApiError(error, context)
  }
}

/**
 * Wrapper for API calls that work with raw axios responses (no success wrapper)
 * Automatically checks response structure and throws unified ApiError on failure
 */
export async function callApiRaw<T>(
  apiCall: () => Promise<T>,
  context: string = 'api call'
): Promise<T> {
  try {
    const response = await apiCall()

    if (typeof response === 'object' && response !== null && 'success' in response) {
      const typedResponse = response as { success: boolean; data?: T; error?: string }
      if (!typedResponse.success || typedResponse.data === undefined) {
        throw handleApiError(
          { message: typedResponse.error || 'API call failed' },
          context
        )
      }
      return typedResponse.data
    }

    return response
  } catch (error) {
    if (isApiError(error)) {
      throw error
    }
    throw handleApiError(error, context)
  }
}
