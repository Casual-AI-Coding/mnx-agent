import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskRepository, TaskListOptions } from '../task-repository'
import { DatabaseConnection } from '../../database/connection'
import { TaskStatus } from '../../database/types'
import type { TaskQueueRow, CreateTaskQueueItem, UpdateTaskQueueItem } from '../../database/types'

describe('TaskRepository', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('listTasks', () => {
    it('should return paginated tasks with count', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '25' }] as any)
        .mockResolvedValueOnce([
          { id: 'task-1', job_id: 'job-1', task_type: 'text', status: 'pending', payload: '{}', priority: 0, retry_count: 0, max_retries: 3, created_at: '2026-04-20' },
          { id: 'task-2', job_id: 'job-1', task_type: 'image', status: 'pending', payload: '{}', priority: 1, retry_count: 0, max_retries: 3, created_at: '2026-04-20' },
        ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.listTasks({ limit: 10, offset: 0 })

      expect(result.total).toBe(25)
      expect(result.tasks).toHaveLength(2)
    })

    it('should filter by status', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.listTasks({ status: TaskStatus.PENDING })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.arrayContaining(['pending'])
      )
    })

    it('should filter by ownerId', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.listTasks({ ownerId: 'user-123' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $'),
        expect.arrayContaining(['user-123'])
      )
    })

    it('should filter by jobId', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.listTasks({ jobId: 'job-abc' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('job_id = $'),
        expect.arrayContaining(['job-abc'])
      )
    })

    it('should combine all filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.listTasks({
        status: TaskStatus.PENDING,
        ownerId: 'user-123',
        jobId: 'job-abc',
      })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('status = $')
      expect(queryCall[0]).toContain('owner_id = $')
      expect(queryCall[0]).toContain('job_id = $')
    })

    it('should order by priority desc, created_at asc', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.listTasks({})

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[0]).toContain('ORDER BY priority DESC, created_at ASC')
    })
  })

  describe('getPayload', () => {
    it('should return payload and result by id', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { payload: '{"prompt":"hello"}', result: '{"response":"hi"}' },
      ] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getPayload('task-1')

      expect(result).not.toBeNull()
      expect(result?.payload).toBe('{"prompt":"hello"}')
      expect(result?.result).toBe('{"response":"hi"}')
    })

    it('should return null when task not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getPayload('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create task with all fields', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-new', job_id: 'job-1', task_type: 'text', status: 'pending', payload: '{}', priority: 5, retry_count: 0, max_retries: 3, created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const taskData: CreateTaskQueueItem = {
        job_id: 'job-1',
        task_type: 'text',
        payload: '{}',
        priority: 5,
        status: TaskStatus.PENDING,
        max_retries: 3,
      }
      const result = await repo.create(taskData, 'user-123')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_queue'),
        expect.arrayContaining([
          expect.any(String), // id
          'job-1',
          'text',
          '{}',
          5,
          'pending',
          3,
          expect.any(String), // created_at
          'user-123',
        ])
      )
      expect(result.priority).toBe(5)
    })

    it('should default optional fields', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-new', job_id: null, task_type: 'image', status: 'pending', payload: '{}', priority: 0, retry_count: 0, max_retries: 3, created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const taskData: CreateTaskQueueItem = {
        task_type: 'image',
        payload: '{}',
      }
      await repo.create(taskData)

      const executeCall = mockDb.execute.mock.calls[0]
      expect(executeCall[1]).toContain(null) // job_id
      expect(executeCall[1]).toContain(0) // priority
      expect(executeCall[1]).toContain(3) // max_retries
    })
  })

  describe('update', () => {
    it('should update task fields', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'pending', retry_count: 0, payload: '{}', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'running', retry_count: 0, payload: '{}', started_at: '2026-04-20T10:00:00', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.update('task-1', { status: TaskStatus.RUNNING, started_at: '2026-04-20T10:00:00' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE task_queue SET'),
        expect.arrayContaining(['running'])
      )
      expect(result?.status).toBe('running')
    })

    it('should return null when task not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.update('non-existent', { status: TaskStatus.RUNNING })

      expect(result).toBeNull()
    })
  })

  describe('getPendingByJob', () => {
    it('should return pending tasks for specific job', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', job_id: 'job-1', task_type: 'text', status: 'pending', payload: '{}', priority: 0, retry_count: 0, created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.getPendingByJob('job-1', 10)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('job_id = $1 AND status = $2'),
        expect.arrayContaining(['job-1', 'pending'])
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', job_id: 'job-1', owner_id: 'user-123', task_type: 'text', status: 'pending', payload: '{}', priority: 0, retry_count: 0, created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.getPendingByJob('job-1', 10, 'user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $3'),
        expect.arrayContaining(['job-1', 'pending', 'user-123'])
      )
    })

    it('should return all pending tasks when jobId is null', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', job_id: null, task_type: 'text', status: 'pending', payload: '{}', priority: 1, created_at: '2026-04-20' },
        { id: 'task-2', job_id: null, task_type: 'image', status: 'pending', payload: '{}', priority: 2, created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.getPendingByJob(null, 10)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['pending'])
      )
      expect(result).toHaveLength(2)
    })
  })

  describe('getPendingCount', () => {
    it('should return count of pending tasks', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{ count: '15' }] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getPendingCount()

      expect(result).toBe(15)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        ['pending']
      )
    })
  })

  describe('getPendingByType', () => {
    it('should return pending tasks of specific type', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', task_type: 'text', status: 'pending', payload: '{}', priority: 0, created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.getPendingByType('text', 10)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('task_type = $1'),
        expect.arrayContaining(['text', 'pending'])
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.getPendingByType('image', 10, 'user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $3'),
        expect.arrayContaining(['image', 'pending', 'user-123'])
      )
    })
  })

  describe('getRunningCount', () => {
    it('should return count of running tasks', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{ count: '3' }] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getRunningCount()

      expect(result).toBe(3)
    })
  })

  describe('getFailedCount', () => {
    it('should return count of failed tasks', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{ count: '7' }] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getFailedCount()

      expect(result).toBe(7)
    })
  })

  describe('getCountsByStatus', () => {
    it('should return counts grouped by status', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { status: 'pending', count: '10' },
        { status: 'running', count: '2' },
        { status: 'completed', count: '50' },
        { status: 'failed', count: '5' },
      ] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getCountsByStatus()

      expect(result.pending).toBe(10)
      expect(result.running).toBe(2)
      expect(result.completed).toBe(50)
      expect(result.failed).toBe(5)
      expect(result.total).toBe(67)
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { status: 'pending', count: '3' },
      ] as any)

      const repo = new TaskRepository(mockDb)
      await repo.getCountsByStatus('user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $1'),
        ['user-123']
      )
    })
  })

  describe('markRunning', () => {
    it('should update status to running with started_at', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', status: 'running', started_at: '2026-04-20T10:00:00', payload: '{}', created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.markRunning('task-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("status = 'running'"),
        expect.arrayContaining([expect.any(String)]) // started_at
      )
      expect(result?.status).toBe('running')
    })
  })

  describe('markCompleted', () => {
    it('should update status to completed with result', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', status: 'completed', completed_at: '2026-04-20T10:30:00', result: '{"success":true}', payload: '{}', created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.markCompleted('task-1', '{"success":true}')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        expect.arrayContaining([expect.any(String), '{"success":true}', 'task-1'])
      )
      expect(result?.status).toBe('completed')
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', status: 'completed', owner_id: 'user-123', payload: '{}', created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.markCompleted('task-1', undefined, 'user-123')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $4'),
        expect.arrayContaining(['user-123'])
      )
    })
  })

  describe('markFailed', () => {
    it('should mark task as failed when retries exhausted', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'running', retry_count: 2, max_retries: 3, payload: '{}', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'failed', retry_count: 3, error_message: 'Max retries exceeded', payload: '{}', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.markFailed('task-1', 'Max retries exceeded')

      expect(result?.status).toBe('failed')
      expect(result?.retry_count).toBe(3)
    })

    it('should increment retry count and keep pending when retries remain', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'running', retry_count: 0, max_retries: 3, payload: '{}', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'pending', retry_count: 1, error_message: 'Temporary error', payload: '{}', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.markFailed('task-1', 'Temporary error')

      expect(result?.status).toBe('pending')
      expect(result?.retry_count).toBe(1)
    })
  })

  describe('getByJobId', () => {
    it('should return all tasks for job', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'task-1', job_id: 'job-1', task_type: 'text', status: 'completed', payload: '{}', created_at: '2026-04-20' },
        { id: 'task-2', job_id: 'job-1', task_type: 'image', status: 'pending', payload: '{}', created_at: '2026-04-20' },
      ] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      const result = await repo.getByJobId('job-1')

      expect(result).toHaveLength(2)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('job_id = $1'),
        ['job-1']
      )
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as TaskQueueRow[])

      const repo = new TaskRepository(mockDb)
      await repo.getByJobId('job-1', 'user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $2'),
        expect.arrayContaining(['job-1', 'user-123'])
      )
    })
  })

  describe('updateStatus', () => {
    it('should update status with additional fields', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([
          { id: 'task-1', status: 'pending', payload: '{}', created_at: '2026-04-20' },
        ] as TaskQueueRow[])
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new TaskRepository(mockDb)
      await repo.updateStatus('task-1', TaskStatus.RUNNING, {
        started_at: '2026-04-20T10:00:00',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['running', '2026-04-20T10:00:00', 'task-1'])
      )
    })
  })

  describe('updateStatusBatch', () => {
    it('should update status for multiple tasks', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 3 } as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.updateStatusBatch(['task-1', 'task-2', 'task-3'], TaskStatus.CANCELLED)

      expect(result).toBe(3)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['cancelled'])
      )
    })

    it('should return 0 for empty array', async () => {
      const repo = new TaskRepository(mockDb)
      const result = await repo.updateStatusBatch([], TaskStatus.CANCELLED)

      expect(result).toBe(0)
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 2 } as any)

      const repo = new TaskRepository(mockDb)
      await repo.updateStatusBatch(['task-1', 'task-2'], TaskStatus.CANCELLED, 'user-123')

      const executeCall = mockDb.execute.mock.calls[0]
      expect(executeCall[0]).toContain('owner_id = $')
    })
  })

  describe('getQueueStats', () => {
    it('should return stats for all tasks', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { status: 'pending', count: '10' },
        { status: 'running', count: '3' },
        { status: 'completed', count: '100' },
        { status: 'failed', count: '5' },
      ] as any)

      const repo = new TaskRepository(mockDb)
      const result = await repo.getQueueStats()

      expect(result.pending).toBe(10)
      expect(result.running).toBe(3)
      expect(result.completed).toBe(100)
      expect(result.failed).toBe(5)
      expect(result.total).toBe(118)
    })

    it('should filter by jobId when provided', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { status: 'pending', count: '2' },
      ] as any)

      const repo = new TaskRepository(mockDb)
      await repo.getQueueStats('job-abc')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE job_id = $1'),
        ['job-abc']
      )
    })
  })
})