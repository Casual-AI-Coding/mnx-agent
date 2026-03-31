import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'
import multer from 'multer'

const router = Router()

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
})

router.get('/list', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { purpose } = req.query
    const result = await client.fileList(purpose as string)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    
    if (!req.file) {
      res.status(400).json({ success: false, error: 'file is required' })
      return
    }

    const { purpose } = req.body
    if (!purpose) {
      res.status(400).json({ success: false, error: 'purpose is required (voice_clone, prompt_audio, t2a_async_input)' })
      return
    }

    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array(req.file.buffer)]), req.file.originalname)
    formData.append('purpose', purpose)

    const result = await client.fileUpload(formData)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

router.get('/retrieve', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { file_id } = req.query

    if (!file_id) {
      res.status(400).json({ success: false, error: 'file_id is required' })
      return
    }

    const result = await client.fileRetrieve(Number(file_id))
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const { file_id, purpose } = req.body

    if (!file_id || !purpose) {
      res.status(400).json({ success: false, error: 'file_id and purpose are required' })
      return
    }

    const result = await client.fileDelete(Number(file_id), purpose)
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router