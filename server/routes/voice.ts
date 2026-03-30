import { Router } from 'express'

const router = Router()

router.post('/sync', async (req, res) => {
  res.json({ message: 'Voice sync endpoint - coming soon' })
})

router.post('/async', async (req, res) => {
  res.json({ message: 'Voice async endpoint - coming soon' })
})

router.get('/async/:taskId', async (req, res) => {
  res.json({ message: 'Voice async status endpoint - coming soon' })
})

export default router