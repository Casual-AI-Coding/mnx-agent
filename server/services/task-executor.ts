import type { DatabaseService } from '../database/service-async.js'
import { MiniMaxClient } from '../lib/minimax/index.js'
import { TASK_TIMEOUTS, POLLING_CONFIG } from '../config/timeouts.js'
import type { TaskResult, ITaskExecutor } from '../types/task.js'

export type { DatabaseService }
export type { TaskResult }

const DEFAULT_TIMEOUT = TASK_TIMEOUTS.SYNC_TASK_MS
const ASYNC_TIMEOUT = TASK_TIMEOUTS.ASYNC_TASK_MS

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, taskType: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${taskType} task timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    ),
  ])
}

export class TaskExecutor implements ITaskExecutor {
  private client: MiniMaxClient
  private db: DatabaseService

  private readonly directMethodRegistry: Record<string, (payload: Record<string, unknown>) => Promise<unknown>> = {
    text: (payload) => this.client.chatCompletion(payload),
    voice_sync: (payload) => this.client.textToAudioSync(payload),
    image: (payload) => this.client.imageGeneration(payload),
    music: (payload) => this.client.musicGeneration(payload),
  }

  constructor(client: MiniMaxClient, db: DatabaseService) {
    this.client = client
    this.db = db
  }

  async executeTask(taskType: string, payload: Record<string, unknown>): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      let result: unknown
      const isAsyncTask = taskType === 'voice_async' || taskType === 'video'
      const timeout = isAsyncTask ? ASYNC_TIMEOUT : DEFAULT_TIMEOUT

      if (taskType === 'voice_async') {
        result = await withTimeout(
          this.executeWithPolling(
            () => this.client.textToAudioAsync(payload),
            (taskId: string) => this.client.textToAudioAsyncStatus(taskId),
            'voice_async'
          ),
          timeout,
          taskType
        )
      } else if (taskType === 'video') {
        result = await withTimeout(
          this.executeWithPolling(
            () => this.client.videoGeneration(payload),
            (taskId: string) => this.client.videoGenerationStatus(taskId),
            'video'
          ),
          timeout,
          taskType
        )
      } else {
        const method = this.directMethodRegistry[taskType]
        if (!method) {
          return {
            success: false,
            error: `Unknown task type: ${taskType}`,
            durationMs: Date.now() - startTime,
          }
        }
        result = await withTimeout(method(payload), timeout, taskType)
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
const deadline = startTime + POLLING_CONFIG.MAX_DURATION_MS
  let currentInterval = POLLING_CONFIG.INITIAL_INTERVAL_MS

    while (Date.now() < deadline) {
      // Apply exponential backoff with jitter
      const jitter = Math.random() * 1000
      await this.delay(currentInterval + jitter)

      // Exponentially increase interval for next iteration
      currentInterval = Math.min(
        currentInterval * POLLING_CONFIG.BACKOFF_MULTIPLIER,
        POLLING_CONFIG.MAX_INTERVAL_MS
      )

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

    throw new Error(`${taskType} task ${taskId} timed out after ${POLLING_CONFIG.MAX_DURATION_MS / 1000}s`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export function createTaskExecutor(client: MiniMaxClient, db: DatabaseService): TaskExecutor {
  return new TaskExecutor(client, db)
}
