import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'

const router = Router()

interface VoiceSyncBody {
  model?: string
  text: string
  stream?: boolean
}

interface VoiceAsyncBody {
  model?: string
  text: string
}

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { model, text, stream } = req.body as VoiceSyncBody

    if (!text) {
      res.status(400).json({ success: false, error: 'text is required' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'speech-01',
      text,
    }

    if (stream !== undefined) body.stream = stream

    const result = await client.textToAudioSync(body)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.post('/async', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { model, text } = req.body as VoiceAsyncBody

    if (!text) {
      res.status(400).json({ success: false, error: 'text is required' })
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'speech-01',
      text,
    }

    const result = await client.textToAudioAsync(body)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

router.get('/async/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { taskId } = req.params

    if (!taskId) {
      res.status(400).json({ success: false, error: 'taskId is required' })
      return
    }

    const result = await client.textToAudioAsyncStatus(taskId)
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

export default router
