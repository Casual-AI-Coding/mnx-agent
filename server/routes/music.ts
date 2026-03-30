import { Router } from 'express'

const router = Router()

router.post('/generate', async (req, res) => {
  res.json({ message: 'Music generation endpoint - coming soon' })
})

export default router