import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../database/service-async', () => {
  const mockGetWorkflowTemplateById = vi.fn()
  const mockCreateCronJob = vi.fn()
  return {
    getDatabase: vi.fn().mockResolvedValue({
      getWorkflowTemplateById: mockGetWorkflowTemplateById,
      createCronJob: mockCreateCronJob,
      getAllCronJobs: vi.fn().mockResolvedValue([]),
      getCronJobById: vi.fn(),
      updateCronJob: vi.fn(),
      createExecutionLog: vi.fn(),
      updateExecutionLog: vi.fn(),
      getTaskCountsByStatus: vi.fn().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0 }),
    }),
    __mockGetWorkflowTemplateById: mockGetWorkflowTemplateById,
    __mockCreateCronJob: mockCreateCronJob,
  }
})

vi.mock('../services/service-node-registry', () => ({
  getServiceNodeRegistry: vi.fn().mockReturnValue({}),
}))

vi.mock('../services/cron-scheduler', () => ({
  getCronScheduler: vi.fn().mockReturnValue({
    scheduleJob: vi.fn(),
    unscheduleJob: vi.fn(),
    stopAll: vi.fn(),
  }),
}))

vi.mock('../services/workflow-engine', () => ({
  WorkflowEngine: vi.fn(),
}))

import cronRoutes from '../routes/cron'
import { getDatabase } from '../database/service-async'

describe('Cron Job Validation', () => {
  let app: express.Application

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use('/api/cron', cronRoutes)
  })

  it('should reject cron job with non-existent workflow_id', async () => {
    const db = await getDatabase() as any
    db.getWorkflowTemplateById.mockResolvedValue(null)

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
    const db = await getDatabase() as any
    db.getWorkflowTemplateById.mockResolvedValue({ id: 'workflow-1', name: 'Test Workflow' })
    db.createCronJob.mockResolvedValue({
      id: 'job-1',
      name: 'Test Job',
      workflow_id: 'workflow-1',
      is_active: true,
    })

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