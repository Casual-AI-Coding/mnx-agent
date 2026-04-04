import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createConnection, closeConnection, getConnection } from '../../../database/connection.js'
import { getDatabase } from '../../../database/service-async.js'
import servicePermissionsRouter from '../service-permissions.js'

const mockUser = {
  userId: 'test-user-001',
  role: 'super',
}

const mockAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.user = mockUser
  next()
}

describe('Service Permissions API Routes', () => {
  let app: express.Application
  let db: Awaited<ReturnType<typeof getDatabase>>

  beforeAll(async () => {
    await createConnection({
      pgHost: process.env.DB_HOST || 'localhost',
      pgPort: parseInt(process.env.DB_PORT || '5432', 10),
      pgUser: process.env.DB_USER || 'postgres',
      pgPassword: process.env.DB_PASSWORD || '',
      pgDatabase: process.env.DB_NAME || 'minimax_agent',
    })
    db = await getDatabase()

    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/admin/service-permissions', servicePermissionsRouter)
  })

  afterAll(async () => {
    await closeConnection()
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM service_node_permissions WHERE service_name LIKE $1', ['test_%'])
  })

  describe('GET /api/admin/service-permissions', () => {
    it('should return all permissions', async () => {
      const res = await request(app).get('/api/admin/service-permissions')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.permissions).toBeDefined()
      expect(res.body.data.total).toBeDefined()
    })
  })

  describe('GET /api/admin/service-permissions/:service/:method', () => {
    beforeEach(async () => {
      await db.upsertServiceNodePermission({
        service_name: 'test_service',
        method_name: 'test_method',
        display_name: 'Test Method',
        category: 'Test Category',
        min_role: 'pro',
        is_enabled: true,
      })
    })

    it('should return a specific permission', async () => {
      const res = await request(app)
        .get('/api/admin/service-permissions/test_service/test_method')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.service_name).toBe('test_service')
      expect(res.body.data.method_name).toBe('test_method')
    })

    it('should return 404 for non-existent permission', async () => {
      const res = await request(app)
        .get('/api/admin/service-permissions/non_existent/non_existent')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/admin/service-permissions', () => {
    it('should create a new permission', async () => {
      const res = await request(app)
        .post('/api/admin/service-permissions')
        .send({
          service_name: 'test_service',
          method_name: 'create_method',
          display_name: 'Create Method',
          category: 'Test Category',
          min_role: 'admin',
          is_enabled: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.service_name).toBe('test_service')
      expect(res.body.data.method_name).toBe('create_method')
      expect(res.body.data.display_name).toBe('Create Method')
      expect(res.body.data.min_role).toBe('admin')
      expect(res.body.data.is_enabled).toBe(true)
    })

    it('should create with default min_role and is_enabled', async () => {
      const res = await request(app)
        .post('/api/admin/service-permissions')
        .send({
          service_name: 'test_service',
          method_name: 'default_method',
          display_name: 'Default Method',
          category: 'Test Category',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.min_role).toBe('pro')
      expect(res.body.data.is_enabled).toBe(true)
    })

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/service-permissions')
        .send({
          service_name: 'test_service',
        })

      expect(res.status).toBe(400)
    })

    it('should return 400 for invalid min_role', async () => {
      const res = await request(app)
        .post('/api/admin/service-permissions')
        .send({
          service_name: 'test_service',
          method_name: 'invalid_role',
          display_name: 'Invalid Role Method',
          category: 'Test Category',
          min_role: 'invalid_role',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/admin/service-permissions/:id', () => {
    let permissionId: string

    beforeEach(async () => {
      await db.upsertServiceNodePermission({
        service_name: 'test_service',
        method_name: 'update_method',
        display_name: 'Update Method',
        category: 'Test Category',
        min_role: 'pro',
        is_enabled: true,
      })
      const permission = await db.getServiceNodePermission('test_service', 'update_method')
      permissionId = permission!.id
    })

    it('should update permission', async () => {
      const res = await request(app)
        .patch(`/api/admin/service-permissions/${permissionId}`)
        .send({
          display_name: 'Updated Display Name',
          min_role: 'admin',
          is_enabled: false,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.display_name).toBe('Updated Display Name')
      expect(res.body.data.min_role).toBe('admin')
      expect(res.body.data.is_enabled).toBe(false)
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .patch('/api/admin/service-permissions/non-existent-id')
        .send({
          is_enabled: false,
        })

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid min_role', async () => {
      const res = await request(app)
        .patch(`/api/admin/service-permissions/${permissionId}`)
        .send({
          min_role: 'invalid_role',
        })

      expect(res.status).toBe(400)
    })

    it('should allow partial update', async () => {
      const res = await request(app)
        .patch(`/api/admin/service-permissions/${permissionId}`)
        .send({
          display_name: 'Only Display Name Updated',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.display_name).toBe('Only Display Name Updated')
      expect(res.body.data.min_role).toBe('pro')
      expect(res.body.data.is_enabled).toBe(true)
    })
  })

  describe('DELETE /api/admin/service-permissions/:id', () => {
    let permissionId: string

    beforeEach(async () => {
      await db.upsertServiceNodePermission({
        service_name: 'test_service',
        method_name: 'delete_method',
        display_name: 'Delete Method',
        category: 'Test Category',
        min_role: 'pro',
        is_enabled: true,
      })
      const permission = await db.getServiceNodePermission('test_service', 'delete_method')
      permissionId = permission!.id
    })

    it('should delete permission', async () => {
      const res = await request(app)
        .delete(`/api/admin/service-permissions/${permissionId}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.deleted).toBe(true)

      const getRes = await request(app)
        .get('/api/admin/service-permissions/test_service/delete_method')
      expect(getRes.status).toBe(404)
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/admin/service-permissions/non-existent-id')

      expect(res.status).toBe(404)
    })
  })
})