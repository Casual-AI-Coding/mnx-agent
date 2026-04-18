import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger-middleware'
import { auditMiddleware } from './middleware/audit-middleware'
import { auditContextMiddleware } from './services/audit-context.service.js'
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
import adminServiceNodesRouter from './routes/admin/service-nodes'
import adminWorkflowsRouter from './routes/admin/workflows'
import adminServicePermissionsRouter from './routes/admin/service-permissions'
import statsRouter from './routes/stats'
import exportRouter from './routes/export'
import auditRouter from './routes/audit'
import externalApiLogsRouter from './routes/external-api-logs'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import invitationCodesRouter from './routes/invitation-codes.js'
import systemConfigRouter from './routes/system-config.js'
import settingsRouter from './routes/settings/index.js'
import { authenticateJWT } from './middleware/auth-middleware.js'
import { closeDatabase } from './database/service-async.js'
import { initCronWebSocket } from './services/websocket-service'
import { saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile } from './lib/media-storage'
import { toCSV } from './lib/csv-utils'
import { generateMediaToken, verifyMediaToken } from './lib/media-token'
import { registerServices, TOKENS, getCronSchedulerService, getDLQAutoRetryScheduler } from './service-registration.js'
import { getGlobalContainer } from './container.js'
import type { ServiceNodeRegistry } from './services/service-node-registry.js'
import type { DatabaseService } from './database/service-async.js'
import type { MiniMaxClient } from './lib/minimax.js'
import type { TaskExecutor } from './services/task-executor.js'
import type { CapacityChecker } from './services/capacity-checker.js'
import type { QueueProcessor } from './services/queue-processor.js'

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
app.use(cookieParser())
app.use(requestLogger)
app.use(rateLimiter)

// Auth routes (public - no authentication required)
app.use('/api/auth', authRouter)

// JWT authentication for all other API routes
app.use('/api', (req, res, next) => {
  // Skip auth for login/register routes
  if (req.path.startsWith('/auth')) {
    return next()
  }
  // Media downloads use signed tokens instead of JWT (see media-token.ts)
  // This allows direct browser downloads with short-lived tokens
  if (req.path.match(/\/media\/[^/]+\/download$/)) {
    return next()
  }
  authenticateJWT(req, res, next)
})

// Audit context middleware - must be after authenticateJWT to access req.user
app.use('/api', auditContextMiddleware)

