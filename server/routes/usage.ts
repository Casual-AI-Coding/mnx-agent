import { Router } from 'express'

const router = Router()

router.get('/', async (req, res) => {
  res.json({ 
    message: 'Token usage endpoint - coming soon',
    usage: {
      textTokens: 0,
      voiceCharacters: 0,
      imageRequests: 0,
      musicRequests: 0,
      videoRequests: 0,
    }
  })
})

export default router