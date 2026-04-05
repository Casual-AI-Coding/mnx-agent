import { Router, Request, Response } from 'express'
import { getMiniMaxClient, createMiniMaxClientFromHeaders } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

function getClient(req: Request) {
  const apiKey = req.headers['x-api-key'] as string | undefined
  const region = req.headers['x-region'] as string | undefined
  const hasValidApiKey = apiKey && apiKey.trim().length > 0
  return hasValidApiKey ? createMiniMaxClientFromHeaders(apiKey!.trim(), region) : getMiniMaxClient()
}

interface VideoAgentGenerateBody {
  template_id: string
  text_inputs?: Array<{ value: string }>
  media_inputs?: Array<{ value: string }>
  callback_url?: string
}

const VIDEO_AGENT_TEMPLATES = [
  { id: '392747428568649728', name: '潜水', description: '水下世界探索', requires: ['media_inputs'] },
  { id: '393769180141805569', name: '逃亡', description: '宠物生存视频', requires: ['media_inputs', 'text_inputs'] },
  { id: '397087679467597833', name: '变形金刚', description: '汽车变形机器人', requires: ['media_inputs'] },
  { id: '393881433990066176', name: '吊环', description: '体操吊环动作', requires: ['media_inputs'] },
  { id: '393498001241890824', name: '举重', description: '举重动作', requires: ['media_inputs'] },
  { id: '393488336655310850', name: '攀岩', description: '运动攀岩', requires: ['media_inputs'] },
]

router.get('/templates', async (_req: Request, res: Response) => {
  successResponse(res, VIDEO_AGENT_TEMPLATES)
})

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    const { template_id, text_inputs, media_inputs, callback_url } = req.body as VideoAgentGenerateBody

    if (!template_id) {
      errorResponse(res, 'template_id is required', 400)
      return
    }

    const body: Record<string, unknown> = { template_id }

    if (text_inputs) body.text_inputs = text_inputs
    if (media_inputs) body.media_inputs = media_inputs
    if (callback_url) body.callback_url = callback_url

    const result = await client.videoAgentGenerate(body)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getClient(req)
    const { taskId } = req.params

    if (!taskId) {
      errorResponse(res, 'taskId is required', 400)
      return
    }

    const result = await client.videoAgentStatus(taskId)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router