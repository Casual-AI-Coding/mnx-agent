import { Router } from 'express'

const router = Router()

router.get('/list', async (req, res) => {
  res.json({ message: 'File list endpoint - coming soon' })
})

router.post('/upload', async (req, res) => {
  res.json({ message: 'File upload endpoint - coming soon' })
})

router.delete('/:id', async (req, res) => {
  res.json({ message: 'File delete endpoint - coming soon' })
})

router.get('/:id/content', async (req, res) => {
  res.json({ message: 'File content endpoint - coming soon' })
})

export default router