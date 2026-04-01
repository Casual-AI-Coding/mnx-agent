import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger-middleware'
import { auditMiddleware } from './middleware/audit-middleware'
import { getLogger } from './lib/logger'
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
import mediaRouter from './routes/media'
import templatesRouter from './routes/templates'
import workflowsRouter from './routes/workflows'
import statsRouter from './routes/stats'
import exportRouter from './routes/export'
import auditRouter from './routes/audit'
import authRouter from './routes/auth.js'
import { authenticateJWT } from './middleware/auth-middleware.js'
import { getDatabase, closeDatabase } from './database/service-async.js'
import { getMiniMaxClient } from './lib/minimax'
import { TaskExecutor } from './services/task-executor'
import { CapacityChecker } from './services/capacity-checker'
import { QueueProcessor } from './services/queue-processor'
import { WorkflowEngine } from './services/workflow-engine'
import { CronScheduler } from './services/cron-scheduler'
import { initCronWebSocket } from './services/websocket-service'

config()

const logger = getLogger()

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
app.use(requestLogger)
app.use(rateLimiter)
app.use(auditMiddleware)

// Auth routes (public - no authentication required)
app.use('/api/auth', authRouter)

// JWT authentication for all other API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    return next()
  }
  authenticateJWT(req, res, next)
})

// Protected routes
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
app.use('/api/media', mediaRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/workflows', workflowsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/export', exportRouter)
app.use('/api/audit', auditRouter)

app.use(errorHandler)

async function initializeServices() {
  const dbService = await getDatabase()
  
  const minimaxClient = getMiniMaxClient()
  const taskExecutor = new TaskExecutor(minimaxClient, dbService)
  const capacityChecker = new CapacityChecker(minimaxClient, dbService)

  const queueProcessor = new QueueProcessor(dbService, taskExecutor, capacityChecker)

  const workflowEngine = new WorkflowEngine(dbService, taskExecutor, capacityChecker)
  workflowEngine.setQueueProcessor(queueProcessor)

  const cronScheduler = new CronScheduler(dbService, workflowEngine)

  await cronScheduler.init()

  return { dbService, cronScheduler }
}

const server = app.listen(PORT, () => {
  logger.info({ msg: 'MiniMax Proxy Server started', port: PORT })
})

initializeServices()
  .then(({ cronScheduler }) => {
    logger.info({ msg: 'Services initialized successfully' })
  })
  .catch((error) => {
    logger.error({ msg: 'Service initialization failed', error: (error as Error).message, stack: (error as Error).stack })
    console.error('Full error:', error)
    process.exit(1)
  })

initCronWebSocket(server)
logger.info({ msg: 'WebSocket server initialized', path: '/ws/cron' })

async function gracefulShutdown(signal: string) {
  logger.info({ msg: `${signal} received, starting graceful shutdown` })
  
  const shutdownTimeout = setTimeout(() => {
    logger.warn({ msg: 'Graceful shutdown timed out, forcing exit' })
    process.exit(1)
  }, 10000)
  
  try {
    await closeDatabase()
    clearTimeout(shutdownTimeout)
    logger.info({ msg: 'Database connection closed' })
    process.exit(0)
  } catch (error) {
    clearTimeout(shutdownTimeout)
    logger.error({ msg: 'Error during shutdown', error: (error as Error).message })
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))