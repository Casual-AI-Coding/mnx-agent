import type { TaskStatus } from '../types.js'
import type { CreateTaskQueueItem, TaskQueueItem, UpdateTaskQueueItem } from '../types.js'
import type { TaskRepository } from '../../repositories/index.js'

export class TaskService {
  constructor(private readonly taskRepo: TaskRepository) {}

  async getAllTasks(options?: { status?: TaskStatus; ownerId?: string; jobId?: string; limit?: number; offset?: number }): Promise<{ tasks: TaskQueueItem[]; total: number }> {
    return this.taskRepo.listTasks(options)
  }

  async getTaskById(id: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.getById(id, ownerId)
  }

  async getTaskPayload(id: string): Promise<{ payload: string; result: string | null } | null> {
    return this.taskRepo.getPayload(id)
  }

  async createTask(task: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    return this.taskRepo.create(task, ownerId)
  }

  async updateTask(id: string, updates: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.update(id, updates, ownerId)
  }

  async deleteTask(id: string, ownerId?: string): Promise<boolean> {
    return this.taskRepo.delete(id, ownerId)
  }

  async getPendingTasksByJob(jobId: string | null, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByJob(jobId, limit, ownerId)
  }

  async getPendingTaskCount(): Promise<number> {
    return this.taskRepo.getPendingCount()
  }

  async getPendingTasksByType(taskType: string, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByType(taskType, limit, ownerId)
  }

  async getRunningTaskCount(): Promise<number> {
    return this.taskRepo.getRunningCount()
  }

  async getFailedTaskCount(): Promise<number> {
    return this.taskRepo.getFailedCount()
  }

  async getTaskCountsByStatus(ownerId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    return this.taskRepo.getCountsByStatus(ownerId)
  }

  async markTaskRunning(id: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markRunning(id)
  }

  async markTaskCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markCompleted(id, result, ownerId)
  }

  async markTaskFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markFailed(id, error, ownerId)
  }

  async getTasksByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getByJobId(jobId, ownerId)
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, updates?: { started_at?: string | null; completed_at?: string | null; error_message?: string | null; result?: string | null }, ownerId?: string): Promise<void> {
    return this.taskRepo.updateStatus(taskId, status, updates, ownerId)
  }

  async updateTasksStatusBatch(taskIds: string[], status: TaskStatus, ownerId?: string): Promise<number> {
    return this.taskRepo.updateStatusBatch(taskIds, status, ownerId)
  }

  async getPendingTasks(jobId: string, limit: number): Promise<TaskQueueItem[]> {
    return this.getPendingTasksByJob(jobId, limit)
  }

  async getQueueStats(jobId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    return this.taskRepo.getQueueStats(jobId)
  }

  async createTaskQueueItem(data: { job_id?: string | null; task_type: string; payload: string; priority?: number; status?: string; max_retries?: number }): Promise<string> {
    const item = await this.createTask({
      job_id: data.job_id ?? null,
      task_type: data.task_type,
      payload: data.payload,
      priority: data.priority ?? 0,
      status: (data.status as TaskStatus) ?? 'pending',
      max_retries: data.max_retries ?? 3,
    })

    return item.id
  }
}
