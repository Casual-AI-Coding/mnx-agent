import { Router } from 'express'

const router = Router()

router.get('/list', async (_req, res) => {
  res.json({ message: 'Voice list endpoint - coming soon' })
})

router.post('/clone', async (_req, res) => {
  res.json({ message: 'Voice clone endpoint - coming soon' })
})

router.post('/design', async (_req, res) => {
  res.json({ message: 'Voice design endpoint - coming soon' })
})

export default router