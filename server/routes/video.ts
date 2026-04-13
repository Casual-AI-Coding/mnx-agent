import { Router, Request, Response } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { handleApiError } from '../middleware/errorHandler'
import { errorResponse, successResponse } from '../middleware/api-response'

const router = Router()

interface VideoGenerateBody {
  model?: string
  prompt: string
  first_frame_image?: string
  last_frame_image?: string
  subject_reference?: {
    image_id: string
    description?: string
  }
  callback_url?: string
}

// POST /generate - uses factory
router.use('/generate', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'videoGeneration',
  buildRequestBody: (req: Request) => {
    const { model, prompt, first_frame_image, last_frame_image, subject_reference, callback_url } = req.body as VideoGenerateBody

    if (!prompt) {
      throw { status: 400, message: 'prompt is required' }
    }

    const body: Record<string, unknown> = {
      model: model || 'video-01',
      prompt,
    }

    if (first_frame_image) body.first_frame_image = first_frame_image
    if (last_frame_image) body.last_frame_image = last_frame_image
    if (subject_reference) body.subject_reference = subject_reference
    if (callback_url) body.callback_url = callback_url

    return body
  },
  extractClient: getClientFromRequest
}))

// GET /status/:taskId - manual implementation (factory only supports POST)
router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { taskId } = req.params

    if (!taskId) {
      errorResponse(res, 'taskId is required', 400)
      return
    }

    const result = await client.videoGenerationStatus(taskId)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router