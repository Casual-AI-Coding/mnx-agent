import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { validate } from '../middleware/validate.js'
import {
  voiceListSchema,
  voiceCloneSchema,
  voiceDesignSchema,
  voiceDeleteSchema,
  type VoiceListInput,
  type VoiceCloneInput,
  type VoiceDesignInput,
  type VoiceDeleteInput,
} from '@mnx/shared-types/entities'

const router = Router()

// POST /list - uses factory
router.use('/list',
  validate(voiceListSchema),
  createApiProxyRouter({
    endpoint: '/',
    clientMethod: 'voiceList',
    buildRequestBody: (req: Request) => {
      const { voice_type } = req.body as VoiceListInput
      return voice_type || 'all'
    },
    extractClient: getClientFromRequest,
  }),
)

// POST /clone - uses factory
router.use('/clone',
  validate(voiceCloneSchema),
  createApiProxyRouter({
    endpoint: '/',
    clientMethod: 'voiceClone',
    buildRequestBody: (req: Request) => {
      const { voice_id, file_id, clone_prompt, text, model, language_boost } =
        req.body as VoiceCloneInput

      const body: Record<string, unknown> = {
        file_id: Number(file_id),
        voice_id,
      }

      if (clone_prompt) {
        // 接受字符串（JSON）或对象两种形式：字符串走 JSON.parse，对象直接透传
        body.clone_prompt = typeof clone_prompt === 'string' ? JSON.parse(clone_prompt) : clone_prompt
      }
      if (text) body.text = text
      if (model) body.model = model
      if (language_boost) body.language_boost = language_boost

      return body
    },
    extractClient: getClientFromRequest,
  }),
)

// POST /design - uses factory
router.use('/design',
  validate(voiceDesignSchema),
  createApiProxyRouter({
    endpoint: '/',
    clientMethod: 'voiceDesign',
    buildRequestBody: (req: Request) => {
      const { prompt, preview_text, voice_id } = req.body as VoiceDesignInput

      const body: Record<string, unknown> = { prompt, preview_text }
      if (voice_id) body.voice_id = voice_id

      return body
    },
    extractClient: getClientFromRequest,
  }),
)

// POST /delete - uses factory
router.use('/delete',
  validate(voiceDeleteSchema),
  createApiProxyRouter({
    endpoint: '/',
    clientMethod: 'voiceDelete',
    buildRequestBody: (req: Request) => {
      const { voice_id, voice_type } = req.body as VoiceDeleteInput
      return { voice_id, voice_type }
    },
    extractClient: getClientFromRequest,
  }),
)

export default router
