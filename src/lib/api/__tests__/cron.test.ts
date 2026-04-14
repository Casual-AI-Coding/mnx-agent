import { describe, expect, it, vi, beforeEach } from 'vitest'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  WorkflowTemplate,
  CreateCronJobDTO,
  UpdateCronJobDTO,
  CreateTaskDTO,
} from '@/types/cron'
import { TaskStatus, TriggerType } from '@/types/cron'

const mockApiMethod = vi.fn()

vi.mock('../create-api-method', () => ({
  createApiMethod: mockApiMethod,
}))

describe('Cron API Module', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getCronJobs', () => {
    it('should return jobs on successful response', async () => {
      const mockJobs: CronJob[] = [{
        id: 'job-1', name: 'Test Job', description: 'Test', cronExpression: '0 0 * * *',
        isActive: true, workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z', lastRunAt: null, nextRunAt: '2024-01-02T00:00:00Z',
        totalRuns: 0, totalFailures: 0,
      }]
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { jobs: mockJobs, total: 1 } }))
      const { getCronJobs } = await import('../cron')
      const result = await getCronJobs()
      expect(result.success).toBe(true)
      expect(result.data?.jobs).toEqual(mockJobs)
    })
  })

  describe('createCronJob', () => {
    it('should create job and return data on success', async () => {
      const mockJob: CronJob = { id: 'job-1', name: 'Test', description: 'Test', cronExpression: '0 0 * * *',
        isActive: true, workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        lastRunAt: null, nextRunAt: '2024-01-02T00:00:00Z', totalRuns: 0, totalFailures: 0 }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockJob }))
      const { createCronJob } = await import('../cron')
      const result = await createCronJob({ name: 'Test', cronExpression: '0 0 * * *', workflowJson: '{}' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockJob)
    })
  })

  describe('getCronJob', () => {
    it('should return single job on success', async () => {
      const mockJob: CronJob = { id: 'job-1', name: 'Test', description: 'Test', cronExpression: '0 0 * * *',
        isActive: true, workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        lastRunAt: null, nextRunAt: '2024-01-02T00:00:00Z', totalRuns: 0, totalFailures: 0 }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockJob }))
      const { getCronJob } = await import('../cron')
      const result = await getCronJob('job-1')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockJob)
    })
  })

  describe('updateCronJob', () => {
    it('should update job and return updated data', async () => {
      const mockJob: CronJob = { id: 'job-1', name: 'Updated', description: 'Test', cronExpression: '0 1 * * *',
        isActive: false, workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
        lastRunAt: null, nextRunAt: null, totalRuns: 0, totalFailures: 0 }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockJob }))
      const { updateCronJob } = await import('../cron')
      const result = await updateCronJob('job-1', { name: 'Updated' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockJob)
    })
  })

  describe('deleteCronJob', () => {
    it('should return success on delete', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { success: true } }))
      const { deleteCronJob } = await import('../cron')
      const result = await deleteCronJob('job-1')
      expect(result.success).toBe(true)
    })
  })

  describe('runCronJob', () => {
    it('should trigger job run and return result', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { taskId: 'task-1', status: 'queued' } }))
      const { runCronJob } = await import('../cron')
      const result = await runCronJob('job-1')
      expect(result.success).toBe(true)
      expect(result.data?.taskId).toBe('task-1')
    })
  })

  describe('toggleCronJob', () => {
    it('should toggle job status', async () => {
      const mockJob: CronJob = { id: 'job-1', name: 'Test', description: 'Test', cronExpression: '0 0 * * *',
        isActive: false, workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
        lastRunAt: null, nextRunAt: null, totalRuns: 0, totalFailures: 0 }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockJob }))
      const { toggleCronJob } = await import('../cron')
      const result = await toggleCronJob('job-1')
      expect(result.success).toBe(true)
      expect(result.data?.isActive).toBe(false)
    })
  })

  describe('getTasks', () => {
    it('should return tasks with default params', async () => {
      const mockTasks: TaskQueueItem[] = [{ id: 'task-1', jobId: 'job-1', status: TaskStatus.QUEUED,
        triggerType: TriggerType.MANUAL, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        retryCount: 0, maxRetries: 3, workflowSnapshot: '{}' }]
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { tasks: mockTasks, total: 1 } }))
      const { getTasks } = await import('../cron')
      const result = await getTasks()
      expect(result.success).toBe(true)
      expect(result.data?.tasks).toEqual(mockTasks)
    })

    it('should filter tasks by status', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { tasks: [], total: 0 } }))
      const { getTasks } = await import('../cron')
      const result = await getTasks({ status: TaskStatus.COMPLETED })
      expect(result.success).toBe(true)
    })

    it('should filter tasks by jobId', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { tasks: [], total: 0 } }))
      const { getTasks } = await import('../cron')
      const result = await getTasks({ jobId: 'job-1' })
      expect(result.success).toBe(true)
    })

    it('should apply pagination params', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { tasks: [], total: 0 } }))
      const { getTasks } = await import('../cron')
      const result = await getTasks({ page: 2, limit: 50 })
      expect(result.success).toBe(true)
    })

    it('should combine multiple filters', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { tasks: [], total: 0 } }))
      const { getTasks } = await import('../cron')
      const result = await getTasks({ status: TaskStatus.COMPLETED, jobId: 'job-1', page: 1, limit: 20 })
      expect(result.success).toBe(true)
    })
  })

  describe('createTask', () => {
    it('should create task with all fields', async () => {
      const mockTask: TaskQueueItem = { id: 'task-1', jobId: 'job-1', status: TaskStatus.QUEUED,
        triggerType: TriggerType.MANUAL, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        retryCount: 0, maxRetries: 3, workflowSnapshot: '{}' }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockTask }))
      const { createTask } = await import('../cron')
      const result = await createTask({ jobId: 'job-1', triggerType: TriggerType.MANUAL, workflowSnapshot: '{}' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTask)
    })
  })

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { success: true } }))
      const { deleteTask } = await import('../cron')
      const result = await deleteTask('task-1')
      expect(result.success).toBe(true)
    })
  })

  describe('retryTask', () => {
    it('should retry task and return updated task', async () => {
      const mockTask: TaskQueueItem = { id: 'task-1', jobId: 'job-1', status: TaskStatus.QUEUED,
        triggerType: TriggerType.MANUAL, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        retryCount: 1, maxRetries: 3, workflowSnapshot: '{}' }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockTask }))
      const { retryTask } = await import('../cron')
      const result = await retryTask('task-1')
      expect(result.success).toBe(true)
      expect(result.data?.retryCount).toBe(1)
    })
  })

  describe('getLogs', () => {
    it('should return logs without filters', async () => {
      const mockLogs: ExecutionLog[] = [{ id: 'log-1', jobId: 'job-1', taskId: 'task-1', status: 'success',
        startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T00:01:00Z', duration: 60, createdAt: '2024-01-01T00:00:00Z' }]
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { logs: mockLogs, total: 1 } }))
      const { getLogs } = await import('../cron')
      const result = await getLogs()
      expect(result.success).toBe(true)
      expect(result.data?.logs).toEqual(mockLogs)
    })

    it('should filter logs by jobId', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { logs: [], total: 0 } }))
      const { getLogs } = await import('../cron')
      const result = await getLogs({ jobId: 'job-1' })
      expect(result.success).toBe(true)
    })

    it('should filter logs by status', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { logs: [], total: 0 } }))
      const { getLogs } = await import('../cron')
      const result = await getLogs({ status: 'success' })
      expect(result.success).toBe(true)
    })

    it('should limit log results', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { logs: [], total: 0 } }))
      const { getLogs } = await import('../cron')
      const result = await getLogs({ limit: 10 })
      expect(result.success).toBe(true)
    })
  })

  describe('getLogById', () => {
    it('should return single log detail', async () => {
      const mockLog: ExecutionLog = { id: 'log-1', jobId: 'job-1', taskId: 'task-1', status: 'success',
        startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T00:01:00Z', duration: 60, createdAt: '2024-01-01T00:00:00Z' }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockLog }))
      const { getLogById } = await import('../cron')
      const result = await getLogById('log-1')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockLog)
    })
  })

  describe('validateWorkflow', () => {
    it('should validate workflow with nodes and edges', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { valid: true } }))
      const { validateWorkflow } = await import('../cron')
      const result = await validateWorkflow({ nodes: [{ id: '1', type: 'action', data: {} }], edges: [] })
      expect(result.success).toBe(true)
      expect(result.data?.valid).toBe(true)
    })

    it('should return validation errors', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { valid: false, errors: ['Missing node'] } }))
      const { validateWorkflow } = await import('../cron')
      const result = await validateWorkflow({ nodes: [], edges: [] })
      expect(result.success).toBe(true)
      expect(result.data?.valid).toBe(false)
    })
  })

  describe('getWorkflowTemplates', () => {
    it('should return templates list', async () => {
      const mockTemplates: WorkflowTemplate[] = [{ id: 't1', name: 'Test', description: 'Test',
        workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }]
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { templates: mockTemplates, total: 1 } }))
      const { getWorkflowTemplates } = await import('../cron')
      const result = await getWorkflowTemplates()
      expect(result.success).toBe(true)
      expect(result.data?.templates).toEqual(mockTemplates)
    })
  })

  describe('createWorkflowTemplate', () => {
    it('should create template with all fields', async () => {
      const mockTemplate: WorkflowTemplate = { id: 't1', name: 'Test', description: 'Test',
        workflowJson: '{}', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: mockTemplate }))
      const { createWorkflowTemplate } = await import('../cron')
      const result = await createWorkflowTemplate({ name: 'Test', workflowJson: '{}' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTemplate)
    })
  })

  describe('deleteWorkflowTemplate', () => {
    it('should delete template successfully', async () => {
      mockApiMethod.mockReturnValueOnce(async () => ({ success: true, data: { success: true } }))
      const { deleteWorkflowTemplate } = await import('../cron')
      const result = await deleteWorkflowTemplate('t1')
      expect(result.success).toBe(true)
    })
  })
})
