import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createApiProxyRouter } from '../utils/api-proxy-router.js'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler.js'
import { errorResponse } from '../middleware/api-response.js'
import { validate } from '../middleware/validate.js'
import { voiceSyncSchema, voiceAsyncSchema } from '@mnx/shared-types/entities'
import type { VoiceSyncInput, VoiceAsyncInput } from '@mnx/shared-types/entities'

const router = Router()

// Sync voice generation
router.use('/sync', validate(voiceSyncSchema), createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'textToAudioSync',
  buildRequestBody: (req: Request) => {
    // validate 中间件已经把 model（含默认值）、text、stream 写入 req.body
    const { model, text, stream } = req.body as VoiceSyncInput

    const body: Record<string, unknown> = {
      model,
      text,
    }

    if (stream !== undefined) body.stream = stream

    return body
  },
  extractClient: getClientFromRequest
}))

// Async voice generation
router.use('/async', validate(voiceAsyncSchema), createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'textToAudioAsync',
  buildRequestBody: (req: Request) => {
    const { model, text, callback_url } = req.body as VoiceAsyncInput

    const body: Record<string, unknown> = {
      model,
      text,
    }

    if (callback_url !== undefined) body.callback_url = callback_url

    return body
  },
  extractClient: getClientFromRequest
}))

// Query async result - GET /async/:taskId (factory only supports POST, so kept manual)
router.get('/async/:taskId', asyncHandler(async (req: Request, res: Response) => {
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
    handleApiError(req, res, error)
  }
}))

export default router
