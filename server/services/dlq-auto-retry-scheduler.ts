// server/services/dlq-auto-retry-scheduler.ts

import type { DatabaseService } from '../database/service-async.js'
import { RETRY_TIMEOUTS } from '../config/timeouts.js'
import type { AutoRetryConfig, IDLQAutoRetryScheduler } from './interfaces/dlq-auto-retry-scheduler.interface.js'
import { getLogger } from '../lib/logger.js'

const logger = getLogger()

export class DLQAutoRetryScheduler implements IDLQAutoRetryScheduler {
  private db: DatabaseService
  private config: AutoRetryConfig
  private timer: NodeJS.Timeout | null = null

  constructor(
    db: DatabaseService,
    config?: Partial<AutoRetryConfig>
  ) {
    this.db = db
    this.config = {
      enabled: config?.enabled ?? true,
      initialDelayMs: config?.initialDelayMs ?? RETRY_TIMEOUTS.BASE_DELAY_MS * 60,
      maxDelayMs: config?.maxDelayMs ?? RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS,
      maxAttempts: config?.maxAttempts ?? 3,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
    }
  }

  isRunning(): boolean {
    return this.timer !== null
  }

  start(): void {
    if (!this.config.enabled || this.timer) {
      return
    }

    logger.info('[DLQAutoRetryScheduler] Starting auto-retry scheduler')
    this.timer = setInterval(
      () => this.processAutoRetry(),
      this.config.initialDelayMs
    )
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('[DLQAutoRetryScheduler] Stopped auto-retry scheduler')
    }
  }

  private async processAutoRetry(): Promise<void> {
    try {
      const dlqItems = await this.db.getDeadLetterQueueItems(undefined, 10)
      
      for (const item of dlqItems) {
        if (item.resolved_at) continue
        
        const retryCount = item.retry_count ?? 0
        if (retryCount >= this.config.maxAttempts) {
          logger.info(`[DLQAutoRetryScheduler] DLQ item ${item.id} exceeded max attempts (${retryCount}/${this.config.maxAttempts})`)
          continue
        }

        const delayMs = Math.min(
          this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, retryCount),
          this.config.maxDelayMs
        )

        const failedAt = new Date(item.failed_at).getTime()
        const now = Date.now()
        if (now - failedAt < delayMs) {
          continue
        }

          logger.info(`[DLQAutoRetryScheduler] Auto-retrying DLQ item ${item.id} (attempt ${retryCount + 1}/${this.config.maxAttempts})`)
        
        try {
          const taskId = await this.db.retryDeadLetterQueueItem(item.id, item.owner_id ?? undefined)
          logger.info(`[DLQAutoRetryScheduler] DLQ item ${item.id} requeued as task ${taskId}`)
        } catch (error) {
          logger.error(error, `[DLQAutoRetryScheduler] Failed to retry DLQ item ${item.id}`)
        }
      }
    } catch (error) {
      logger.error(error, '[DLQAutoRetryScheduler] Error in auto-retry processing')
    }
  }

  async getStats(): Promise<{
    enabled: boolean
    dlqItemCount: number
    pendingRetryCount: number
    config: AutoRetryConfig
  }> {
    const dlqItems = await this.db.getDeadLetterQueueItems(undefined, 1000)
    const pendingRetry = dlqItems.filter(item => 
      !item.resolved_at && (item.retry_count ?? 0) < this.config.maxAttempts
    )

    return {
      enabled: this.config.enabled,
      dlqItemCount: dlqItems.length,
      pendingRetryCount: pendingRetry.length,
      config: this.config,
    }
  }
}

export function createDLQAutoRetryScheduler(
  db: DatabaseService,
  config?: Partial<AutoRetryConfig>
): DLQAutoRetryScheduler {
  return new DLQAutoRetryScheduler(db, config)
}