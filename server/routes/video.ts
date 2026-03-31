import { Router, Request, Response } from 'express'
import { getMiniMaxClient, createMiniMaxClientFromHeaders } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'

const router = Router()

function getClient(req: Request) {
  const apiKey = req.headers['x-api-key'] as string | undefined
  const region = req.headers['x-region'] as string | undefined
  const hasValidApiKey = apiKey && apiKey.trim().length > 0
  return hasValidApiKey ? createMiniMaxClientFromHeaders(apiKey!.trim(), region) : getMiniMaxClient()
}

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

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    const { model, prompt, first_frame_image, last_frame_image, subject_reference, callback_url } = req.body as VideoGenerateBody

    if (!prompt) {
      res.status(400).json({ success: false, error: 'prompt is required' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'video-01',
      prompt,
    }

    if (first_frame_image) body.first_frame_image = first_frame_image
    if (last_frame_image) body.last_frame_image = last_frame_image
    if (subject_reference) body.subject_reference = subject_reference
    if (callback_url) body.callback_url = callback_url

    const result = await client.videoGeneration(body)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    const { taskId } = req.params

    if (!taskId) {
      res.status(400).json({ success: false, error: 'taskId is required' })
      return
    }

    const result = await client.videoGenerationStatus(taskId)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router