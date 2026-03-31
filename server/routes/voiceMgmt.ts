import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'

const router = Router()

router.post('/list', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { voice_type } = req.body
    const result = await client.voiceList(voice_type || 'all')
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.post('/clone', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()

    const { voice_id, file_id, clone_prompt, text, model, language_boost } = req.body

    if (!file_id) {
      res.status(400).json({ success: false, error: 'file_id is required (upload file first via /api/files/upload)' })
      return
    }

    if (!voice_id) {
      res.status(400).json({ success: false, error: 'voice_id is required (8-256 chars, starts with letter)' })
      return
    }

    const body: Record<string, unknown> = {
      file_id: Number(file_id),
      voice_id,
    }

    if (clone_prompt) body.clone_prompt = typeof clone_prompt === 'string' ? JSON.parse(clone_prompt) : clone_prompt
    if (text) body.text = text
    if (model) body.model = model
    if (language_boost) body.language_boost = language_boost

    const result = await client.voiceClone(body)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.post('/design', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { prompt, preview_text, voice_id } = req.body

    if (!prompt || !preview_text) {
      res.status(400).json({ success: false, error: 'prompt and preview_text are required' })
      return
    }

    const body: Record<string, unknown> = { prompt, preview_text }
    if (voice_id) body.voice_id = voice_id

    const result = await client.voiceDesign(body)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { voice_id, voice_type } = req.body

    if (!voice_id || !voice_type) {
      res.status(400).json({ success: false, error: 'voice_id and voice_type are required' })
      return
    }

    const result = await client.voiceDelete(voice_id, voice_type)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

export default router