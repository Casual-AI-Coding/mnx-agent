import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'

const router = Router()

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
  res.json({ success: true, data: VIDEO_AGENT_TEMPLATES })
})

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { template_id, text_inputs, media_inputs, callback_url } = req.body as VideoAgentGenerateBody

    if (!template_id) {
      res.status(400).json({ success: false, error: 'template_id is required' })
      return
    }

    const body: Record<string, unknown> = { template_id }

    if (text_inputs) body.text_inputs = text_inputs
    if (media_inputs) body.media_inputs = media_inputs
    if (callback_url) body.callback_url = callback_url

    const result = await client.videoAgentGenerate(body)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { taskId } = req.params

    if (!taskId) {
      res.status(400).json({ success: false, error: 'taskId is required' })
      return
    }

    const result = await client.videoAgentStatus(taskId)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router