import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

interface VoiceListBody {
  voice_type?: string
}

interface VoiceCloneBody {
  voice_id: string
  file_id: number | string
  clone_prompt?: string | object
  text?: string
  model?: string
  language_boost?: string
}

interface VoiceDesignBody {
  prompt: string
  preview_text: string
  voice_id?: string
}

interface VoiceDeleteBody {
  voice_id: string
  voice_type: string
}

// POST /list - uses factory
router.use('/list', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'voiceList',
  buildRequestBody: (req: Request) => {
    const { voice_type } = req.body as VoiceListBody
    return voice_type || 'all'
  },
  extractClient: getClientFromRequest
}))

// POST /clone - uses factory
router.use('/clone', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'voiceClone',
  buildRequestBody: (req: Request) => {
    const { voice_id, file_id, clone_prompt, text, model, language_boost } = req.body as VoiceCloneBody

    if (!file_id) {
      throw { status: 400, message: 'file_id is required (upload file first via /api/files/upload)' }
    }

    if (!voice_id) {
      throw { status: 400, message: 'voice_id is required (8-256 chars, starts with letter)' }
    }

    const body: Record<string, unknown> = {
      file_id: Number(file_id),
      voice_id,
    }

    if (clone_prompt) {
      try {
        body.clone_prompt = typeof clone_prompt === 'string' ? JSON.parse(clone_prompt) : clone_prompt
      } catch {
        throw { status: 400, message: 'clone_prompt must be valid JSON string' }
      }
    }
    if (text) body.text = text
    if (model) body.model = model
    if (language_boost) body.language_boost = language_boost

    return body
  },
  extractClient: getClientFromRequest
}))

// POST /design - uses factory
router.use('/design', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'voiceDesign',
  buildRequestBody: (req: Request) => {
    const { prompt, preview_text, voice_id } = req.body as VoiceDesignBody

    if (!prompt || !preview_text) {
      throw { status: 400, message: 'prompt and preview_text are required' }
    }

    const body: Record<string, unknown> = { prompt, preview_text }
    if (voice_id) body.voice_id = voice_id

    return body
  },
  extractClient: getClientFromRequest
}))

// POST /delete - uses factory
router.use('/delete', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'voiceDelete',
  buildRequestBody: (req: Request) => {
    const { voice_id, voice_type } = req.body as VoiceDeleteBody

    if (!voice_id || !voice_type) {
      throw { status: 400, message: 'voice_id and voice_type are required' }
    }

    return { voice_id, voice_type }
  },
  extractClient: getClientFromRequest
}))

export default router