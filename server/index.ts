import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter, mediaRateLimiter, cronRateLimiter } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger-middleware'
import { auditMiddleware } from './middleware/audit-middleware'
import { auditContextMiddleware, updateAuditContextUserIdMiddleware } from './services/audit-context.service.js'
import { getLogger } from './lib/logger'
import { getConfig } from './config/index.js'
import textRouter from './routes/text'
import voiceRouter from './routes/voice'
import imageRouter from './routes/image'
import musicRouter from './routes/music'
import lyricsRouter from './routes/lyrics'
import videoRouter from './routes/video'
import videoAgentRouter from './routes/videoAgent'
import voiceMgmtRouter from './routes/voiceMgmt'
import fileRouter from './routes/files'
import usageRouter from './routes/usage'
import capacityRouter from './routes/capacity'
import cronRouter from './routes/cron'
import mediaRouter from './routes/media'
import materialsRouter from './routes/materials.js'
import promptsRouter from './routes/prompts.js'
import templatesRouter from './routes/templates'
import workflowsRouter from './routes/workflows'
import adminServiceNodesRouter from './routes/admin/service-nodes'
import adminWorkflowsRouter from './routes/admin/workflows'
import adminServicePermissionsRouter from './routes/admin/service-permissions'
import statsRouter from './routes/stats'
import exportRouter from './routes/export'
import auditRouter from './routes/audit'
import externalApiLogsRouter from './routes/external-api-logs'
import externalProxyRouter from './routes/external-proxy'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import invitationCodesRouter from './routes/invitation-codes.js'
import systemConfigRouter from './routes/system-config.js'
import settingsRouter from './routes/settings/index.js'
import { authenticateJWT } from './middleware/auth-middleware.js'
import { closeDatabase } from './database/service-async.js'
import { initCronWebSocket, closeCronWebSocket } from './services/websocket-service'
import { saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile } from './lib/media-storage'
import { toCSV } from './lib/csv-utils'
import { generateMediaToken, verifyMediaToken } from './lib/media-token'
import { registerServices, TOKENS, getCronSchedulerService, getDLQAutoRetryScheduler } from './service-registration.js'
import { getGlobalContainer } from './container.js'
import { registerServiceNodeCatalog } from './services/service-node-catalog.js'
import type { ServiceNodeRegistry } from './services/service-node-registry.js'
import type { DatabaseService } from './database/service-async.js'
import type { MiniMaxClient } from './lib/minimax/index.js'
import type { CapacityChecker } from './services/capacity-checker.js'
import type { QueueProcessor } from './services/queue-processor.js'

config()
config({ path: '.env.local', override: true })

const logger = getLogger()

const app = express()
const PORT = process.env.PORT || 4511

app.set('trust proxy', 1)

app.use(cors({
  origin: getConfig().server.corsOrigins,
  credentials: true,
}))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:*'],
      mediaSrc: ["'self'", 'blob:'],
      fontSrc: ["'self'"],
    },
    reportOnly: process.env.NODE_ENV === 'development',
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' },
  xContentTypeOptions: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())
app.use(auditContextMiddleware)
app.use(requestLogger)
app.use(rateLimiter)

// API middleware chain shared between /api and /api/v1
function applyApiMiddlewareChain(prefix: string) {
  app.use(prefix, auditMiddleware)
  app.use(prefix + '/auth', authRouter)
  app.use(prefix, (req, res, next) => {
    if (req.path.startsWith('/auth')) return next()
    if (req.path.match(/\/media\/[^/]+\/download$/)) return next()
    authenticateJWT(req, res, next)
  })
  app.use(prefix, updateAuditContextUserIdMiddleware)
}

applyApiMiddlewareChain('/api')

app.use('/api/media', mediaRateLimiter)
app.use('/api/files', mediaRateLimiter)
app.use('/api/cron', cronRateLimiter)

