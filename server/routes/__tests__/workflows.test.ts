import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import workflowsRouter from '../workflows.js'

let fileMarker: string

const mockAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.user = {
    userId: fileMarker,
    username: `workflow-api-test-${fileMarker.slice(0, 8)}`,
    role: 'user',
  }
  next()
}

describe('Workflows API Routes', () => {
  let app: express.Application

  beforeAll(async () => {
    await setupTestDatabase()
    fileMarker = getTestFileMarker(import.meta.url)
    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/workflows', workflowsRouter)
  })

  beforeEach(async () => {
    const conn = getConnection()
    // Create user for this test file (needed for FK constraint)
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [fileMarker, `workflow-api-test-${fileMarker.slice(0, 8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
    await conn.execute('DELETE FROM workflow_templates WHERE owner_id = $1', [fileMarker])
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('GET /api/workflows', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/api/workflows')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.workflows).toEqual([])
    })

    it('should return paginated list', async () => {
      await request(app).post('/api/workflows').send({
        name: 'Workflow 1',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })
      await request(app).post('/api/workflows').send({
        name: 'Workflow 2',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      const res = await request(app).get('/api/workflows?page=1&limit=10')

      expect(res.body.data.workflows.length).toBe(2)
      expect(res.body.data.pagination.total).toBe(2)
    })

    it('should filter by is_public', async () => {
      const createRes1 = await request(app).post('/api/workflows').send({
        name: 'Public 1',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        is_public: true,
      })
      
      const createRes2 = await request(app).post('/api/workflows').send({
        name: 'Private 1',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        is_public: false,
      })

      expect(createRes1.status).toBe(201)
      expect(createRes1.body.data.is_public).toBe(true)
      expect(createRes2.status).toBe(201)
      expect(createRes2.body.data.is_public).toBe(false)

      const res = await request(app).get('/api/workflows?is_public=true')

      expect(res.body.data.workflows.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.workflows.some(w => w.name === 'Public 1')).toBe(true)
    })
  })

  describe('POST /api/workflows', () => {
    it('should create a workflow', async () => {
      const res = await request(app).post('/api/workflows').send({
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes_json: JSON.stringify({ nodes: [], edges: [] }),
        edges_json: JSON.stringify({ edges: [] }),
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('Test Workflow')
      expect(res.body.data.id).toBeDefined()
    })

    it('should create workflow with is_public default false', async () => {
      const res = await request(app).post('/api/workflows').send({
        name: 'Test Workflow',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.is_public).toBe(false)
    })

    it('should reject missing name', async () => {
      const res = await request(app).post('/api/workflows').send({
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      expect(res.status).toBe(400)
    })

    it('should reject empty nodes_json', async () => {
      const res = await request(app).post('/api/workflows').send({
        name: 'Test Workflow',
        nodes_json: '',
        edges_json: '{"edges":[]}',
      })

      expect(res.status).toBe(400)
    })

    it('should reject name exceeding 100 characters', async () => {
      const res = await request(app).post('/api/workflows').send({
        name: 'a'.repeat(101),
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/workflows/:id', () => {
    it('should return single workflow', async () => {
      const createRes = await request(app).post('/api/workflows').send({
        name: 'Test Workflow',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      const res = await request(app).get(`/api/workflows/${createRes.body.data.id}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(createRes.body.data.id)
      expect(res.body.data.name).toBe('Test Workflow')
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/workflows/non-existent-id')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow', async () => {
      const createRes = await request(app).post('/api/workflows').send({
        name: 'Original Name',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      const res = await request(app).put(`/api/workflows/${createRes.body.data.id}`).send({
        name: 'Updated Name',
        description: 'Updated description',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Updated Name')
      expect(res.body.data.description).toBe('Updated description')
    })

    it('should update nodes and edges', async () => {
      const createRes = await request(app).post('/api/workflows').send({
        name: 'Test Workflow',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      const newNodes = { nodes: [{ id: 'node-1', type: 'trigger' }] }
      const newEdges = { edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }] }

      const res = await request(app).put(`/api/workflows/${createRes.body.data.id}`).send({
        nodes_json: JSON.stringify(newNodes),
        edges_json: JSON.stringify(newEdges),
      })

      expect(res.status).toBe(200)
      expect(res.body.data.nodes_json).toBe(JSON.stringify(newNodes))
      expect(res.body.data.edges_json).toBe(JSON.stringify(newEdges))
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).put('/api/workflows/non-existent-id').send({
        name: 'Updated Name',
      })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow', async () => {
      const createRes = await request(app).post('/api/workflows').send({
        name: 'Delete Me',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      })

      const res = await request(app).delete(`/api/workflows/${createRes.body.data.id}`)

      expect(res.status).toBe(200)
      expect(res.body.data.deleted).toBe(true)

      const getRes = await request(app).get(`/api/workflows/${createRes.body.data.id}`)
      expect(getRes.status).toBe(404)
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).delete('/api/workflows/non-existent-id')

      expect(res.status).toBe(404)
    })
  })
})
