import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimit'
import textRouter from './routes/text'
import voiceRouter from './routes/voice'
import imageRouter from './routes/image'
import musicRouter from './routes/music'
import videoRouter from './routes/video'
import videoAgentRouter from './routes/videoAgent'
import voiceMgmtRouter from './routes/voiceMgmt'
import fileRouter from './routes/files'
import usageRouter from './routes/usage'

config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(rateLimiter)

app.use('/api/text', textRouter)
app.use('/api/voice', voiceRouter)
app.use('/api/image', imageRouter)
app.use('/api/music', musicRouter)
app.use('/api/video', videoRouter)
app.use('/api/video-agent', videoAgentRouter)
app.use('/api/voice-mgmt', voiceMgmtRouter)
app.use('/api/files', fileRouter)
app.use('/api/usage', usageRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 MiniMax Proxy Server running on http://localhost:${PORT}`)
})