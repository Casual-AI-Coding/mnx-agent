import { Router, Request, Response } from 'express'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

interface VoiceSyncBody {
  model?: string
  text: string
  stream?: boolean
}

interface VoiceAsyncBody {
  model?: string
  text: string
}

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { model, text, stream } = req.body as VoiceSyncBody

    if (!text) {
      errorResponse(res, 'text is required', 400)
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'speech-01',
      text,
    }

    if (stream !== undefined) body.stream = stream

    const result = await client.textToAudioSync(body)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/async', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { model, text } = req.body as VoiceAsyncBody

    if (!text) {
      errorResponse(res, 'text is required', 400)
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'speech-01',
      text,
    }

    const result = await client.textToAudioAsync(body)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.get('/async/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { taskId } = req.params

    if (!taskId) {
      errorResponse(res, 'taskId is required', 400)
      return
    }

    const result = await client.textToAudioAsyncStatus(taskId)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router