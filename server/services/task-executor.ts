import type { DatabaseService } from '../database'
import { MiniMaxClient } from '../lib/minimax'

export type { DatabaseService }

export interface TaskResult {
  success: boolean
  data?: unknown
  error?: string
  durationMs: number
}

const TASK_TYPE_MAP: Record<string, string> = {
  text: 'chatCompletion',
  voice_sync: 'textToAudioSync',
  voice_async: 'textToAudioAsync',
  image: 'imageGeneration',
  music: 'musicGeneration',
  video: 'videoGeneration',
}

const POLLING_CONFIG = {
  maxDurationMs: 10 * 60 * 1000,
  intervalMs: 10 * 1000,
}

export class TaskExecutor {
  private client: MiniMaxClient
  private db: DatabaseService

  constructor(client: MiniMaxClient, db: DatabaseService) {
    this.client = client
    this.db = db
  }

  async executeTask(taskType: string, payload: Record<string, unknown>): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      const methodName = TASK_TYPE_MAP[taskType]
      if (!methodName) {
        return {
          success: false,
          error: `Unknown task type: ${taskType}`,
          durationMs: Date.now() - startTime,
        }
      }

      let result: unknown

      if (taskType === 'voice_async') {
        result = await this.executeWithPolling(
          () => this.client.textToAudioAsync(payload),
          (taskId: string) => this.client.textToAudioAsyncStatus(taskId),
          'voice_async'
        )
      } else if (taskType === 'video') {
        result = await this.executeWithPolling(
          () => this.client.videoGeneration(payload),
          (taskId: string) => this.client.videoGenerationStatus(taskId),
          'video'
        )
      } else {
        result = await this.executeDirect(methodName, payload)
      }

      const durationMs = Date.now() - startTime
      return {
        success: true,
        data: result,
        durationMs,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async executeDirect(methodName: string, payload: Record<string, unknown>): Promise<unknown> {
    const method = this.client[methodName as keyof MiniMaxClient] as (
      body: Record<string, unknown>
    ) => Promise<unknown>

    if (typeof method !== 'function') {
      throw new Error(`Method ${methodName} not found on MiniMaxClient`)
    }

    return method.call(this.client, payload)
  }

  private async executeWithPolling(
    startTask: () => Promise<unknown>,
    checkStatus: (taskId: string) => Promise<unknown>,
    taskType: string
  ): Promise<unknown> {
    const startResult = await startTask()
    const startData = startResult as { task_id?: string; data?: { task_id?: string } }

    const taskId = startData?.task_id || startData?.data?.task_id
    if (!taskId) {
      throw new Error(`${taskType} task did not return a task_id`)
    }

    const startTime = Date.now()
    const deadline = startTime + POLLING_CONFIG.maxDurationMs

    while (Date.now() < deadline) {
      await this.delay(POLLING_CONFIG.intervalMs)

      const statusResult = await checkStatus(taskId)
      const statusData = statusResult as {
        status?: string
        task_status?: string
        data?: { status?: string; task_status?: string }
      }

      const status = statusData?.status || statusData?.task_status || statusData?.data?.status

      if (status === 'completed' || status === 'success' || status === 'done') {
        return statusResult
      }

      if (status === 'failed' || status === 'error') {
        throw new Error(`${taskType} task ${taskId} failed`)
      }
    }

    throw new Error(`${taskType} task ${taskId} timed out after ${POLLING_CONFIG.maxDurationMs / 1000}s`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export function createTaskExecutor(client: MiniMaxClient, db: DatabaseService): TaskExecutor {
  return new TaskExecutor(client, db)
}