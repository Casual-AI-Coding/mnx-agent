import type { AxiosError } from 'axios'
import { retryWithBackoff } from '../retry.js'
import { withExternalApiAudit } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function imageGeneration(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/image_generation',
    'image_generation',
    body,
    async () => retryWithBackoff(async () => {
      try {
        const response = await client['client'].post('/v1/image_generation', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  )()
}

MiniMaxClient.prototype.imageGeneration = function (body: Record<string, unknown>): Promise<unknown> {
  return imageGeneration(this, body)
}

declare module './client.js' {
  interface MiniMaxClient {
    imageGeneration(body: Record<string, unknown>): Promise<unknown>
  }
}
