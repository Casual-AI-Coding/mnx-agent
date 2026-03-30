import { Router } from 'express'

const router = Router()

router.post('/generate', async (_req, res) => {
  res.json({ message: 'Video agent endpoint - coming soon' })
})

router.get('/templates', async (_req, res) => {
  res.json({ message: 'Video templates endpoint - coming soon' })
})

export default router