// Audit middleware - must be after auditContextMiddleware
app.use('/api', auditMiddleware)

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
app.use('/api/admin/service-nodes', adminServiceNodesRouter)
app.use('/api/admin/workflows', adminWorkflowsRouter)
app.use('/api/admin/service-permissions', adminServicePermissionsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/export', exportRouter)
app.use('/api/audit', auditRouter)
app.use('/api/external-api-logs', authenticateJWT, externalApiLogsRouter)
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
  const taskExecutor = container.resolve<TaskExecutor>(TOKENS.TASK_EXECUTOR)
  const capacityChecker = container.resolve<CapacityChecker>(TOKENS.CAPACITY_CHECKER)
  const queueProcessor = container.resolve<QueueProcessor>(TOKENS.QUEUE_PROCESSOR)
  const serviceRegistry = container.resolve<ServiceNodeRegistry>(TOKENS.SERVICE_NODE_REGISTRY)
  await serviceRegistry.register({
    serviceName: 'minimaxClient',
    instance: minimaxClient,
    methods: [
      { name: 'chatCompletion', displayName: 'Text Generation', category: 'MiniMax API' },
      { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
      { name: 'videoGeneration', displayName: 'Video Generation', category: 'MiniMax API' },
      { name: 'textToAudioSync', displayName: 'Voice Sync', category: 'MiniMax API' },
      { name: 'textToAudioAsync', displayName: 'Voice Async', category: 'MiniMax API' },
      { name: 'musicGeneration', displayName: 'Music Generation', category: 'MiniMax API' },
      { name: 'textToAudioAsyncStatus', displayName: 'Voice Async Status', category: 'MiniMax API' },
      { name: 'videoGenerationStatus', displayName: 'Video Generation Status', category: 'MiniMax API' },
      { name: 'videoAgentGenerate', displayName: 'Video Agent Generate', category: 'MiniMax Video' },
      { name: 'videoAgentStatus', displayName: 'Video Agent Status', category: 'MiniMax Video' },
      { name: 'fileList', displayName: 'File List', category: 'MiniMax File' },
      { name: 'fileUpload', displayName: 'File Upload', category: 'MiniMax File' },
      { name: 'fileRetrieve', displayName: 'File Retrieve', category: 'MiniMax File' },
      { name: 'fileDelete', displayName: 'File Delete', category: 'MiniMax File' },
      { name: 'voiceList', displayName: 'Voice List', category: 'MiniMax Voice' },
      { name: 'voiceDelete', displayName: 'Voice Delete', category: 'MiniMax Voice' },
      { name: 'voiceClone', displayName: 'Voice Clone', category: 'MiniMax Voice' },
      { name: 'voiceDesign', displayName: 'Voice Design', category: 'MiniMax Voice' },
      { name: 'getBalance', displayName: 'Get Balance', category: 'MiniMax Account' },
      { name: 'getCodingPlanRemains', displayName: 'Get Coding Plan Remains', category: 'MiniMax Account' },
    ],
  })

  await serviceRegistry.register({
    serviceName: 'db',
    instance: dbService,
    methods: [
      { name: 'getPendingTasks', displayName: 'Get Pending Tasks', category: 'Database Task' },
      { name: 'createMediaRecord', displayName: 'Create Media Record', category: 'Database Media' },
      { name: 'updateTask', displayName: 'Update Task', category: 'Database Task' },
      { name: 'getTaskById', displayName: 'Get Task By ID', category: 'Database Task' },
      { name: 'getAllCronJobs', displayName: 'Get All Cron Jobs', category: 'Database Cron' },
      { name: 'getCronJobById', displayName: 'Get Cron Job By ID', category: 'Database Cron' },
      { name: 'createCronJob', displayName: 'Create Cron Job', category: 'Database Cron' },
      { name: 'updateCronJob', displayName: 'Update Cron Job', category: 'Database Cron' },
      { name: 'deleteCronJob', displayName: 'Delete Cron Job', category: 'Database Cron' },
      { name: 'toggleCronJobActive', displayName: 'Toggle Cron Job Active', category: 'Database Cron' },
      { name: 'getActiveCronJobs', displayName: 'Get Active Cron Jobs', category: 'Database Cron' },
      { name: 'getAllTasks', displayName: 'Get All Tasks', category: 'Database Task' },
      { name: 'createTask', displayName: 'Create Task', category: 'Database Task' },
      { name: 'markTaskRunning', displayName: 'Mark Task Running', category: 'Database Task' },
      { name: 'markTaskCompleted', displayName: 'Mark Task Completed', category: 'Database Task' },
      { name: 'markTaskFailed', displayName: 'Mark Task Failed', category: 'Database Task' },
      { name: 'getQueueStats', displayName: 'Get Queue Stats', category: 'Database Task' },
      { name: 'getAllExecutionLogs', displayName: 'Get All Execution Logs', category: 'Database Log' },
      { name: 'createExecutionLog', displayName: 'Create Execution Log', category: 'Database Log' },
      { name: 'updateExecutionLog', displayName: 'Update Execution Log', category: 'Database Log' },
      { name: 'getMediaRecords', displayName: 'Get Media Records', category: 'Database Media' },
      { name: 'getMediaRecordById', displayName: 'Get Media Record By ID', category: 'Database Media' },
      { name: 'updateMediaRecord', displayName: 'Update Media Record', category: 'Database Media' },
    ],
  })

  await serviceRegistry.register({
    serviceName: 'capacityChecker',
    instance: capacityChecker,
    methods: [
      { name: 'getRemainingCapacity', displayName: 'Get Remaining Capacity', category: 'Capacity' },
      { name: 'hasCapacity', displayName: 'Check Has Capacity', category: 'Capacity' },
      { name: 'getSafeExecutionLimit', displayName: 'Get Safe Execution Limit', category: 'Capacity' },
      { name: 'checkBalance', displayName: 'Check Balance', category: 'Capacity' },
      { name: 'refreshAllCapacity', displayName: 'Refresh All Capacity', category: 'Capacity' },
      { name: 'canExecuteTask', displayName: 'Can Execute Task', category: 'Capacity' },
      { name: 'waitForCapacity', displayName: 'Wait For Capacity', category: 'Capacity' },
    ],
  })

  await serviceRegistry.register({
    serviceName: 'mediaStorage',
    instance: {
      saveMediaFile,
      saveFromUrl,
      deleteMediaFile,
      readMediaFile,
    },
    methods: [
      { name: 'saveMediaFile', displayName: 'Save Media File', category: 'Media Storage' },
      { name: 'saveFromUrl', displayName: 'Save From URL', category: 'Media Storage' },
      { name: 'deleteMediaFile', displayName: 'Delete Media File', category: 'Media Storage' },
      { name: 'readMediaFile', displayName: 'Read Media File', category: 'Media Storage' },
    ],
  })

  await serviceRegistry.register({
    serviceName: 'queueProcessor',
    instance: queueProcessor,
    methods: [
      { name: 'processImageQueueWithCapacity', displayName: 'Process Image Queue', category: 'Queue Processing' },
      { name: 'processQueue', displayName: 'Process Queue', category: 'Queue Processing' },
      { name: 'getQueueStats', displayName: 'Get Queue Stats', category: 'Queue Processing' },
      { name: 'retryFailedTasks', displayName: 'Retry Failed Tasks', category: 'Queue Processing' },
    ],
  })

  await serviceRegistry.register({
    serviceName: 'utils',
    instance: {
      toCSV,
      generateMediaToken,
      verifyMediaToken,
    },
    methods: [
      { name: 'toCSV', displayName: 'Convert to CSV', category: 'Utils' },
      { name: 'generateMediaToken', displayName: 'Generate Media Token', category: 'Utils' },
      { name: 'verifyMediaToken', displayName: 'Verify Media Token', category: 'Utils' },
    ],
  })

  const cronScheduler = getCronSchedulerService()
  await cronScheduler.init()

  const dlqScheduler = getDLQAutoRetryScheduler()
  dlqScheduler.start()
  
  logger.info({ msg: 'Services initialized successfully via DI Container' })
}

const server = app.listen(PORT, () => {
  logger.info({ msg: 'MiniMax Proxy Server started', port: PORT })
})

initializeServices().catch((error) => {
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