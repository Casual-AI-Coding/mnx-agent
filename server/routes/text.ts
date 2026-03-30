import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'

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

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
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
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
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
      if (chunk.isEnd) {
        res.write(`data: ${chunk.data}\n\n`)
      } else {
        res.write(`data: ${chunk.data}\n\n`)
      }
    }

    res.end()
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

export default router
