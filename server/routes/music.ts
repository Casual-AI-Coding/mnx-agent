import { Router, Request, Response } from 'express'
import multer from 'multer'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { handleApiError } from '../middleware/errorHandler'
import { errorResponse, successResponse } from '../middleware/api-response'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

interface MusicGenerateBody {
  model?: string
  lyrics?: string           // 改为可选（纯音乐模式）
  style_prompt?: string
  optimize_lyrics?: boolean
  audio_setting?: {
    sample_rate?: number
    bitrate?: string        // 改为 string ('128k', etc.)
    format?: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
  seed?: number             // 新增

  // music-cover 特有
  reference_audio_url?: string
  use_original_lyrics?: boolean

  // prompt from frontend
  prompt?: string
}

// POST /generate - uses factory
router.use('/generate', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'musicGeneration',
  buildRequestBody: (req: Request) => {
    const {
      model,
      lyrics,
      style_prompt,
      optimize_lyrics,
      audio_setting,
      output_format,
      seed,
      reference_audio_url,
      use_original_lyrics,
      prompt,
    } = req.body as MusicGenerateBody

    // 纯音乐模式：lyrics 可为空，但 style_prompt 必填
    const isInstrumental = model === 'music-2.6' || model === 'music-2.5+'
    if (!lyrics && !style_prompt && !prompt) {
      throw { status: 400, message: '纯音乐模式需要填写风格描述' }
    }
    // 非纯音乐模式：lyrics 必填
    if (!isInstrumental && !lyrics) {
      throw { status: 400, message: 'lyrics is required' }
    }

    // music-cover 模式验证
    if (model === 'music-cover' && !reference_audio_url) {
      throw { status: 400, message: 'reference_audio_url is required for music-cover model' }
    }

    const body: Record<string, unknown> = {
      model: model || 'music-2.5',
      output_format: output_format || 'url',
    }

    // Handle prompt from frontend (official MiniMax parameter name)
    const promptValue = style_prompt || prompt
    if (lyrics) body.lyrics = lyrics
    if (promptValue) body.prompt = promptValue
    if (optimize_lyrics !== undefined) body.optimize_lyrics = optimize_lyrics
    if (audio_setting) body.audio_setting = audio_setting
    if (seed !== undefined) body.seed = seed
    if (reference_audio_url) body.reference_audio_url = reference_audio_url
    if (use_original_lyrics !== undefined) body.use_original_lyrics = use_original_lyrics

    return body
  },
  extractClient: getClientFromRequest
}))

// POST /preprocess - manual implementation (FormData upload)
router.post('/preprocess', upload.single('audio_file'), async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)

    if (!req.file) {
      errorResponse(res, 'audio_file is required', 400)
      return
    }

    // 文件格式验证
    const allowedFormats = ['mp3', 'wav', 'flac']
    const ext = req.file.originalname.split('.').pop()?.toLowerCase()
    if (!ext || !allowedFormats.includes(ext)) {
      errorResponse(res, `仅支持 ${allowedFormats.join('/')} 格式`, 400)
      return
    }

    // 构建 FormData
    const formData = new FormData()
    formData.append('audio_file', new Blob([new Uint8Array(req.file.buffer)]), req.file.originalname)

    const result = await client.musicPreprocess(formData) as {
      lyrics: string
      audio_url: string
      duration: number
    }

    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router