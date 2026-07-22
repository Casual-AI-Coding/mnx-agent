import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router.js'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { validate } from '../middleware/validate.js'
import { imageGenerateSchema } from '@mnx/shared-types/entities'
import type { ImageGenerateInput } from '@mnx/shared-types/entities'

const router = Router()

// POST /generate - proxy to MiniMax image_generation API
router.use('/generate', validate(imageGenerateSchema), createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'imageGeneration',
  buildRequestBody: (req: Request) => {
    // validate 中间件已经把 model（含默认值）、prompt 等字段写入 req.body
    const { model, prompt, n, num_images, prompt_optimizer, aspect_ratio, width, height, seed, style, aigc_watermark } = req.body as ImageGenerateInput

    const body: Record<string, unknown> = {
      model,
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
    if (aigc_watermark !== undefined) body.aigc_watermark = aigc_watermark

    return body
  },
  extractClient: getClientFromRequest
}))

export default router
