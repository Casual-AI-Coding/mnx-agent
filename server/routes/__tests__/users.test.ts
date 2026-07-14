import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createUser: vi.fn(),
  resetPassword: vi.fn(),
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
    deleteUser: mocks.deleteUser,
    createUser: mocks.createUser,
    resetPassword: mocks.resetPassword,
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

  describe('DELETE /api/users/:id', () => {
    it('returns 400 when attempting to delete own account', async () => {
      const res = await request(app).delete('/api/users/super-user')

      expect(res.status).toBe(400)
      expect(res.body).toEqual({
        success: false,
        error: '不能删除自己的账户',
      })
      expect(mocks.deleteUser).not.toHaveBeenCalled()
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })

    it('returns 404 when the target user does not exist', async () => {
      mocks.deleteUser.mockResolvedValue(false)

      const res = await request(app).delete('/api/users/nonexistent-id')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({
        success: false,
        error: '用户不存在',
      })
      expect(mocks.deleteUser).toHaveBeenCalledWith('nonexistent-id')
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })

    it('returns 200 with a success message when the user is deleted', async () => {
      mocks.deleteUser.mockResolvedValue(true)

      const res = await request(app).delete('/api/users/user-to-delete')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
        data: { message: '用户已删除' },
      })
      expect(mocks.deleteUser).toHaveBeenCalledWith('user-to-delete')
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/users', () => {
    it('delegates user creation to the admin user service and returns 201', async () => {
      const createdUser = {
        id: 'new-user-123',
        username: 'newuser',
        email: 'new@example.com',
        role: 'user',
        is_active: true,
      }
      mocks.createUser.mockResolvedValue(createdUser)

      const res = await request(app)
        .post('/api/users')
        .send({
          username: 'newuser',
          password: 'secure-pass-123',
          email: 'new@example.com',
          role: 'user',
        })

      expect(res.status).toBe(201)
      expect(res.body).toEqual({
        success: true,
        data: createdUser,
      })
      expect(mocks.createUser).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'secure-pass-123',
        email: 'new@example.com',
        role: 'user',
      })
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(mocks.createUser).not.toHaveBeenCalled()
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/users/:id/reset-password', () => {
    it('delegates password reset and returns a success message', async () => {
      mocks.resetPassword.mockResolvedValue(true)

      const res = await request(app).post('/api/users/user-42/reset-password')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true, data: { message: '密码已重置' } })
      expect(mocks.resetPassword).toHaveBeenCalledWith('user-42')
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })

    it('returns 404 when the user does not exist', async () => {
      mocks.resetPassword.mockResolvedValue(false)

      const res = await request(app).post('/api/users/ghost/reset-password')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ success: false, error: '用户不存在' })
      expect(mocks.resetPassword).toHaveBeenCalledWith('ghost')
      expect(mocks.getConnection).not.toHaveBeenCalled()
    })
  })
})
