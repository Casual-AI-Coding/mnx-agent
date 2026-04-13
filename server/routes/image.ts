import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

interface ImageGenerateBody {
  model?: string
  prompt: string
  num_images?: number
  width?: number
  height?: number
  style?: string
}

// POST /generate - uses factory
router.use('/generate', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'imageGeneration',
  buildRequestBody: (req: Request) => {
    const { model, prompt, num_images, width, height, style } = req.body as ImageGenerateBody

    if (!prompt) {
      throw { status: 400, message: 'prompt is required' }
    }

    const body: Record<string, unknown> = {
      model: model || 'image-01',
      prompt,
    }

    if (num_images !== undefined) body.num_images = num_images
    if (width !== undefined) body.width = width
    if (height !== undefined) body.height = height
    if (style !== undefined) body.style = style

    return body
  },
  extractClient: getClientFromRequest
}))

export default router