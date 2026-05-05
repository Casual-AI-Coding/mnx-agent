import type { AxiosError } from 'axios'

export const API_HOSTS = {
  domestic: 'https://api.minimaxi.com',
  international: 'https://api.minimax.io',
} as const

export type Region = 'domestic' | 'international'

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

export interface MiniMaxError {
  code: number
  message: string
}

export interface MiniMaxErrorContext {
  code: number
  status: number
  response?: MiniMaxErrorResponse
  cause: AxiosError<MiniMaxErrorResponse>
  axiosCode?: string
}

export class MiniMaxClientError extends Error implements MiniMaxError {
  code: number
  status: number
  response?: MiniMaxErrorResponse
  cause: AxiosError<MiniMaxErrorResponse>
  axiosCode?: string

  constructor(message: string, context: MiniMaxErrorContext) {
    super(message)
    this.name = 'MiniMaxClientError'
    this.code = context.code
    this.status = context.status
    this.response = context.response
    this.cause = context.cause
    this.axiosCode = context.axiosCode
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      response: this.response,
      axiosCode: this.axiosCode,
      cause: {
        name: this.cause.name,
        message: this.cause.message,
        code: this.cause.code,
        status: this.cause.response?.status,
      },
    }
  }
}

export const ERROR_CODE_MAP: Record<number, { status: number; message: string }> = {
  0: { status: 200, message: 'success' },
  1002: { status: 429, message: 'Rate limit exceeded' },
  1008: { status: 402, message: 'Insufficient balance' },
}

export function getErrorMapping(statusCode: number): { status: number; message: string } {
  return ERROR_CODE_MAP[statusCode] || { status: 500, message: 'Internal server error' }
}
