// server/services/retry-manager.ts

import { RETRY_TIMEOUTS } from '../config/timeouts.js'
import type { IRetryManager } from './interfaces/retry-manager.interface.js'

export class RetryManager implements IRetryManager {
  private readonly maxRetryDelayMs = RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS
  private readonly baseDelayMs = RETRY_TIMEOUTS.BASE_DELAY_MS
  private readonly jitterMs = RETRY_TIMEOUTS.JITTER_MS

  getRetryDelay(retryCount: number): number {
    const baseDelay = this.baseDelayMs * Math.pow(2, retryCount)
    const jitter = Math.random() * this.jitterMs
    return Math.min(baseDelay + jitter, this.maxRetryDelayMs)
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export function createRetryManager(): RetryManager {
  return new RetryManager()
}