import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { validate } from '../middleware/validate.js'
import { lyricsGenerateSchema, type LyricsGenerateInput } from '@mnx/shared-types/entities/lyrics'

const router = Router()

// POST /generate - proxy to MiniMax lyrics_generation API
router.use('/generate', validate(lyricsGenerateSchema), createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'lyricsGeneration',
  buildRequestBody: (req: Request) => {
    const { mode, prompt, lyrics, title } = req.body as LyricsGenerateInput
    
    const body: Record<string, unknown> = {
      mode: mode || 'write_full_song'
    }
    
    if (prompt) body.prompt = prompt
    if (lyrics) body.lyrics = lyrics
    if (title) body.title = title
    
    return body
  },
  extractClient: getClientFromRequest,
  extractData: (result) => result
}))

export default router