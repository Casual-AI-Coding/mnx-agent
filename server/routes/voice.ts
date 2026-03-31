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
    const client = getClient(req)
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
    handleApiError(res, error)
  }
})

router.post('/async', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
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
    handleApiError(res, error)
  }
})

router.get('/async/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    const { taskId } = req.params

    if (!taskId) {
      res.status(400).json({ success: false, error: 'taskId is required' })
      return
    }

    const result = await client.textToAudioAsyncStatus(taskId)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router