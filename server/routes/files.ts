import { Router, Request, Response } from 'express'
import multer from 'multer'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'
import { handleApiError } from '../middleware/errorHandler'
import { errorResponse, successResponse } from '../middleware/api-response'

const router = Router()

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
})

interface FileDeleteBody {
  file_id: number | string
  purpose: string
}

// GET /list - manual implementation (factory only supports POST)
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

// POST /upload - manual implementation (FormData upload)
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

// GET /retrieve - manual implementation (factory only supports POST)
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

// POST /delete - uses factory
router.use('/delete', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'fileDelete',
  buildRequestBody: (req: Request) => {
    const { file_id, purpose } = req.body as FileDeleteBody

    if (!file_id || !purpose) {
      throw { status: 400, message: 'file_id and purpose are required' }
    }

    return { file_id: Number(file_id), purpose }
  },
  extractClient: getClientFromRequest
}))

export default router