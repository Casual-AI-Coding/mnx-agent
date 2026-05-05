import type { AxiosError } from 'axios'
import { retryWithBackoff } from '../retry.js'
import { withExternalApiAudit, withExternalApiLog } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function textToAudioSync(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/t2a_v2',
    'text_to_audio_sync',
    body,
    async () => retryWithBackoff(async () => {
      try {
        const response = await client['client'].post('/v1/t2a_v2', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  )()
}

export async function textToAudioAsync(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/t2a_async_v2',
    'text_to_audio_async',
    body,
    async () => retryWithBackoff(async () => {
      try {
        const response = await client['client'].post('/v1/t2a_async_v2', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  )()
}

export async function textToAudioAsyncStatus(client: MiniMaxClient, taskId: string): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/t2a_async_v2',
    'text_to_audio_async_status',
    async () => {
      try {
        const response = await client['client'].get(`/v1/t2a_async_v2?task_id=${taskId}`)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.textToAudioSync = function (body: Record<string, unknown>): Promise<unknown> {
  return textToAudioSync(this, body)
}

MiniMaxClient.prototype.textToAudioAsync = function (body: Record<string, unknown>): Promise<unknown> {
  return textToAudioAsync(this, body)
}

MiniMaxClient.prototype.textToAudioAsyncStatus = function (taskId: string): Promise<unknown> {
  return textToAudioAsyncStatus(this, taskId)
}

declare module './client.js' {
  interface MiniMaxClient {
    textToAudioSync(body: Record<string, unknown>): Promise<unknown>
    textToAudioAsync(body: Record<string, unknown>): Promise<unknown>
    textToAudioAsyncStatus(taskId: string): Promise<unknown>
  }
}
