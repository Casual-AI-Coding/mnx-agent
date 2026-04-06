import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import cronRoutes from '../routes/cron'
import { getGlobalContainer, resetContainer } from '../container'
import { TOKENS } from '../service-registration'

vi.mock('../database/service-async', () => ({
  getDatabase: vi.fn(),
}))

vi.mock('../services/service-node-registry', () => ({
  getServiceNodeRegistry: vi.fn(),
  resetServiceNodeRegistry: vi.fn(),
}))

describe('Manual Trigger Error Handling', () => {
  let app: express.Application
  let mockDb: any
  let mockScheduler: any

  beforeEach(async () => {
    vi.clearAllMocks()
    resetContainer()

    mockDb = {
      getCronJobById: vi.fn(),
    }

    mockScheduler = {
      executeJobTick: vi.fn(),
      scheduleJob: vi.fn(),
    }

    const { getDatabase } = await import('../database/service-async')
    ;(getDatabase as any).mockResolvedValue(mockDb)

    // Setup DI Container with mock scheduler
    const container = getGlobalContainer()
    container.register(TOKENS.CRON_SCHEDULER, mockScheduler)

    app = express()
    app.use(express.json())
    app.use('/api/cron', cronRoutes)
  })

  afterEach(() => {
    resetContainer()
  })

  it('should return error if job execution fails', async () => {
    mockDb.getCronJobById.mockResolvedValue({
      id: 'test-job',
      name: 'Test Job',
      cron_expression: '0 0 * * *',
      is_active: true,
      workflow_id: 'workflow-1',
    })

    mockScheduler.executeJobTick.mockRejectedValue(new Error('Workflow execution failed'))

    const response = await request(app)
      .post('/api/cron/jobs/test-job/run')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(500)
    expect(response.body.error).toContain('Failed to execute job')
  })

  it('should return success if job execution succeeds', async () => {
    mockDb.getCronJobById.mockResolvedValue({
      id: 'test-job',
      name: 'Test Job',
      cron_expression: '0 0 * * *',
      is_active: true,
      workflow_id: 'workflow-1',
    })

    mockScheduler.executeJobTick.mockResolvedValue(undefined)

    const response = await request(app)
      .post('/api/cron/jobs/test-job/run')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })
})