import { Router } from 'express'

const router = Router()

router.post('/chat', async (req, res) => {
  res.json({ message: 'Text generation endpoint - coming soon' })
})

router.post('/chat/stream', async (req, res) => {
  res.json({ message: 'Text streaming endpoint - coming soon' })
})

export default router