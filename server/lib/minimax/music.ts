import type { AxiosError } from 'axios'
import { retryWithBackoff } from '../retry.js'
import { toLocalISODateString } from '../date-utils.js'
import { getLogger } from '../logger.js'
import { withExternalApiAudit } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

const logger = getLogger()

export async function musicGeneration(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/music_generation',
    'music_generation',
    body,
    async () => {
      logger.debug({ body, timestamp: toLocalISODateString() }, '[MiniMax] Music Generation Request')

      return retryWithBackoff(async () => {
        try {
          const response = await client['client'].post('/v1/music_generation', body, {
            timeout: 300000,
          })
          return response.data
        } catch (error) {
          return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
        }
      })
    }
  )()
}

export async function lyricsGeneration(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/lyrics_generation',
    'lyrics_generation',
    body,
    async () => {
      getLogger().info({ body, timestamp: toLocalISODateString() }, '[MiniMax] Lyrics Generation Request')

      return retryWithBackoff(async () => {
        try {
          const response = await client['client'].post('/v1/lyrics_generation', body, {
            timeout: 60000,
          })
          return response.data
        } catch (error) {
          return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
        }
      })
    }
  )()
}

export async function musicPreprocess(client: MiniMaxClient, formData: FormData): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/music_cover_preprocess',
    'music_preprocess',
    formData,
    async () => {
      try {
        const response = await client['client'].post('/v1/music_cover_preprocess', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.musicGeneration = function (body: Record<string, unknown>): Promise<unknown> {
  return musicGeneration(this, body)
}

MiniMaxClient.prototype.lyricsGeneration = function (body: Record<string, unknown>): Promise<unknown> {
  return lyricsGeneration(this, body)
}

MiniMaxClient.prototype.musicPreprocess = function (formData: FormData): Promise<unknown> {
  return musicPreprocess(this, formData)
}

declare module './client.js' {
  interface MiniMaxClient {
    musicGeneration(body: Record<string, unknown>): Promise<unknown>
    lyricsGeneration(body: Record<string, unknown>): Promise<unknown>
    musicPreprocess(formData: FormData): Promise<unknown>
  }
}
