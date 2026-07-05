import type { NextFunction, Request, Response } from 'express'
import type { RequestHandlerParams } from 'express-serve-static-core'
import { auditMiddleware } from '../middleware/audit-middleware.js'
import { authenticateJWT } from '../middleware/auth-middleware.js'
import { cronRateLimiter, mediaRateLimiter } from '../middleware/rateLimit.js'
import { updateAuditContextUserIdMiddleware } from '../services/audit-context.service.js'
import adminServiceNodesRouter from '../routes/admin/service-nodes.js'
import adminServicePermissionsRouter from '../routes/admin/service-permissions.js'
import adminWorkflowsRouter from '../routes/admin/workflows.js'
import auditRouter from '../routes/audit.js'
import authRouter from '../routes/auth.js'
import capacityRouter from '../routes/capacity.js'
import cronRouter from '../routes/cron/index.js'
import exportRouter from '../routes/export.js'
import externalApiLogsRouter from '../routes/external-api-logs.js'
import externalProxyRouter from '../routes/external-proxy.js'
import fileRouter from '../routes/files.js'
import imageRouter from '../routes/image.js'
import invitationCodesRouter from '../routes/invitation-codes.js'
import lyricsRouter from '../routes/lyrics.js'
import materialsRouter from '../routes/materials.js'
import mediaRouter from '../routes/media.js'
import musicRouter from '../routes/music.js'
import promptsRouter from '../routes/prompts.js'
import settingsRouter from '../routes/settings/index.js'
import statsRouter from '../routes/stats.js'
import systemConfigRouter from '../routes/system-config.js'
import templatesRouter from '../routes/templates.js'
import textRouter from '../routes/text.js'
import usageRouter from '../routes/usage.js'
import usersRouter from '../routes/users.js'
import videoRouter from '../routes/video.js'
import videoAgentRouter from '../routes/videoAgent.js'
import voiceRouter from '../routes/voice.js'
import voiceMgmtRouter from '../routes/voiceMgmt.js'
import workflowsRouter from '../routes/workflows.js'

export interface ApiMountTarget {
  use(path: string, ...handlers: readonly RequestHandlerParams[]): void
}

function applyApiMiddlewareChain(app: ApiMountTarget, prefix: string): void {
  app.use(prefix, auditMiddleware)
  app.use(prefix + '/auth', authRouter)
  app.use(prefix, (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/auth')) return next()
    if (req.path.match(/\/media\/[^/]+\/download$/)) return next()
    authenticateJWT(req, res, next)
  })
  app.use(prefix, updateAuditContextUserIdMiddleware)
}

export function configureApiRoutes(app: ApiMountTarget): void {
  applyApiMiddlewareChain(app, '/api')

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
}
