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
  getServiceNodeRegistry: vi.fn().mockReturnValue({}),
  resetServiceNodeRegistry: vi.fn(),
}))

vi.mock('../services/workflow/index', () => ({
  WorkflowEngine: vi.fn(),
}))

describe('Cron Job Validation', () => {
  let app: express.Application
  let mockScheduler: any
  let mockDb: any
  let mockJobService: any
  let mockWorkflowService: any

  beforeEach(async () => {
    vi.clearAllMocks()
    resetContainer()

    mockDb = {
      getWorkflowTemplateById: vi.fn(),
      createCronJob: vi.fn(),
      getAllCronJobs: vi.fn().mockResolvedValue([]),
      getCronJobById: vi.fn(),
      updateCronJob: vi.fn(),
      createExecutionLog: vi.fn(),
      updateExecutionLog: vi.fn(),
      getTaskCountsByStatus: vi.fn().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0 }),
    }

    mockScheduler = {
      scheduleJob: vi.fn(),
      unscheduleJob: vi.fn(),
      stopAll: vi.fn(),
    }

    mockJobService = {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: 'job-1',
        name: 'Test Job',
        workflow_id: 'workflow-1',
        is_active: true,
      }),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockWorkflowService = {
      getById: vi.fn(),
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    const mockTaskService = {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
    }

    const mockLogService = {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      create: vi.fn(),
      getDetails: vi.fn().mockResolvedValue([]),
    }

    const { getDatabase } = await import('../database/service-async')
    ;(getDatabase as any).mockResolvedValue(mockDb)

    const container = getGlobalContainer()
    container.register(TOKENS.DATABASE, mockDb)
    container.register(TOKENS.CRON_SCHEDULER, mockScheduler)
    container.register(TOKENS.JOB_SERVICE, mockJobService)
    container.register(TOKENS.WORKFLOW_SERVICE, mockWorkflowService)
    container.register(TOKENS.TASK_SERVICE, mockTaskService)
    container.register(TOKENS.LOG_SERVICE, mockLogService)

    app = express()
    app.use(express.json())
    app.use('/api/cron', cronRoutes)
  })

  afterEach(() => {
    resetContainer()
  })

  it('should reject cron job with non-existent workflow_id', async () => {
    mockWorkflowService.getById.mockResolvedValue(null)

    const response = await request(app)
      .post('/api/cron/jobs')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Test Job',
        cron_expression: '0 0 * * *',
        workflow_id: 'non-existent-id',
        timezone: 'UTC',
      })

    expect(response.status).toBe(404)
    expect(response.body.error).toContain('Workflow not found')
  })

  it('should reject cron job without workflow_id', async () => {
    const response = await request(app)
      .post('/api/cron/jobs')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Test Job',
        cron_expression: '0 0 * * *',
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('workflow_id is required')
  })

  it('should create cron job with valid workflow_id', async () => {
    mockWorkflowService.getById.mockResolvedValue({ id: 'workflow-1', name: 'Test Workflow' })

    const response = await request(app)
      .post('/api/cron/jobs')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Test Job',
        cron_expression: '0 0 * * *',
        workflow_id: 'workflow-1',
        timezone: 'UTC',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
  })
})