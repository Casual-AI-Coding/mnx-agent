import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'

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

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
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
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { taskId } = req.params

    if (!taskId) {
      res.status(400).json({ success: false, error: 'taskId is required' })
      return
    }

    const result = await client.videoGenerationStatus(taskId)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

export default router