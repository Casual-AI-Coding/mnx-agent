import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import workflowRoutes from '../routes/workflows'

vi.mock('../database/service-async', () => ({
  getDatabase: vi.fn(),
}))

vi.mock('../services/service-node-registry', () => ({
  getServiceNodeRegistry: vi.fn(),
  resetServiceNodeRegistry: vi.fn(),
}))

describe('Workflow Pagination Validation', () => {
  let app: express.Application
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockDb = {
      getWorkflowTemplatesPaginated: vi.fn().mockResolvedValue({ templates: [], total: 0 }),
    }

    const { getDatabase } = await import('../database/service-async')
    ;(getDatabase as any).mockResolvedValue(mockDb)

    app = express()
    app.use(express.json())
    app.use('/api/workflows', workflowRoutes)
  })

  it('should reject negative page number', async () => {
    const response = await request(app)
      .get('/api/workflows?page=-1&limit=10')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('page must be a positive integer')
  })

  it('should reject negative limit', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=-5')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('limit must be a positive integer')
  })

  it('should reject limit over 100', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=200')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('limit must not exceed 100')
  })

  it('should accept valid pagination', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=10')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
  })
})