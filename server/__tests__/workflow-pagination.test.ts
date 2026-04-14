import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import workflowRoutes from '../routes/workflows'
import { getGlobalContainer, resetContainer } from '../container'
import { TOKENS } from '../service-registration'

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
    resetContainer()

    mockDb = {
      getWorkflowTemplatesPaginated: vi.fn().mockResolvedValue({ templates: [], total: 0 }),
    }

    const mockServiceNodeRegistry = {}

    const mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }

    const { getDatabase } = await import('../database/service-async')
    ;(getDatabase as any).mockResolvedValue(mockDb)

    const container = getGlobalContainer()
    container.register(TOKENS.DATABASE, mockDb)
    container.register(TOKENS.SERVICE_NODE_REGISTRY, mockServiceNodeRegistry)
    container.register(TOKENS.EVENT_BUS, mockEventBus)

    app = express()
    app.use(express.json())
    app.use('/api/workflows', workflowRoutes)
  })

  afterEach(() => {
    resetContainer()
  })

  it('should clamp negative page number to 1', async () => {
    const response = await request(app)
      .get('/api/workflows?page=-1&limit=10')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 })
    )
  })

  it('should clamp negative limit to 1', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=-5')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1 })
    )
  })

  it('should clamp limit over 100 to 100', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=200')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    )
  })

  it('should accept valid pagination', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=10')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
  })
})