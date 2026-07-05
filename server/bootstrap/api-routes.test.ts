import { describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { configureApiRoutes } from './api-routes.js'
import type { ApiMountTarget } from './api-routes.js'
import type { NextFunction, Request, Response } from 'express'
import type { RequestHandlerParams } from 'express-serve-static-core'

const mockedHandlers = vi.hoisted(() => {
  const passThrough = (_req: Request, _res: Response, next: NextFunction): void => next()
  const unauthorized = (_req: Request, res: Response): void => {
    res.status(401).json({ success: false, error: 'Access token required in Authorization header (Bearer scheme)' })
  }
  const routeHandler = (_req: Request, res: Response): void => {
    res.status(204).end()
  }

  return { passThrough, routeHandler, unauthorized }
})

vi.mock('../middleware/audit-middleware.js', () => ({ auditMiddleware: vi.fn(mockedHandlers.passThrough) }))
vi.mock('../middleware/auth-middleware.js', () => ({
  authenticateJWT: vi.fn(mockedHandlers.unauthorized),
}))
vi.mock('../middleware/rateLimit.js', () => ({
  cronRateLimiter: vi.fn(mockedHandlers.passThrough),
  mediaRateLimiter: vi.fn(mockedHandlers.passThrough),
}))
vi.mock('../services/audit-context.service.js', () => ({
  updateAuditContextUserIdMiddleware: vi.fn(mockedHandlers.passThrough),
}))
vi.mock('../routes/admin/service-nodes.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/admin/service-permissions.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/admin/workflows.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/audit.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/auth.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/capacity.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/cron/index.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/export.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/external-api-logs.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/external-proxy.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/files.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/image.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/invitation-codes.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/lyrics.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/materials.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/media.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/music.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/prompts.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/settings/index.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/stats.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/system-config.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/templates.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/text.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/usage.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/users.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/video.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/videoAgent.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/voice.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/voiceMgmt.js', () => ({ default: mockedHandlers.routeHandler }))
vi.mock('../routes/workflows.js', () => ({ default: mockedHandlers.routeHandler }))

type MountedRoute = {
  readonly path: string
  readonly handlers: readonly RequestHandlerParams[]
}

function createMountRecorder(): { readonly app: ApiMountTarget; readonly routes: readonly MountedRoute[] } {
  const routes: MountedRoute[] = []

  return {
    app: {
      use: (path: string, ...handlers: readonly RequestHandlerParams[]) => {
        routes.push({ path, handlers })
      },
    },
    routes,
  }
}

function createExpressApp(): express.Express {
  const app = express()
  configureApiRoutes(app)
  return app
}

describe('configureApiRoutes', () => {
  it('mounts the shared API middleware chain before protected routes', () => {
    const { app, routes } = createMountRecorder()

    configureApiRoutes(app)

    expect(routes.slice(0, 4).map(route => route.path)).toEqual([
      '/api',
      '/api/auth',
      '/api',
      '/api',
    ])
    expect(routes[0].handlers).toHaveLength(1)
    expect(routes[1].handlers).toHaveLength(1)
    expect(routes[2].handlers).toHaveLength(1)
    expect(routes[3].handlers).toHaveLength(1)
  })

  it('allows auth and media download paths to skip the JWT guard', async () => {
    await request(createExpressApp()).get('/api/auth/login').expect(204)
    await request(createExpressApp()).get('/api/media/media-1/download').expect(204)
    await request(createExpressApp()).get('/api/templates').expect(401)
  })

  it('mounts rate limiters before feature routers with stable public paths', () => {
    const { app, routes } = createMountRecorder()

    configureApiRoutes(app)

    const mountedPaths = routes.map(route => route.path)

    expect(mountedPaths.slice(4, 7)).toEqual(['/api/media', '/api/files', '/api/cron'])
    expect(mountedPaths).toEqual([
      '/api',
      '/api/auth',
      '/api',
      '/api',
      '/api/media',
      '/api/files',
      '/api/cron',
      '/api/text',
      '/api/voice',
      '/api/image',
      '/api/music',
      '/api/lyrics',
      '/api/video',
      '/api/video-agent',
      '/api/voice-mgmt',
      '/api/files',
      '/api/usage',
      '/api/capacity',
      '/api/cron',
      '/api/media',
      '/api/materials',
      '/api/prompts',
      '/api/templates',
      '/api/workflows',
      '/api/admin/service-nodes',
      '/api/admin/workflows',
      '/api/admin/service-permissions',
      '/api/stats',
      '/api/export',
      '/api/audit',
      '/api/external-api-logs',
      '/api/external-proxy',
      '/api/users',
      '/api/invitation-codes',
      '/api/system-config',
      '/api/settings',
    ])
  })
})
