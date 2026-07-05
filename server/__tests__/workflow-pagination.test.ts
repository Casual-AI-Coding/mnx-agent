import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import workflowRoutes from '../routes/workflows'
import { getGlobalContainer, resetContainer } from '../container'
import { TOKENS } from '../service-registration'

vi.mock('../services/service-node-registry', () => ({
  getServiceNodeRegistry: vi.fn(),
  resetServiceNodeRegistry: vi.fn(),
}))

describe('Workflow Pagination Validation', () => {
  let app: express.Application
  let getPaginated: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetContainer()

    getPaginated = vi.fn().mockResolvedValue({ templates: [], total: 0 })

    const mockServiceNodeRegistry = {}

    const mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }

    const container = getGlobalContainer()
    container.register(TOKENS.WORKFLOW_SERVICE, { getPaginated })
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
    expect(getPaginated).toHaveBeenCalledWith(1, 10, undefined)
  })

  it('should clamp negative limit to 1', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=-5')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(getPaginated).toHaveBeenCalledWith(1, 1, undefined)
  })

  it('should clamp limit over 100 to 100', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=200')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(getPaginated).toHaveBeenCalledWith(1, 100, undefined)
  })

  it('should accept valid pagination', async () => {
    const response = await request(app)
      .get('/api/workflows?page=1&limit=10')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
  })
})
