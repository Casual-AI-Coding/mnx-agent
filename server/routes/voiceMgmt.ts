import { Router, Request, Response } from 'express'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

router.post('/list', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { voice_type } = req.body
    const result = await client.voiceList(voice_type || 'all')
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/clone', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)

    const { voice_id, file_id, clone_prompt, text, model, language_boost } = req.body

    if (!file_id) {
      errorResponse(res, 'file_id is required (upload file first via /api/files/upload)', 400)
      return
    }

    if (!voice_id) {
      errorResponse(res, 'voice_id is required (8-256 chars, starts with letter)', 400)
      return
    }

    const body: Record<string, unknown> = {
      file_id: Number(file_id),
      voice_id,
    }

    if (clone_prompt) {
      try {
        body.clone_prompt = typeof clone_prompt === 'string' ? JSON.parse(clone_prompt) : clone_prompt
      } catch {
        errorResponse(res, 'clone_prompt must be valid JSON string', 400)
        return
      }
    }
    if (text) body.text = text
    if (model) body.model = model
    if (language_boost) body.language_boost = language_boost

    const result = await client.voiceClone(body)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/design', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { prompt, preview_text, voice_id } = req.body

    if (!prompt || !preview_text) {
      errorResponse(res, 'prompt and preview_text are required', 400)
      return
    }

    const body: Record<string, unknown> = { prompt, preview_text }
    if (voice_id) body.voice_id = voice_id

    const result = await client.voiceDesign(body)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { voice_id, voice_type } = req.body

    if (!voice_id || !voice_type) {
      errorResponse(res, 'voice_id and voice_type are required', 400)
      return
    }

    const result = await client.voiceDelete(voice_id, voice_type)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router