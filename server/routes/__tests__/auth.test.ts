import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  login: vi.fn(),
}))

vi.mock('../../database/connection.js', () => ({
  getConnection: mocks.getConnection,
}))

vi.mock('../../middleware/rateLimit.js', () => ({
  authRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../../middleware/validate.js', () => ({
  validate: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../../middleware/auth-middleware.js', () => ({
  authenticateJWT: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../../services/user-service.js', () => ({
  UserService: class MockUserService {
    login = mocks.login
    register = vi.fn()
    getUserById = vi.fn()
    changePassword = vi.fn()
    updateUser = vi.fn()
    generateAccessToken = vi.fn()
    generateRefreshToken = vi.fn()
  },
}))

import authRouter from '../auth.js'

describe('Auth API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getConnection.mockReturnValue({})

    app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
  })

  describe('POST /api/auth/login', () => {
    it('should return 401 when login succeeds without user payload', async () => {
      mocks.login.mockResolvedValue({
        success: true,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'tester', password: 'secret' })

      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        success: false,
        error: 'Login failed',
      })
    })
  })
})
