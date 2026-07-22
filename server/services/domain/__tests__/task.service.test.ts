import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskService } from '../task.service.js'
import type { TaskRepository } from '../../repositories/task-repository.js'
import type { DeadLetterRepository } from '../../repositories/dead-letter-repository.js'
import type { TaskQueueItem } from '../../database/types.js'

function makeMockTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-1',
    job_id: null,
    task_type: 'test',
    payload: { key: 'value' },
    status: 'pending',
    priority: 0,
    retry_count: 0,
    max_retries: 3,
    owner_id: 'owner-1',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    ...overrides,
  } as TaskQueueItem
}

function makeTaskRepoMock() {
  return {
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
    getPendingByType: vi.fn(),
    getQueueStats: vi.fn(),
  }
}

function makeDeadLetterRepoMock() {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    listItems: vi.fn(),
    update: vi.fn(),
    markResolved: vi.fn(),
  }
}

describe('TaskService', () => {
  let taskRepo: ReturnType<typeof makeTaskRepoMock>
  let deadLetterRepo: ReturnType<typeof makeDeadLetterRepoMock>
  let service: TaskService

  beforeEach(() => {
    taskRepo = makeTaskRepoMock()
    deadLetterRepo = makeDeadLetterRepoMock()
    service = new TaskService(taskRepo as unknown as TaskRepository, deadLetterRepo as unknown as DeadLetterRepository)
  })

  describe('getAll', () => {
    it('passes explicit limit and offset to repository', async () => {
      taskRepo.listTasks.mockResolvedValue({ tasks: [], total: 0 })
      await service.getAll({ limit: 50, offset: 10 })
      expect(taskRepo.listTasks).toHaveBeenCalledWith({
        status: undefined,
        ownerId: undefined,
        jobId: undefined,
        limit: 50,
        offset: 10,
      })
    })

    it('applies default limit and offset when omitted', async () => {
      taskRepo.listTasks.mockResolvedValue({ tasks: [], total: 0 })
      await service.getAll({})
      expect(taskRepo.listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 })
      )
    })
  })

  describe('getPending', () => {
    it('passes explicit limit to getPendingByJob', async () => {
      taskRepo.getPendingByJob.mockResolvedValue([])
      await service.getPending(25)
      expect(taskRepo.getPendingByJob).toHaveBeenCalledWith(null, 25)
    })

    it('applies default limit of 10 when omitted', async () => {
      taskRepo.getPendingByJob.mockResolvedValue([])
      await service.getPending()
      expect(taskRepo.getPendingByJob).toHaveBeenCalledWith(null, 10)
    })
  })

  describe('moveToDeadLetter', () => {
    it('throws when task is not found', async () => {
      taskRepo.getById.mockResolvedValue(null)
      await expect(service.moveToDeadLetter('missing', 'error')).rejects.toThrow('Task not found')
    })

    it('parses string payload via JSON.parse', async () => {
      const task = makeMockTask({ payload: '{"parsed":true}' as unknown as Record<string, unknown> })
      taskRepo.getById.mockResolvedValue(task)
      deadLetterRepo.create.mockResolvedValue({})
      await service.moveToDeadLetter('task-1', 'some error')
      expect(deadLetterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { parsed: true } })
      )
    })

    it('passes job_id to dlq data when task has one', async () => {
      const task = makeMockTask({ job_id: 'job-99' })
      taskRepo.getById.mockResolvedValue(task)
      deadLetterRepo.create.mockResolvedValue({})
      await service.moveToDeadLetter('task-1', 'error')
      expect(deadLetterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ job_id: 'job-99' })
      )
    })

    it('passes undefined job_id when task has none', async () => {
      const task = makeMockTask({ job_id: null })
      taskRepo.getById.mockResolvedValue(task)
      deadLetterRepo.create.mockResolvedValue({})
      await service.moveToDeadLetter('task-1', 'error')
      expect(deadLetterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ job_id: undefined })
      )
    })
  })

  describe('retryFromDeadLetter', () => {
    it('throws when dead letter item is not found', async () => {
      deadLetterRepo.getById.mockResolvedValue(null)
      await expect(service.retryFromDeadLetter('missing')).rejects.toThrow('Dead letter queue item not found')
    })
  })

  describe('incrementRetryCount', () => {
    it('throws when task is not found', async () => {
      taskRepo.getById.mockResolvedValue(null)
      await expect(service.incrementRetryCount('missing')).rejects.toThrow('Task not found')
    })

    it('increments retry count by one', async () => {
      const task = makeMockTask({ retry_count: 2 })
      taskRepo.getById.mockResolvedValue(task)
      await service.incrementRetryCount('task-1')
      expect(taskRepo.update).toHaveBeenCalledWith('task-1', { retry_count: 3 })
    })
  })

  describe('update', () => {
    it('throws when task is not found', async () => {
      taskRepo.update.mockResolvedValue(null)
      await expect(service.update('missing', { status: 'running' })).rejects.toThrow('Task not found')
    })
  })

  describe('delete', () => {
    it('throws when task is not found', async () => {
      taskRepo.delete.mockResolvedValue(null)
      await expect(service.delete('missing')).rejects.toThrow('Task not found')
    })
  })

  describe('getDeadLetterQueue', () => {
    it('applies default limit of 50 when omitted', async () => {
      deadLetterRepo.listItems.mockResolvedValue([])
      await service.getDeadLetterQueue()
      expect(deadLetterRepo.listItems).toHaveBeenCalledWith(undefined, 50)
    })
  })
})
