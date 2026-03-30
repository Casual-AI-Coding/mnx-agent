import { Router } from 'express'

const router = Router()

router.post('/generate', async (req, res) => {
  res.json({ message: 'Video generation endpoint - coming soon' })
})

router.get('/status/:taskId', async (req, res) => {
  res.json({ message: 'Video status endpoint - coming soon' })
})

export default router