import type { AxiosError } from 'axios'
import { retryWithBackoff } from '../retry.js'
import { withExternalApiAudit } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function chatCompletion(client: MiniMaxClient, body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/text/chatcompletion_v2',
    'chat_completion',
    body,
    async () => retryWithBackoff(async () => {
      try {
        const response = await client['client'].post('/v1/text/chatcompletion_v2', body)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  )()
}

export async function chatCompletionStream(client: MiniMaxClient, body: Record<string, unknown>): Promise<{ data: string; isEnd: boolean }[]> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/text/chatcompletion_v2',
    'chat_completion_stream',
    body,
    async () => {
      try {
        const response = await client['client'].post('/v1/text/chatcompletion_v2', body, {
          responseType: 'stream',
        })

        const stream = response.data as AsyncIterable<Buffer>
        const chunks: { data: string; isEnd: boolean }[] = []

        for await (const chunk of stream) {
          const lines = chunk.toString().split('\n').filter(Boolean)
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                chunks.push({ data: '[DONE]', isEnd: true })
              } else {
                chunks.push({ data, isEnd: false })
              }
            }
          }
        }

        return chunks
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.chatCompletion = function (body: Record<string, unknown>): Promise<unknown> {
  return chatCompletion(this, body)
}

MiniMaxClient.prototype.chatCompletionStream = function (body: Record<string, unknown>): Promise<{ data: string; isEnd: boolean }[]> {
  return chatCompletionStream(this, body)
}

declare module './client.js' {
  interface MiniMaxClient {
    chatCompletion(body: Record<string, unknown>): Promise<unknown>
    chatCompletionStream(body: Record<string, unknown>): Promise<{ data: string; isEnd: boolean }[]>
  }
}
