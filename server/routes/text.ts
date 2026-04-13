import { Router, Request, Response } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { handleApiError } from '../middleware/errorHandler'
import { errorResponse } from '../middleware/api-response'

const router = Router()

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

// Non-streaming chat endpoint - uses factory
router.use('/chat', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'chatCompletion',
  buildRequestBody: (req: Request) => {
    const { model, messages, temperature, top_p, max_completion_tokens } = req.body as ChatRequestBody

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw { status: 400, message: 'messages is required and must be a non-empty array' }
    }

    const body: Record<string, unknown> = {
      model: model || 'abab5.5-chat',
      messages,
    }

    if (temperature !== undefined) body.temperature = temperature
    if (top_p !== undefined) body.top_p = top_p
    if (max_completion_tokens !== undefined) body.max_completion_tokens = max_completion_tokens

    return body
  },
  extractClient: getClientFromRequest
}))

// Streaming chat endpoint - manual implementation (factory doesn't support streaming)
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    
    const { model, messages, temperature, top_p, max_completion_tokens } = req.body as ChatRequestBody

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      errorResponse(res, 'messages is required and must be a non-empty array', 400)
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
