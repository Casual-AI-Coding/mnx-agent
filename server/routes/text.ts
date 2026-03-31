import { Router, Request, Response } from 'express'
import { getMiniMaxClient, createMiniMaxClientFromHeaders, MiniMaxClient } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'

const router = Router()

function getClient(req: Request): MiniMaxClient {
  const apiKey = req.headers['x-api-key'] as string | undefined
  const region = req.headers['x-region'] as string | undefined
  const hasValidApiKey = apiKey && apiKey.trim().length > 0
  return hasValidApiKey 
    ? createMiniMaxClientFromHeaders(apiKey!.trim(), region)
    : getMiniMaxClient()
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequestBody {
  model?: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  top_p?: number
  max_completion_tokens?: number
}

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    
    const { model, messages, temperature, top_p, max_completion_tokens } = req.body as ChatRequestBody

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'messages is required and must be a non-empty array' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'abab5.5-chat',
      messages,
    }

    if (temperature !== undefined) body.temperature = temperature
    if (top_p !== undefined) body.top_p = top_p
    if (max_completion_tokens !== undefined) body.max_completion_tokens = max_completion_tokens

    const result = await client.chatCompletion(body)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    
    const { model, messages, temperature, top_p, max_completion_tokens } = req.body as ChatRequestBody

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'messages is required and must be a non-empty array' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'abab5.5-chat',
      messages,
      stream: true,
    }

    if (temperature !== undefined) body.temperature = temperature
    if (top_p !== undefined) body.top_p = top_p
    if (max_completion_tokens !== undefined) body.max_completion_tokens = max_completion_tokens

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const chunks = await client.chatCompletionStream(body)

    for (const chunk of chunks) {
      res.write(`data: ${chunk.data}\n\n`)
    }

    res.end()
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router
