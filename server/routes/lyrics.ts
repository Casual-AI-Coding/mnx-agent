import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

interface LyricsGenerateBody {
  prompt?: string
  model?: string
}

router.use('/generate', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'lyricsGeneration',
  buildRequestBody: (req: Request) => {
    const { prompt, model } = req.body as LyricsGenerateBody

    if (!prompt) {
      throw { status: 400, message: 'prompt is required' }
    }

    const body: Record<string, unknown> = {
      prompt,
      model: model || 'lyrics-v1',
    }

    return body
  },
  extractClient: getClientFromRequest
}))

export default router