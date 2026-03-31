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

interface MusicGenerateBody {
  model?: string
  lyrics: string
  style_prompt?: string
  optimize_lyrics?: boolean
  audio_setting?: {
    sample_rate?: number
    bitrate?: number
    format?: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
}

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    const { model, lyrics, style_prompt, optimize_lyrics, audio_setting, output_format } = req.body as MusicGenerateBody

    if (!lyrics) {
      res.status(400).json({ success: false, error: 'lyrics is required' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'music-2.5',
      lyrics,
      output_format: output_format || 'url',
    }

    if (style_prompt) body.style_prompt = style_prompt
    if (optimize_lyrics !== undefined) body.optimize_lyrics = optimize_lyrics
    if (audio_setting) body.audio_setting = audio_setting

    const result = await client.musicGeneration(body)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router