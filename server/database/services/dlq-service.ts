import { toLocalISODateString } from '../../lib/date-utils.js'
import type { CreateDeadLetterQueueItem, DeadLetterQueueItem, UpdateDeadLetterQueueItem } from '../types.js'
import type { CreateTaskQueueItem, TaskQueueItem } from '../types.js'
import type { DeadLetterRepository } from '../../repositories/index.js'

export class DlqService {
  constructor(
    private readonly deadLetterRepo: DeadLetterRepository,
    private readonly createTask: (task: CreateTaskQueueItem, ownerId?: string) => Promise<TaskQueueItem>,
  ) {}

  async createDeadLetterQueueItem(data: CreateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem> {
    return this.deadLetterRepo.create(data, ownerId)
  }

  async getDeadLetterQueueItems(ownerId?: string, limit: number = 50): Promise<DeadLetterQueueItem[]> {
    return this.deadLetterRepo.listItems(ownerId, limit)
  }

  async getDeadLetterQueueItemById(id: string, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    return this.deadLetterRepo.getById(id, ownerId)
  }

  async updateDeadLetterQueueItem(id: string, data: UpdateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    return this.deadLetterRepo.update(id, data, ownerId)
  }

  async retryDeadLetterQueueItem(id: string, ownerId?: string): Promise<string> {
    const item = await this.getDeadLetterQueueItemById(id, ownerId)
    if (!item) {
      throw new Error(`Dead letter queue item not found: ${id}`)
    }

    const payload = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload)

    const newTask = await this.createTask({
      job_id: item.job_id ?? undefined,
      task_type: item.task_type,
      payload,
      max_retries: item.max_retries,
    }, item.owner_id ?? undefined)

    await this.updateDeadLetterQueueItem(id, {
      resolved_at: toLocalISODateString(),
      resolution: 'retried',
    }, ownerId)

    return newTask.id
  }
}
