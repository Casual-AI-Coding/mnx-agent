import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
}))

vi.mock('../../database/connection.js', () => ({
  getConnection: mocks.getConnection,
}))

vi.mock('../../middleware/auth-middleware.js', () => ({
  requireRole: () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: 'super-user',
      username: 'super-admin',
      role: 'super',
    }
    next()
  },
}))

vi.mock('../../service-registration.js', () => ({
  getAdminUserService: () => ({
    listUsers: mocks.listUsers,
    updateUser: mocks.updateUser,
  }),
  getUserService: () => ({
    getUserById: mocks.getUserById,
  }),
}))

import usersRouter from '../users.js'

describe('Users API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getConnection.mockReturnValue({
      query: mocks.query,
      execute: mocks.execute,
    })

    app = express()
    app.use(express.json())
    app.use('/api/users', usersRouter)
  })

  describe('GET /api/users', () => {
    it('should normalize pagination inputs and total count to numeric values when listing users', async () => {
      mocks.listUsers.mockResolvedValue({
        data: [
          {
            id: 'user-2',
            username: 'tester',
            email: 'tester@example.com',
            role: 'user',
            is_active: true,
          },
        ],
        pagination: {
          page: 2,
          limit: 5,
          total: 7,
          totalPages: 2,
        },
      })

      const res = await request(app).get('/api/users?page=2&limit=5')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
        data: {
          data: [
            {
              id: 'user-2',
              username: 'tester',
              email: 'tester@example.com',
              role: 'user',
              is_active: true,
            },
          ],
          pagination: {
            page: 2,
            limit: 5,
            total: 7,
            totalPages: 2,
          },
        },
      })
      expect(mocks.listUsers).toHaveBeenCalledWith({ page: 2, limit: 5 })
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })

    it('should apply schema defaults when pagination query is omitted', async () => {
      mocks.listUsers.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      })

      const res = await request(app).get('/api/users')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
        data: {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      })
      expect(mocks.listUsers).toHaveBeenCalledWith({ page: 1, limit: 20 })
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /api/users/:id', () => {
    it('should delegate partial attribute updates to the admin user service', async () => {
      mocks.updateUser.mockResolvedValue({
        id: 'user-123',
        email: 'updated@example.com',
        is_active: false,
        role: 'user',
      })

      const res = await request(app)
        .patch('/api/users/user-123')
        .send({
          email: 'updated@example.com',
          is_active: false,
        })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
        data: {
          id: 'user-123',
          email: 'updated@example.com',
          is_active: false,
          role: 'user',
        },
      })
      expect(mocks.updateUser).toHaveBeenCalledWith('user-123', {
        email: 'updated@example.com',
        is_active: false,
      })
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })

    it('should return a success message without calling the service when no fields are provided', async () => {
      const res = await request(app)
        .patch('/api/users/user-123')
        .send({})

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
        data: { message: 'No changes' },
      })
      expect(mocks.updateUser).not.toHaveBeenCalled()
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })
  })
})
