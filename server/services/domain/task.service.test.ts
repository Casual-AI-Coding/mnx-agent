import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskService } from './task.service.js'
import type { TaskQueueItem, CreateTaskQueueItem, DeadLetterQueueItem } from '../../database/types.js'

describe('TaskService', () => {
  let service: TaskService
  let mockTaskRepo: Record<string, ReturnType<typeof vi.fn>>
  let mockDeadLetterRepo: Record<string, ReturnType<typeof vi.fn>>

  const mockTask: TaskQueueItem = {
    id: 'task-1',
    job_id: 'job-1',
    task_type: 'test_type',
    payload: '{}',
    priority: 0,
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    error_message: null,
    result: null,
    created_at: '2024-01-01T00:00:00Z',
    started_at: null,
    completed_at: null,
    owner_id: 'owner-1',
  }

  const mockDlqItem: DeadLetterQueueItem = {
    id: 'dlq-1',
    original_task_id: 'task-1',
    job_id: 'job-1',
    owner_id: 'owner-1',
    task_type: 'test_type',
    payload: {} as Record<string, unknown>,
    error_message: 'test error',
    retry_count: 0,
    max_retries: 3,
    failed_at: '2024-01-01T00:00:00Z',
    resolved_at: null,
    resolution: null,
    created_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    mockTaskRepo = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      listTasks: vi.fn(),
      getPendingByJob: vi.fn(),
      getByJobId: vi.fn(),
      markRunning: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
    }
    mockDeadLetterRepo = {
      create: vi.fn(),
      getById: vi.fn(),
      listItems: vi.fn(),
      update: vi.fn(),
      markResolved: vi.fn(),
    }
    service = new TaskService(mockTaskRepo as any, mockDeadLetterRepo as any)
  })

  describe('create', () => {
    it('should create a task', async () => {
      mockTaskRepo.create.mockResolvedValue(mockTask)
      const result = await service.create({ task_type: 'test', payload: '{}' }, 'owner-1')
      expect(mockTaskRepo.create).toHaveBeenCalledWith({ task_type: 'test', payload: '{}' }, 'owner-1')
      expect(result).toEqual(mockTask)
    })
  })

  describe('getById', () => {
    it('should return task by id', async () => {
      mockTaskRepo.getById.mockResolvedValue(mockTask)
      const result = await service.getById('task-1')
      expect(result).toEqual(mockTask)
    })
  })

  describe('update', () => {
    it('should update a task', async () => {
      mockTaskRepo.update.mockResolvedValue(mockTask)
      const result = await service.update('task-1', { status: 'completed' } as any)
      expect(result).toEqual(mockTask)
    })

    it('should throw if task not found', async () => {
      mockTaskRepo.update.mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow('Task not found: nonexistent')
    })
  })

  describe('delete', () => {
    it('should delete a task', async () => {
      mockTaskRepo.delete.mockResolvedValue(true)
      await service.delete('task-1')
      expect(mockTaskRepo.delete).toHaveBeenCalledWith('task-1', undefined)
    })

    it('should throw if task not found', async () => {
      mockTaskRepo.delete.mockResolvedValue(false)
      await expect(service.delete('nonexistent')).rejects.toThrow('Task not found: nonexistent')
    })
  })

  describe('getAll', () => {
    it('should return paginated tasks', async () => {
      mockTaskRepo.listTasks.mockResolvedValue({ tasks: [mockTask], total: 1 })
      const result = await service.getAll({ limit: 10 })
      expect(result).toEqual({ tasks: [mockTask], total: 1 })
    })
  })

  describe('getPending', () => {
    it('should return pending tasks', async () => {
      mockTaskRepo.getPendingByJob.mockResolvedValue([mockTask])
      const result = await service.getPending(5)
      expect(result).toEqual([mockTask])
    })
  })

  describe('moveToDeadLetter', () => {
    it('should move task to dead letter queue', async () => {
      mockTaskRepo.getById.mockResolvedValue(mockTask)
      mockDeadLetterRepo.create.mockResolvedValue(mockDlqItem)
      mockTaskRepo.delete.mockResolvedValue(true)

      await service.moveToDeadLetter('task-1', 'test error', 'owner-1')

      expect(mockDeadLetterRepo.create).toHaveBeenCalled()
      expect(mockTaskRepo.delete).toHaveBeenCalledWith('task-1', 'owner-1')
    })
  })

  describe('retryFromDeadLetter', () => {
    it('should retry a DLQ item as new task', async () => {
      mockDeadLetterRepo.getById.mockResolvedValue(mockDlqItem)
      mockTaskRepo.create.mockResolvedValue(mockTask)
      mockDeadLetterRepo.markResolved.mockResolvedValue(mockDlqItem)

      const result = await service.retryFromDeadLetter('dlq-1', 'owner-1')
      expect(result).toEqual(mockTask)
      expect(mockDeadLetterRepo.markResolved).toHaveBeenCalledWith('dlq-1', 'retried', 'owner-1')
    })
  })

  describe('getByJobId', () => {
    it('should get tasks by job', async () => {
      mockTaskRepo.getByJobId.mockResolvedValue([mockTask])
      const result = await service.getByJobId('job-1')
      expect(result).toEqual([mockTask])
    })
  })

  describe('mark* methods', () => {
    it('should mark task running', async () => {
      mockTaskRepo.markRunning.mockResolvedValue(mockTask)
      const result = await service.markRunning('task-1')
      expect(result).toEqual(mockTask)
    })

    it('should mark task completed', async () => {
      mockTaskRepo.markCompleted.mockResolvedValue(mockTask)
      const result = await service.markCompleted('task-1', '{}', 'owner-1')
      expect(result).toEqual(mockTask)
    })

    it('should mark task failed', async () => {
      mockTaskRepo.markFailed.mockResolvedValue(mockTask)
      const result = await service.markFailed('task-1', 'error', 'owner-1')
      expect(result).toEqual(mockTask)
    })
  })
})
