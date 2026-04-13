import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

interface ImageGenerateBody {
  model?: string
  prompt: string
  n?: number
  num_images?: number  // 兼容旧参数
  prompt_optimizer?: boolean
  aspect_ratio?: string
  width?: number
  height?: number
  seed?: number
  style?: string
}

// POST /generate - uses factory
router.use('/generate', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'imageGeneration',
  buildRequestBody: (req: Request) => {
    const { model, prompt, n, num_images, prompt_optimizer, aspect_ratio, width, height, seed, style } = req.body as ImageGenerateBody

    if (!prompt) {
      throw { status: 400, message: 'prompt is required' }
    }

    const body: Record<string, unknown> = {
      model: model || 'image-01',
      prompt,
    }

    if (n !== undefined) body.n = n
    if (num_images !== undefined) body.num_images = num_images
    if (prompt_optimizer !== undefined) body.prompt_optimizer = prompt_optimizer
    if (aspect_ratio !== undefined) body.aspect_ratio = aspect_ratio
    if (width !== undefined) body.width = width
    if (height !== undefined) body.height = height
    if (seed !== undefined) body.seed = seed
    if (style !== undefined) body.style = style

    return body
  },
  extractClient: getClientFromRequest
}))

export default router