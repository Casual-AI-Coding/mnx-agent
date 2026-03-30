import { Router } from 'express'

const router = Router()

router.post('/generate', async (req, res) => {
  res.json({ message: 'Image generation endpoint - coming soon' })
})

export default router