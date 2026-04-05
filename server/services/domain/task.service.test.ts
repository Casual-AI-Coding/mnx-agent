import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskService } from './task.service.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { TaskQueueItem, TaskStatus } from '../../database/types.js'

describe('TaskService', () => {
  let service: TaskService
  let mockDb: {
    createTask: ReturnType<typeof vi.fn>
    getTaskById: ReturnType<typeof vi.fn>
    updateTask: ReturnType<typeof vi.fn>
    deleteTask: ReturnType<typeof vi.fn>
    getAllTasks: ReturnType<typeof vi.fn>
    getPendingTasksByJob: ReturnType<typeof vi.fn>
    getTasksByJobId: ReturnType<typeof vi.fn>
    markTaskRunning: ReturnType<typeof vi.fn>
    markTaskCompleted: ReturnType<typeof vi.fn>
    markTaskFailed: ReturnType<typeof vi.fn>
    createDeadLetterQueueItem: ReturnType<typeof vi.fn>
    getDeadLetterQueueItems: ReturnType<typeof vi.fn>
    getDeadLetterQueueItemById: ReturnType<typeof vi.fn>
    updateDeadLetterQueueItem: ReturnType<typeof vi.fn>
    retryDeadLetterQueueItem: ReturnType<typeof vi.fn>
  }

  const mockTask: TaskQueueItem = {
    id: 'task-1',
    task_type: 'text',
    payload: '{}',
    status: 'pending' as TaskStatus,
    retry_count: 0,
    max_retries: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    mockDb = {
      createTask: vi.fn(),
      getTaskById: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      getAllTasks: vi.fn(),
      getPendingTasksByJob: vi.fn(),
      getTasksByJobId: vi.fn(),
      markTaskRunning: vi.fn(),
      markTaskCompleted: vi.fn(),
      markTaskFailed: vi.fn(),
      createDeadLetterQueueItem: vi.fn(),
      getDeadLetterQueueItems: vi.fn(),
      getDeadLetterQueueItemById: vi.fn(),
      updateDeadLetterQueueItem: vi.fn(),
      retryDeadLetterQueueItem: vi.fn(),
    }
    service = new TaskService(mockDb as unknown as DatabaseService)
  })

  describe('create', () => {
    it('should create a new task', async () => {
      mockDb.createTask.mockResolvedValue(mockTask)
      const result = await service.create({
        task_type: 'text',
        payload: '{}',
        status: 'pending' as TaskStatus,
        max_retries: 3,
      }, 'owner-1')
      expect(mockDb.createTask).toHaveBeenCalled()
      expect(result).toEqual(mockTask)
    })
  })

  describe('getById', () => {
    it('should return task by id', async () => {
      mockDb.getTaskById.mockResolvedValue(mockTask)
      const result = await service.getById('task-1', 'owner-1')
      expect(mockDb.getTaskById).toHaveBeenCalledWith('task-1', 'owner-1')
      expect(result).toEqual(mockTask)
    })

    it('should return null if not found', async () => {
      mockDb.getTaskById.mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update an existing task', async () => {
      const updatedTask = { ...mockTask, status: 'running' as TaskStatus }
      mockDb.updateTask.mockResolvedValue(updatedTask)
      const result = await service.update('task-1', { status: 'running' as TaskStatus })
      expect(result.status).toBe('running')
    })

    it('should throw if task not found', async () => {
      mockDb.updateTask.mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow('Task not found: nonexistent')
    })
  })

  describe('delete', () => {
    it('should delete a task', async () => {
      mockDb.deleteTask.mockResolvedValue(true)
      await service.delete('task-1', 'owner-1')
      expect(mockDb.deleteTask).toHaveBeenCalledWith('task-1', 'owner-1')
    })

    it('should throw if task not found', async () => {
      mockDb.deleteTask.mockResolvedValue(false)
      await expect(service.delete('nonexistent')).rejects.toThrow('Task not found: nonexistent')
    })
  })

  describe('getAll', () => {
    it('should return tasks with pagination', async () => {
      mockDb.getAllTasks.mockResolvedValue({ tasks: [mockTask], total: 1 })
      const result = await service.getAll({ limit: 10, offset: 0 })
      expect(result.tasks).toEqual([mockTask])
      expect(result.total).toBe(1)
    })
  })

  describe('getPending', () => {
    it('should return pending tasks', async () => {
      mockDb.getPendingTasksByJob.mockResolvedValue([mockTask])
      const result = await service.getPending(10)
      expect(result).toEqual([mockTask])
    })
  })

  describe('getByStatus', () => {
    it('should return tasks by status', async () => {
      mockDb.getAllTasks.mockResolvedValue({ tasks: [mockTask], total: 1 })
      const result = await service.getByStatus('pending' as TaskStatus)
      expect(result).toEqual([mockTask])
    })
  })

  describe('markRunning', () => {
    it('should mark task as running', async () => {
      const runningTask = { ...mockTask, status: 'running' as TaskStatus }
      mockDb.markTaskRunning.mockResolvedValue(runningTask)
      const result = await service.markRunning('task-1')
      expect(result?.status).toBe('running')
    })
  })

  describe('markCompleted', () => {
    it('should mark task as completed', async () => {
      const completedTask = { ...mockTask, status: 'completed' as TaskStatus, result: 'success' }
      mockDb.markTaskCompleted.mockResolvedValue(completedTask)
      const result = await service.markCompleted('task-1', 'success')
      expect(result?.status).toBe('completed')
    })
  })

  describe('markFailed', () => {
    it('should mark task as failed', async () => {
      const failedTask = { ...mockTask, status: 'failed' as TaskStatus, error_message: 'error' }
      mockDb.markTaskFailed.mockResolvedValue(failedTask)
      const result = await service.markFailed('task-1', 'error')
      expect(result?.status).toBe('failed')
    })
  })

  describe('moveToDeadLetter', () => {
    it('should move task to dead letter queue', async () => {
      mockDb.getTaskById.mockResolvedValue(mockTask)
      mockDb.createDeadLetterQueueItem.mockResolvedValue('dlq-1')
      mockDb.deleteTask.mockResolvedValue(true)
      await service.moveToDeadLetter('task-1', 'error message')
      expect(mockDb.createDeadLetterQueueItem).toHaveBeenCalled()
      expect(mockDb.deleteTask).toHaveBeenCalledWith('task-1', undefined)
    })

    it('should throw if task not found', async () => {
      mockDb.getTaskById.mockResolvedValue(null)
      await expect(service.moveToDeadLetter('nonexistent', 'error')).rejects.toThrow('Task not found: nonexistent')
    })
  })

  describe('getByJobId', () => {
    it('should return tasks by job id', async () => {
      mockDb.getTasksByJobId.mockResolvedValue([mockTask])
      const result = await service.getByJobId('job-1')
      expect(result).toEqual([mockTask])
    })
  })

  describe('getDeadLetterQueue', () => {
    it('should return dead letter queue items', async () => {
      mockDb.getDeadLetterQueueItems.mockResolvedValue([])
      const result = await service.getDeadLetterQueue('owner-1', 50)
      expect(mockDb.getDeadLetterQueueItems).toHaveBeenCalledWith('owner-1', 50)
      expect(result).toEqual([])
    })
  })

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      mockDb.getTaskById.mockResolvedValue(mockTask)
      mockDb.updateTask.mockResolvedValue({ ...mockTask, retry_count: 1 })
      await service.incrementRetryCount('task-1')
      expect(mockDb.updateTask).toHaveBeenCalledWith('task-1', { retry_count: 1 })
    })

    it('should throw if task not found', async () => {
      mockDb.getTaskById.mockResolvedValue(null)
      await expect(service.incrementRetryCount('nonexistent')).rejects.toThrow('Task not found: nonexistent')
    })
  })
})