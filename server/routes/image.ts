import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'

const router = Router()

interface ImageGenerateBody {
  model?: string
  prompt: string
  num_images?: number
  width?: number
  height?: number
  style?: string
}

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { model, prompt, num_images, width, height, style } = req.body as ImageGenerateBody

    if (!prompt) {
      res.status(400).json({ success: false, error: 'prompt is required' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'image-01',
      prompt,
    }

    if (num_images !== undefined) body.num_images = num_images
    if (width !== undefined) body.width = width
    if (height !== undefined) body.height = height
    if (style !== undefined) body.style = style

    const result = await client.imageGeneration(body)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router
