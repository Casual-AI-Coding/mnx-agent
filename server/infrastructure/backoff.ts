import { RETRY_TIMEOUTS, POLLING_CONFIG } from '../config/timeouts.js'

export interface BackoffConfig {
  initialDelayMs?: number
  maxDelayMs?: number
  multiplier?: number
  jitterMs?: number
}

export class BackoffCalculator {
  private readonly initialDelayMs: number
  private readonly maxDelayMs: number
  private readonly multiplier: number
  private readonly jitterMs: number

  constructor(config: BackoffConfig = {}) {
    this.initialDelayMs = config.initialDelayMs ?? RETRY_TIMEOUTS.BASE_DELAY_MS
    this.maxDelayMs = config.maxDelayMs ?? RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS
    this.multiplier = config.multiplier ?? 2
    this.jitterMs = config.jitterMs ?? RETRY_TIMEOUTS.JITTER_MS
  }

  calculate(retryCount: number): number {
    const baseDelay = this.initialDelayMs * Math.pow(this.multiplier, retryCount)
    const jitter = Math.random() * this.jitterMs
    return Math.min(baseDelay + jitter, this.maxDelayMs)
  }

  calculateWithoutJitter(retryCount: number): number {
    const delay = this.initialDelayMs * Math.pow(this.multiplier, retryCount)
    return Math.min(delay, this.maxDelayMs)
  }

  async wait(retryCount: number): Promise<void> {
    const delay = this.calculate(retryCount)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

export const DEFAULT_BACKOFF_CONFIGS = {
  QUEUE_PROCESSOR: {
    initialDelayMs: RETRY_TIMEOUTS.BASE_DELAY_MS,
    maxDelayMs: RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS,
    multiplier: 2,
    jitterMs: RETRY_TIMEOUTS.JITTER_MS,
  },
  TASK_POLLING: {
    initialDelayMs: POLLING_CONFIG.INITIAL_INTERVAL_MS,
    maxDelayMs: POLLING_CONFIG.MAX_INTERVAL_MS,
    multiplier: POLLING_CONFIG.BACKOFF_MULTIPLIER,
    jitterMs: 500,
  },
  WORKFLOW_NODE: {
    initialDelayMs: RETRY_TIMEOUTS.BASE_DELAY_MS,
    maxDelayMs: RETRY_TIMEOUTS.MAX_RETRY_DELAY_MS,
    multiplier: 2,
    jitterMs: 100,
  },
} as const