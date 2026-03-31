import { getBaseUrl, getHeaders } from './config'
import type { 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionStreamChunk 
} from '@/types'

export async function* streamChatCompletion(
  request: ChatCompletionRequest
): AsyncGenerator<ChatCompletionStreamChunk, void, unknown> {
  const response = await fetch(`${getBaseUrl()}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, stream: true }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to stream chat completion')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No reader available')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      
      try {
        yield JSON.parse(data)
      } catch {
        continue
      }
    }
  }
}

export async function createChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, stream: false }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to create chat completion')
  }

  return response.json()
}