app.use('/api/text', textRouter)
app.use('/api/voice', voiceRouter)
app.use('/api/image', imageRouter)
app.use('/api/music', musicRouter)
app.use('/api/lyrics', lyricsRouter)
app.use('/api/video', videoRouter)
app.use('/api/video-agent', videoAgentRouter)
app.use('/api/voice-mgmt', voiceMgmtRouter)
app.use('/api/files', fileRouter)
app.use('/api/usage', usageRouter)
app.use('/api/capacity', capacityRouter)
app.use('/api/cron', cronRouter)
app.use('/api/media', mediaRouter)
app.use('/api/materials', materialsRouter)
app.use('/api/prompts', promptsRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/workflows', workflowsRouter)
app.use('/api/admin/service-nodes', adminServiceNodesRouter)
app.use('/api/admin/workflows', adminWorkflowsRouter)
app.use('/api/admin/service-permissions', adminServicePermissionsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/export', exportRouter)
app.use('/api/audit', auditRouter)
app.use('/api/external-api-logs', authenticateJWT, externalApiLogsRouter)
app.use('/api/external-proxy', authenticateJWT, externalProxyRouter)
app.use('/api/users', authenticateJWT, usersRouter)
app.use('/api/invitation-codes', authenticateJWT, invitationCodesRouter)
app.use('/api/system-config', authenticateJWT, systemConfigRouter)
app.use('/api/settings', settingsRouter)

app.use(errorHandler)

async function initializeServices() {
  await registerServices()
  
  const container = getGlobalContainer()
  const dbService = container.resolve<DatabaseService>(TOKENS.DATABASE)
  const minimaxClient = container.resolve<MiniMaxClient>(TOKENS.MINIMAX_CLIENT)
  const capacityChecker = container.resolve<CapacityChecker>(TOKENS.CAPACITY_CHECKER)
  const queueProcessor = container.resolve<QueueProcessor>(TOKENS.QUEUE_PROCESSOR)
  const serviceRegistry = container.resolve<ServiceNodeRegistry>(TOKENS.SERVICE_NODE_REGISTRY)
  await registerServiceNodeCatalog(serviceRegistry, {
    minimaxClient,
    dbService,
    capacityChecker,
    queueProcessor,
    mediaStorage: {
      saveMediaFile,
      saveFromUrl,
      deleteMediaFile,
      readMediaFile,
    },
    utils: {
      toCSV,
      generateMediaToken,
      verifyMediaToken,
    },
  })

  const cronScheduler = getCronSchedulerService()
  await cronScheduler.init()

  const dlqScheduler = getDLQAutoRetryScheduler()
  dlqScheduler.start()
  
  logger.info({ msg: 'Services initialized successfully via DI Container' })
}

// Start server after services are initialized (fixes audit log issue)
async function startServer() {
  try {
    await initializeServices()
    
    const server = app.listen(PORT, () => {
      logger.info({ msg: 'MiniMax Proxy Server started', port: PORT })
    })
    
    initCronWebSocket(server)
    logger.info({ msg: 'WebSocket server initialized', path: '/ws/cron' })
    
    // Setup graceful shutdown with proper server cleanup
    const gracefulShutdown = async (signal: string) => {
      logger.info({ msg: `${signal} received, starting graceful shutdown` })
      
      const shutdownTimeout = setTimeout(() => {
        logger.warn({ msg: 'Graceful shutdown timed out, forcing exit' })
        process.exit(1)
      }, 10000)
      
      try {
        // Close HTTP server first (stops accepting new connections)
        await new Promise<void>((resolve) => {
          server.close(() => {
            logger.info({ msg: 'HTTP server closed' })
            resolve()
          })
        })
        
        // Stop DLQ auto-retry scheduler
        getDLQAutoRetryScheduler().stop()
        logger.info({ msg: 'DLQ auto-retry scheduler stopped' })

        // Close WebSocket server
        closeCronWebSocket()
        logger.info({ msg: 'WebSocket server closed' })
        
        // Close database connection
        await closeDatabase()
        logger.info({ msg: 'Database connection closed' })
        
        clearTimeout(shutdownTimeout)
        process.exit(0)
      } catch (error) {
        clearTimeout(shutdownTimeout)
        logger.error({ msg: 'Error during shutdown', error: (error as Error).message })
        process.exit(1)
      }
    }
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    logger.fatal({ msg: 'Service initialization failed', error: (error as Error).message, stack: (error as Error).stack })
    process.exit(1)
  }
}

startServer()
