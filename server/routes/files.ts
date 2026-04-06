import { Router, Request, Response } from 'express'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse, errorResponse } from '../middleware/api-response'
import multer from 'multer'

const router = Router()

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
})

router.get('/list', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { purpose } = req.query
    const result = await client.fileList(purpose as string)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    
    if (!req.file) {
      errorResponse(res, 'file is required', 400)
      return
    }

    const { purpose } = req.body
    if (!purpose) {
      errorResponse(res, 'purpose is required (voice_clone, prompt_audio, t2a_async_input)', 400)
      return
    }

    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array(req.file.buffer)]), req.file.originalname)
    formData.append('purpose', purpose)

    const result = await client.fileUpload(formData)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.get('/retrieve', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { file_id } = req.query

    if (!file_id) {
      errorResponse(res, 'file_id is required', 400)
      return
    }

    const result = await client.fileRetrieve(Number(file_id))
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const { file_id, purpose } = req.body

    if (!file_id || !purpose) {
      errorResponse(res, 'file_id and purpose are required', 400)
      return
    }

    const result = await client.fileDelete(Number(file_id), purpose)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router