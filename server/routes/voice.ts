import { Router, Request, Response } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler'
import { errorResponse } from '../middleware/api-response'

const router = Router()

interface VoiceSyncBody {
  model?: string
  text: string
  stream?: boolean
}

interface VoiceAsyncBody {
  model?: string
  text: string
  callback_url?: string
}

// Sync voice generation
router.use('/sync', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'textToAudioSync',
  buildRequestBody: (req: Request) => {
    const { model, text, stream } = req.body as VoiceSyncBody

    if (!text) {
      throw { status: 400, message: 'text is required' }
    }

    const body: Record<string, unknown> = {
      model: model || 'speech-01',
      text,
    }

    if (stream !== undefined) body.stream = stream

    return body
  },
  extractClient: getClientFromRequest
}))

// Async voice generation
router.use('/async', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'textToAudioAsync',
  buildRequestBody: (req: Request) => {
    const { model, text, callback_url } = req.body as VoiceAsyncBody

    if (!text) {
      throw { status: 400, message: 'text is required' }
    }

    const body: Record<string, unknown> = {
      model: model || 'speech-01',
      text,
    }

    if (callback_url !== undefined) body.callback_url = callback_url

    return body
  },
  extractClient: getClientFromRequest
}))

// Query async result - GET /async/:taskId (factory only supports POST, so kept manual)
router.get('/async/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { taskId } = req.params

    if (!taskId) {
      errorResponse(res, 'taskId is required', 400)
      return
    }

    const result = await client.textToAudioAsyncStatus(taskId)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router