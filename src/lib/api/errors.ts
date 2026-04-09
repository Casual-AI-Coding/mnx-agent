import { AxiosError } from 'axios'
import { isAxiosError } from 'axios'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface MiniMaxErrorResponse {
  base_resp?: {
    status_code: number
    status_msg: string
  }
  error?: {
    code: string
    message: string
  }
}

const ERROR_CODE_MAP: Record<number, { status: number; message: string }> = {
  0: { status: 200, message: 'success' },
  1002: { status: 429, message: 'Rate limit exceeded' },
  1008: { status: 402, message: 'Insufficient balance' },
}

export function handleAxiosError(error: unknown): never {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status
    const responseData = error.response?.data as MiniMaxErrorResponse | undefined
    
    const apiCode = responseData?.base_resp?.status_code ?? 
      (responseData?.error?.code ? Number(responseData.error.code) : statusCode)
    const message = responseData?.base_resp?.status_msg ?? 
      responseData?.error?.message ?? 
      error.message ?? 
      'Unknown error'

    throw new ApiError(message, statusCode, apiCode?.toString(), responseData)
  }
  
  if (error instanceof Error) {
    throw new ApiError(error.message)
  }
  
  throw new ApiError('Unknown error')
}

export function handleFetchError(response: Response, data?: unknown): never {
  const statusCode = response.status
  let message = 'Unknown error'
  let code: string | undefined
  
  if (data && typeof data === 'object') {
    const responseData = data as MiniMaxErrorResponse
    message = responseData.base_resp?.status_msg ?? 
      responseData.error?.message ?? 
      message
    code = responseData.base_resp?.status_code?.toString() ?? 
      responseData.error?.code
  }
  
  throw new ApiError(message, statusCode, code, data)
}

export function getErrorMapping(statusCode: number): { status: number; message: string } {
  return ERROR_CODE_MAP[statusCode] || { status: 500, message: 'Internal server error' }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isRateLimitError(error: unknown): boolean {
  return isApiError(error) && (error.statusCode === 429 || error.code === '1002')
}

export function isAuthError(error: unknown): boolean {
  return isApiError(error) && error.statusCode === 401
}

/**
 * Convert an error to an ApiResponse error format (for cron.ts pattern).
 * Returns { success: false, error: message } instead of throwing.
 */
export function toApiResponse(error: unknown): { success: false; error: string } {
  if (isApiError(error)) {
    return { success: false, error: error.message }
  }
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string; data?: { error?: string } }>
    const message = axiosError.response?.data?.error
      || axiosError.response?.data?.data?.error
      || axiosError.response?.data?.message
      || axiosError.message
      || 'Unknown error'
    return { success: false, error: message }
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return { success: false, error: message }
}