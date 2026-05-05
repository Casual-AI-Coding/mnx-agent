import type { AxiosError } from 'axios'
import { retryWithBackoff } from '../retry.js'
import { withExternalApiAudit, withExternalApiLog } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function videoGeneration(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/video_generation',
    'video_generation',
    body,
    async () => retryWithBackoff(async () => {
      try {
        const response = await client['client'].post('/v1/video_generation', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  )()
}

export async function videoGenerationStatus(client: MiniMaxClient, taskId: string): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/query/video_generation',
    'video_generation_status',
    async () => {
      try {
        const response = await client['client'].get(`/v1/query/video_generation?task_id=${taskId}`)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function videoAgentGenerate(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/video_template_generation',
    'video_agent_generate',
    body,
    async () => {
      try {
        const response = await client['client'].post('/v1/video_template_generation', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function videoAgentStatus(client: MiniMaxClient, taskId: string): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/query/video_template_generation',
    'video_agent_status',
    async () => {
      try {
        const response = await client['client'].get(`/v1/query/video_template_generation?task_id=${taskId}`)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.videoGeneration = function (body: Record<string, unknown>): Promise<unknown> {
  return videoGeneration(this, body)
}

MiniMaxClient.prototype.videoGenerationStatus = function (taskId: string): Promise<unknown> {
  return videoGenerationStatus(this, taskId)
}

MiniMaxClient.prototype.videoAgentGenerate = function (body: Record<string, unknown>): Promise<unknown> {
  return videoAgentGenerate(this, body)
}

MiniMaxClient.prototype.videoAgentStatus = function (taskId: string): Promise<unknown> {
  return videoAgentStatus(this, taskId)
}

declare module './client.js' {
  interface MiniMaxClient {
    videoGeneration(body: Record<string, unknown>): Promise<unknown>
    videoGenerationStatus(taskId: string): Promise<unknown>
    videoAgentGenerate(body: Record<string, unknown>): Promise<unknown>
    videoAgentStatus(taskId: string): Promise<unknown>
  }
}
