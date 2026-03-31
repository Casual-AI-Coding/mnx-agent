import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios, { AxiosError } from 'axios'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  WorkflowTemplate,
  CreateCronJobDTO,
  UpdateCronJobDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreateWorkflowTemplateDTO,
  UpdateWorkflowTemplateDTO,
} from '@/types/cron'
import { TaskStatus, TriggerType } from '@/types/cron'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    create: vi.fn(() => mockAxiosInstance),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: {
      ...mockAxiosInstance,
      isAxiosError: vi.fn((error) => error && error.isAxiosError === true),
    },
    ...mockAxiosInstance,
  }
})

vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:4511',
  },
})

describe('Cron API Module', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getCronJobs', () => {
    it('should return jobs on successful response', async () => {
      const { getCronJobs } = await import('../cron')
      const mockJobs: CronJob[] = [
        {
          id: 'job-1',
          name: 'Test Job',
          description: 'Test description',
          cronExpression: '0 0 * * *',
          isActive: true,
          workflowJson: '{}',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          lastRunAt: null,
          nextRunAt: '2024-01-02T00:00:00Z',
          totalRuns: 0,
          totalFailures: 0,
        },
      ]

      mockGet.mockResolvedValueOnce({
        data: { data: { jobs: mockJobs, total: 1 } },
      })

      const result = await getCronJobs()

      expect(mockGet).toHaveBeenCalledWith('/cron/jobs')
      expect(result.success).toBe(true)
      expect(result.data?.jobs).toEqual(mockJobs)
      expect(result.data?.total).toBe(1)
    })

    it('should handle Axios error with response data', async () => {
      const { getCronJobs } = await import('../cron')
      const axiosError = new Error('Request failed') as AxiosError<{ error: string }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Network error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      }

      mockGet.mockRejectedValueOnce(axiosError)

      const result = await getCronJobs()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle Axios error with nested error data', async () => {
      const { getCronJobs } = await import('../cron')
      const axiosError = new Error('Request failed') as AxiosError<{ data: { error: string } }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { data: { error: 'Nested error' } },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      }

      mockGet.mockRejectedValueOnce(axiosError)

      const result = await getCronJobs()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Nested error')
    })

    it('should handle generic error', async () => {
      const { getCronJobs } = await import('../cron')
      mockGet.mockRejectedValueOnce(new Error('Generic error'))

      const result = await getCronJobs()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Generic error')
    })

    it('should handle unknown error type', async () => {
      const { getCronJobs } = await import('../cron')
      mockGet.mockRejectedValueOnce('Unknown string error')

      const result = await getCronJobs()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  describe('createCronJob', () => {
    it('should create job and return data on success', async () => {
      const { createCronJob } = await import('../cron')
      const createDto: CreateCronJobDTO = {
        name: 'New Job',
        description: 'New description',
        cronExpression: '0 0 * * *',
        workflowJson: '{"nodes":[]}',
        isActive: true,
      }

      const mockJob: CronJob = {
        id: 'job-2',
        name: 'New Job',
        description: 'New description',
        cronExpression: '0 0 * * *',
        isActive: true,
        workflowJson: '{"nodes":[]}',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastRunAt: null,
        nextRunAt: null,
        totalRuns: 0,
        totalFailures: 0,
      }

      mockPost.mockResolvedValueOnce({
        data: { data: mockJob },
      })

      const result = await createCronJob(createDto)

      expect(mockPost).toHaveBeenCalledWith('/cron/jobs', {
        name: 'New Job',
        description: 'New description',
        cron_expression: '0 0 * * *',
        workflow_json: '{"nodes":[]}',
        is_active: true,
      })
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('job-2')
    })

    it('should default isActive to true when not specified', async () => {
      const { createCronJob } = await import('../cron')
      const createDto: CreateCronJobDTO = {
        name: 'New Job',
        description: 'New description',
        cronExpression: '0 0 * * *',
        workflowJson: '{}',
      }

      mockPost.mockResolvedValueOnce({
        data: { data: {} },
      })

      await createCronJob(createDto)

      expect(mockPost).toHaveBeenCalledWith('/cron/jobs', expect.objectContaining({
        is_active: true,
      }))
    })

    it('should handle error on create failure', async () => {
      const { createCronJob } = await import('../cron')
      const axiosError = new Error('Bad request') as AxiosError<{ message: string }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { message: 'Invalid cron expression' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      }

      mockPost.mockRejectedValueOnce(axiosError)

      const result = await createCronJob({
        name: 'Job',
        description: '',
        cronExpression: 'invalid',
        workflowJson: '{}',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid cron expression')
    })
  })

  describe('getCronJob', () => {
    it('should return single job on success', async () => {
      const { getCronJob } = await import('../cron')
      const mockJob: CronJob = {
        id: 'job-1',
        name: 'Test Job',
        description: 'Test',
        cronExpression: '0 0 * * *',
        isActive: true,
        workflowJson: '{}',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastRunAt: null,
        nextRunAt: null,
        totalRuns: 0,
        totalFailures: 0,
      }

      mockGet.mockResolvedValueOnce({
        data: { data: mockJob },
      })

      const result = await getCronJob('job-1')

      expect(mockGet).toHaveBeenCalledWith('/cron/jobs/job-1')
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('job-1')
    })

    it('should handle 404 error', async () => {
      const { getCronJob } = await import('../cron')
      const axiosError = new Error('Not found') as AxiosError
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Job not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      }

      mockGet.mockRejectedValueOnce(axiosError)

      const result = await getCronJob('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Job not found')
    })
  })

  describe('updateCronJob', () => {
    it('should update job and return updated data', async () => {
      const { updateCronJob } = await import('../cron')
      const updates: UpdateCronJobDTO = {
        name: 'Updated Name',
        isActive: false,
      }

      const mockJob: CronJob = {
        id: 'job-1',
        name: 'Updated Name',
        description: 'Test',
        cronExpression: '0 0 * * *',
        isActive: false,
        workflowJson: '{}',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        lastRunAt: null,
        nextRunAt: null,
        totalRuns: 0,
        totalFailures: 0,
      }

      mockPut.mockResolvedValueOnce({
        data: { data: mockJob },
      })

      const result = await updateCronJob('job-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/jobs/job-1', {
        name: 'Updated Name',
        is_active: false,
      })
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Name')
      expect(result.data?.isActive).toBe(false)
    })

    it('should only send defined fields', async () => {
      const { updateCronJob } = await import('../cron')
      const updates: UpdateCronJobDTO = {
        description: 'Only description updated',
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      await updateCronJob('job-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/jobs/job-1', {
        description: 'Only description updated',
      })
    })

    it('should transform cronExpression field', async () => {
      const { updateCronJob } = await import('../cron')
      const updates: UpdateCronJobDTO = {
        cronExpression: '*/5 * * * *',
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      await updateCronJob('job-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/jobs/job-1', {
        cron_expression: '*/5 * * * *',
      })
    })

    it('should transform workflowJson field', async () => {
      const { updateCronJob } = await import('../cron')
      const updates: UpdateCronJobDTO = {
        workflowJson: '{"updated":true}',
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      await updateCronJob('job-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/jobs/job-1', {
        workflow_json: '{"updated":true}',
      })
    })
  })

  describe('deleteCronJob', () => {
    it('should return success on delete', async () => {
      const { deleteCronJob } = await import('../cron')
      mockDelete.mockResolvedValueOnce({})

      const result = await deleteCronJob('job-1')

      expect(mockDelete).toHaveBeenCalledWith('/cron/jobs/job-1')
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('should handle delete error', async () => {
      const { deleteCronJob } = await import('../cron')
      const axiosError = new Error() as AxiosError<{ error: string }>
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Cannot delete active job' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      }

      mockDelete.mockRejectedValueOnce(axiosError)

      const result = await deleteCronJob('job-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot delete active job')
    })
  })

  describe('runCronJob', () => {
    it('should trigger job run and return result', async () => {
      const { runCronJob } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: { message: 'Job triggered', logId: 'log-123' } },
      })

      const result = await runCronJob('job-1')

      expect(mockPost).toHaveBeenCalledWith('/cron/jobs/job-1/run')
      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Job triggered')
      expect(result.data?.logId).toBe('log-123')
    })

    it('should handle run error', async () => {
      const { runCronJob } = await import('../cron')
      const axiosError = new Error() as AxiosError
      axiosError.isAxiosError = true
      axiosError.response = {
        data: { error: 'Job is disabled' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      }

      mockPost.mockRejectedValueOnce(axiosError)

      const result = await runCronJob('disabled-job')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Job is disabled')
    })
  })

  describe('toggleCronJob', () => {
    it('should toggle job status', async () => {
      const { toggleCronJob } = await import('../cron')
      const mockJob: CronJob = {
        id: 'job-1',
        name: 'Test',
        description: '',
        cronExpression: '0 0 * * *',
        isActive: false,
        workflowJson: '{}',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastRunAt: null,
        nextRunAt: null,
        totalRuns: 0,
        totalFailures: 0,
      }

      mockPost.mockResolvedValueOnce({
        data: { data: { job: mockJob, scheduled: false } },
      })

      const result = await toggleCronJob('job-1')

      expect(mockPost).toHaveBeenCalledWith('/cron/jobs/job-1/toggle')
      expect(result.success).toBe(true)
      expect(result.data?.job.isActive).toBe(false)
      expect(result.data?.scheduled).toBe(false)
    })
  })

  describe('getTasks', () => {
    it('should return tasks with default params', async () => {
      const { getTasks } = await import('../cron')
      const mockTasks: TaskQueueItem[] = [
        {
          id: 'task-1',
          jobId: 'job-1',
          taskType: 'text',
          payload: {},
          priority: 0,
          status: TaskStatus.Pending,
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
          result: null,
          createdAt: '2024-01-01T00:00:00Z',
          startedAt: null,
          completedAt: null,
        },
      ]

      mockGet.mockResolvedValueOnce({
        data: { data: { tasks: mockTasks, total: 1 } },
      })

      const result = await getTasks()

      expect(mockGet).toHaveBeenCalledWith('/cron/queue', { params: new URLSearchParams() })
      expect(result.success).toBe(true)
      expect(result.data?.tasks).toEqual(mockTasks)
    })

    it('should filter tasks by status', async () => {
      const { getTasks } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { tasks: [], total: 0 } },
      })

      await getTasks({ status: TaskStatus.Pending })

      const params = new URLSearchParams()
      params.append('status', 'pending')
      expect(mockGet).toHaveBeenCalledWith('/cron/queue', { params })
    })

    it('should filter tasks by jobId', async () => {
      const { getTasks } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { tasks: [], total: 0 } },
      })

      await getTasks({ jobId: 'job-1' })

      const params = new URLSearchParams()
      params.append('job_id', 'job-1')
      expect(mockGet).toHaveBeenCalledWith('/cron/queue', { params })
    })

    it('should apply pagination params', async () => {
      const { getTasks } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { tasks: [], total: 0 } },
      })

      await getTasks({ page: 2, limit: 10 })

      const params = new URLSearchParams()
      params.append('page', '2')
      params.append('limit', '10')
      expect(mockGet).toHaveBeenCalledWith('/cron/queue', { params })
    })

    it('should combine multiple filters', async () => {
      const { getTasks } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { tasks: [], total: 0 } },
      })

      await getTasks({ status: TaskStatus.Completed, jobId: 'job-1', page: 1, limit: 5 })

      const callParams = mockGet.mock.calls[0][1]?.params
      expect(callParams?.get('status')).toBe('completed')
      expect(callParams?.get('job_id')).toBe('job-1')
      expect(callParams?.get('page')).toBe('1')
      expect(callParams?.get('limit')).toBe('5')
    })
  })

  describe('createTask', () => {
    it('should create task with all fields', async () => {
      const { createTask } = await import('../cron')
      const createDto: CreateTaskDTO = {
        jobId: 'job-1',
        taskType: 'text',
        payload: { message: 'Hello' },
        priority: 5,
        maxRetries: 3,
      }

      const mockTask: TaskQueueItem = {
        id: 'task-1',
        jobId: 'job-1',
        taskType: 'text',
        payload: { message: 'Hello' },
        priority: 5,
        status: TaskStatus.Pending,
        retryCount: 0,
        maxRetries: 3,
        errorMessage: null,
        result: null,
        createdAt: '2024-01-01T00:00:00Z',
        startedAt: null,
        completedAt: null,
      }

      mockPost.mockResolvedValueOnce({
        data: { data: mockTask },
      })

      const result = await createTask(createDto)

      expect(mockPost).toHaveBeenCalledWith('/cron/queue', {
        job_id: 'job-1',
        task_type: 'text',
        payload: '{"message":"Hello"}',
        priority: 5,
        max_retries: 3,
      })
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('task-1')
    })

    it('should default priority to 0 and maxRetries to 3', async () => {
      const { createTask } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: {} },
      })

      await createTask({
        jobId: 'job-1',
        taskType: 'text',
        payload: {},
      })

      expect(mockPost).toHaveBeenCalledWith('/cron/queue', expect.objectContaining({
        priority: 0,
        max_retries: 3,
      }))
    })

    it('should stringify object payload', async () => {
      const { createTask } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: {} },
      })

      await createTask({
        jobId: 'job-1',
        taskType: 'text',
        payload: { key: 'value' },
      })

      expect(mockPost).toHaveBeenCalledWith('/cron/queue', expect.objectContaining({
        payload: '{"key":"value"}',
      }))
    })

    it('should keep string payload as-is', async () => {
      const { createTask } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: {} },
      })

      await createTask({
        jobId: 'job-1',
        taskType: 'text',
        payload: 'already stringified' as unknown as Record<string, unknown>,
      })

      expect(mockPost).toHaveBeenCalledWith('/cron/queue', expect.objectContaining({
        payload: 'already stringified',
      }))
    })
  })

  describe('updateTask', () => {
    it('should update task and return updated data', async () => {
      const { updateTask } = await import('../cron')
      const updates: UpdateTaskDTO = {
        status: TaskStatus.Completed,
        result: { success: true },
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      const result = await updateTask('task-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/queue/task-1', updates)
      expect(result.success).toBe(true)
    })
  })

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const { deleteTask } = await import('../cron')
      mockDelete.mockResolvedValueOnce({})

      const result = await deleteTask('task-1')

      expect(mockDelete).toHaveBeenCalledWith('/cron/queue/task-1')
      expect(result.success).toBe(true)
    })
  })

  describe('retryTask', () => {
    it('should retry task and return updated task', async () => {
      const { retryTask } = await import('../cron')
      const mockTask: TaskQueueItem = {
        id: 'task-1',
        jobId: 'job-1',
        taskType: 'text',
        payload: {},
        priority: 0,
        status: TaskStatus.Pending,
        retryCount: 1,
        maxRetries: 3,
        errorMessage: null,
        result: null,
        createdAt: '2024-01-01T00:00:00Z',
        startedAt: null,
        completedAt: null,
      }

      mockPost.mockResolvedValueOnce({
        data: { data: mockTask },
      })

      const result = await retryTask('task-1')

      expect(mockPost).toHaveBeenCalledWith('/cron/queue/task-1/retry')
      expect(result.success).toBe(true)
      expect(result.data?.retryCount).toBe(1)
    })
  })

  describe('getLogs', () => {
    it('should return logs without filters', async () => {
      const { getLogs } = await import('../cron')
      const mockLogs: ExecutionLog[] = [
        {
          id: 'log-1',
          jobId: 'job-1',
          triggerType: TriggerType.Manual,
          status: TaskStatus.Completed,
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:01:00Z',
          durationMs: 60000,
          tasksExecuted: 1,
          tasksSucceeded: 1,
          tasksFailed: 0,
          errorSummary: null,
          logDetail: null,
        },
      ]

      mockGet.mockResolvedValueOnce({
        data: { data: { logs: mockLogs, total: 1 } },
      })

      const result = await getLogs()

      expect(mockGet).toHaveBeenCalledWith('/cron/logs', { params: new URLSearchParams() })
      expect(result.success).toBe(true)
      expect(result.data?.logs).toEqual(mockLogs)
    })

    it('should filter logs by jobId', async () => {
      const { getLogs } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { logs: [], total: 0 } },
      })

      await getLogs({ jobId: 'job-1' })

      const params = new URLSearchParams()
      params.append('job_id', 'job-1')
      expect(mockGet).toHaveBeenCalledWith('/cron/logs', { params })
    })

    it('should filter logs by status', async () => {
      const { getLogs } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { logs: [], total: 0 } },
      })

      await getLogs({ status: 'failed' })

      const params = new URLSearchParams()
      params.append('status', 'failed')
      expect(mockGet).toHaveBeenCalledWith('/cron/logs', { params })
    })

    it('should limit log results', async () => {
      const { getLogs } = await import('../cron')
      mockGet.mockResolvedValueOnce({
        data: { data: { logs: [], total: 0 } },
      })

      await getLogs({ limit: 50 })

      const params = new URLSearchParams()
      params.append('limit', '50')
      expect(mockGet).toHaveBeenCalledWith('/cron/logs', { params })
    })
  })

  describe('getLogById', () => {
    it('should return single log detail', async () => {
      const { getLogById } = await import('../cron')
      const mockLog: ExecutionLog = {
        id: 'log-1',
        jobId: 'job-1',
        triggerType: TriggerType.Manual,
        status: TaskStatus.Completed,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        tasksExecuted: 1,
        tasksSucceeded: 1,
        tasksFailed: 0,
        errorSummary: null,
        logDetail: 'Detailed log info',
      }

      mockGet.mockResolvedValueOnce({
        data: { data: mockLog },
      })

      const result = await getLogById('log-1')

      expect(mockGet).toHaveBeenCalledWith('/cron/logs/log-1')
      expect(result.success).toBe(true)
      expect(result.data?.logDetail).toBe('Detailed log info')
    })
  })

  describe('validateWorkflow', () => {
    it('should validate workflow with nodes and edges', async () => {
      const { validateWorkflow } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: { valid: true } },
      })

      const result = await validateWorkflow({ nodes: [], edges: [] })

      expect(mockPost).toHaveBeenCalledWith('/cron/workflow/validate', { nodes: [], edges: [] })
      expect(result.success).toBe(true)
      expect(result.data?.valid).toBe(true)
    })

    it('should return validation errors', async () => {
      const { validateWorkflow } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: { valid: false, errors: ['Node 1 has no outgoing edge'] } },
      })

      const result = await validateWorkflow({ nodes: [{ id: 'node-1' } as any], edges: [] })

      expect(result.success).toBe(true)
      expect(result.data?.valid).toBe(false)
      expect(result.data?.errors).toContain('Node 1 has no outgoing edge')
    })

    it('should accept workflow_json format', async () => {
      const { validateWorkflow } = await import('../cron')
      mockPost.mockResolvedValueOnce({
        data: { data: { valid: true } },
      })

      const result = await validateWorkflow({ workflow_json: '{"nodes":[],"edges":[]}' })

      expect(mockPost).toHaveBeenCalledWith('/cron/workflow/validate', { workflow_json: '{"nodes":[],"edges":[]}' })
      expect(result.success).toBe(true)
    })
  })

  describe('getWorkflowTemplates', () => {
    it('should return templates list', async () => {
      const { getWorkflowTemplates } = await import('../cron')
      const mockTemplates: WorkflowTemplate[] = [
        {
          id: 'template-1',
          name: 'Basic Workflow',
          description: 'Simple workflow template',
          nodesJson: '[]',
          edgesJson: '[]',
          createdAt: '2024-01-01T00:00:00Z',
          isTemplate: true,
        },
      ]

      mockGet.mockResolvedValueOnce({
        data: { data: { templates: mockTemplates, total: 1 } },
      })

      const result = await getWorkflowTemplates()

      expect(mockGet).toHaveBeenCalledWith('/cron/workflow/templates')
      expect(result.success).toBe(true)
      expect(result.data?.templates).toEqual(mockTemplates)
    })
  })

  describe('createWorkflowTemplate', () => {
    it('should create template with all fields', async () => {
      const { createWorkflowTemplate } = await import('../cron')
      const createDto: CreateWorkflowTemplateDTO = {
        name: 'New Template',
        description: 'Template description',
        nodesJson: '[{"id":"node-1"}]',
        edgesJson: '[{"id":"edge-1"}]',
      }

      const mockTemplate: WorkflowTemplate = {
        id: 'template-1',
        name: 'New Template',
        description: 'Template description',
        nodesJson: '[{"id":"node-1"}]',
        edgesJson: '[{"id":"edge-1"}]',
        createdAt: '2024-01-01T00:00:00Z',
        isTemplate: true,
      }

      mockPost.mockResolvedValueOnce({
        data: { data: mockTemplate },
      })

      const result = await createWorkflowTemplate(createDto)

      expect(mockPost).toHaveBeenCalledWith('/cron/workflow/templates', {
        name: 'New Template',
        description: 'Template description',
        nodes_json: '[{"id":"node-1"}]',
        edges_json: '[{"id":"edge-1"}]',
        is_template: true,
      })
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('template-1')
    })
  })

  describe('updateWorkflowTemplate', () => {
    it('should update template fields', async () => {
      const { updateWorkflowTemplate } = await import('../cron')
      const updates: UpdateWorkflowTemplateDTO = {
        name: 'Updated Template',
        nodesJson: '[{"id":"new-node"}]',
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      await updateWorkflowTemplate('template-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/workflow/templates/template-1', {
        name: 'Updated Template',
        nodes_json: '[{"id":"new-node"}]',
      })
    })

    it('should transform field names correctly', async () => {
      const { updateWorkflowTemplate } = await import('../cron')
      const updates: UpdateWorkflowTemplateDTO = {
        nodesJson: 'nodes',
        edgesJson: 'edges',
      }

      mockPut.mockResolvedValueOnce({
        data: { data: {} },
      })

      await updateWorkflowTemplate('template-1', updates)

      expect(mockPut).toHaveBeenCalledWith('/cron/workflow/templates/template-1', {
        nodes_json: 'nodes',
        edges_json: 'edges',
      })
    })
  })

  describe('deleteWorkflowTemplate', () => {
    it('should delete template successfully', async () => {
      const { deleteWorkflowTemplate } = await import('../cron')
      mockDelete.mockResolvedValueOnce({})

      const result = await deleteWorkflowTemplate('template-1')

      expect(mockDelete).toHaveBeenCalledWith('/cron/workflow/templates/template-1')
      expect(result.success).toBe(true)
    })
  })
})