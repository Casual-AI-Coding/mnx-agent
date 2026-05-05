import type { AxiosError } from 'axios'
import { withExternalApiAudit, withExternalApiLog } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function voiceList(client: MiniMaxClient, voiceType: string = 'all'): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'POST /v1/get_voice',
    'voice_list',
    async () => {
      try {
        const response = await client['client'].post('/v1/get_voice', { voice_type: voiceType })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function voiceDelete(client: MiniMaxClient, voiceId: string, voiceType: string): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/delete_voice',
    'voice_delete',
    { voice_id: voiceId, voice_type: voiceType },
    async () => {
      try {
        const response = await client['client'].post('/v1/delete_voice', { voice_id: voiceId, voice_type: voiceType })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function voiceClone(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/voice_clone',
    'voice_clone',
    body,
    async () => {
      try {
        const response = await client['client'].post('/v1/voice_clone', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function voiceDesign(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/voice_design',
    'voice_design',
    body,
    async () => {
      try {
        const response = await client['client'].post('/v1/voice_design', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.voiceList = function (voiceType: string = 'all'): Promise<unknown> {
  return voiceList(this, voiceType)
}

MiniMaxClient.prototype.voiceDelete = function (voiceId: string, voiceType: string): Promise<unknown> {
  return voiceDelete(this, voiceId, voiceType)
}

MiniMaxClient.prototype.voiceClone = function (body: Record<string, unknown>): Promise<unknown> {
  return voiceClone(this, body)
}

MiniMaxClient.prototype.voiceDesign = function (body: Record<string, unknown>): Promise<unknown> {
  return voiceDesign(this, body)
}

declare module './client.js' {
  interface MiniMaxClient {
    voiceList(voiceType?: string): Promise<unknown>
    voiceDelete(voiceId: string, voiceType: string): Promise<unknown>
    voiceClone(body: Record<string, unknown>): Promise<unknown>
    voiceDesign(body: Record<string, unknown>): Promise<unknown>
  }
}
