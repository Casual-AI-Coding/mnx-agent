import { Router, Request, Response } from 'express'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse, errorResponse } from '../middleware/api-response'

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
    const client = getClientFromRequest(req)
    
    const { model, prompt, num_images, width, height, style } = req.body as ImageGenerateBody

    if (!prompt) {
      errorResponse(res, 'prompt is required', 400)
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
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router
