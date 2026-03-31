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
import capacityRouter from './routes/capacity'
import cronRouter from './routes/cron'
import { getDatabase, runMigrations } from './database'
import { getMiniMaxClient } from './lib/minimax'
import { TaskExecutor } from './services/task-executor'
import { CapacityChecker } from './services/capacity-checker'
import { QueueProcessor } from './services/queue-processor'
import { WorkflowEngine } from './services/workflow-engine'
import { CronScheduler } from './services/cron-scheduler'

config()

const app = express()
const PORT = process.env.PORT || 4511

app.set('trust proxy', 1)

app.use(cors({
  origin: [
    'http://localhost:4411',
    'http://localhost:5173',
    'https://mnx.ogslp.top',
  ],
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
app.use('/api/capacity', capacityRouter)
app.use('/api/cron', cronRouter)

app.use(errorHandler)

// Initialize services with dependency injection
try {
  const dbService = getDatabase()
  console.log('📦 Database initialized')
  runMigrations(dbService.getDatabase())
  console.log('📦 Database migrations applied')

  // Core services
  const minimaxClient = getMiniMaxClient()
  const taskExecutor = new TaskExecutor(minimaxClient, dbService)
  const capacityChecker = new CapacityChecker(minimaxClient, dbService)

  // Queue processor (capacity-aware execution)
  const queueProcessor = new QueueProcessor(dbService, taskExecutor, capacityChecker)

  // Workflow engine
  const workflowEngine = new WorkflowEngine(dbService, taskExecutor, capacityChecker)
  workflowEngine.setQueueProcessor(queueProcessor)

  // Cron scheduler (depends on workflow engine)
  const cronScheduler = new CronScheduler(dbService, workflowEngine)

  // Initialize scheduler (load jobs from DB and start cron tasks)
  cronScheduler.init().then(() => {
    console.log('⏰ Cron scheduler initialized')
  }).catch((error) => {
    console.warn('⚠️  Cron scheduler initialization failed:', (error as Error).message)
  })

  console.log('🔧 All cron services wired up successfully')
} catch (error) {
  console.warn('⚠️  Service initialization failed:', (error as Error).message)
}

app.listen(PORT, () => {
  console.log(`🚀 MiniMax Proxy Server running on http://localhost:${PORT}`)
})