import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger-middleware'
import { auditContextMiddleware } from './services/audit-context.service.js'
import { getLogger } from './lib/logger'
import { getConfig } from './config/index.js'
import { closeDatabase } from './database/service-async.js'
import { initCronWebSocket, closeCronWebSocket } from './services/websocket-service'
import { saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile } from './lib/media-storage'
import { toCSV } from './lib/csv-utils'
import { generateMediaToken, verifyMediaToken } from './lib/media-token'
import { registerServices, TOKENS, getCronSchedulerService, getDLQAutoRetryScheduler } from './service-registration.js'
import { getGlobalContainer } from './container.js'
import { resolve } from './container.types.js'
import { configureApiRoutes } from './bootstrap/api-routes.js'
import { createDatabaseServiceNodes, registerServiceNodeCatalog } from './services/service-node-catalog.js'

config()
config({ path: '.env.local', override: true })

const appConfig = getConfig()
const logger = getLogger()

const app = express()
const PORT = appConfig.server.port

app.set('trust proxy', 1)

app.use(cors({
  origin: appConfig.server.corsOrigins,
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
    reportOnly: appConfig.server.nodeEnv === 'development',
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

configureApiRoutes(app)

app.use(errorHandler)

async function initializeServices() {
  await registerServices()
  
  const container = getGlobalContainer()
  const minimaxClient = resolve(container, TOKENS.MINIMAX_CLIENT)
  const capacityChecker = resolve(container, TOKENS.CAPACITY_CHECKER)
  const queueProcessor = resolve(container, TOKENS.QUEUE_PROCESSOR)
  const serviceRegistry = resolve(container, TOKENS.SERVICE_NODE_REGISTRY)
  const dbService = createDatabaseServiceNodes({
    jobService: resolve(container, TOKENS.JOB_SERVICE),
    taskService: resolve(container, TOKENS.TASK_SERVICE),
    logService: resolve(container, TOKENS.LOG_SERVICE),
    mediaService: resolve(container, TOKENS.MEDIA_SERVICE),
  })
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
