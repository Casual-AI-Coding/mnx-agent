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
    this.initialDelayMs = config.initialDelayMs ?? 1000
    this.maxDelayMs = config.maxDelayMs ?? 5 * 60 * 1000
    this.multiplier = config.multiplier ?? 2
    this.jitterMs = config.jitterMs ?? 1000
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
    initialDelayMs: 1000,
    maxDelayMs: 5 * 60 * 1000,
    multiplier: 2,
    jitterMs: 1000,
  },
  TASK_POLLING: {
    initialDelayMs: 2000,
    maxDelayMs: 30 * 1000,
    multiplier: 1.5,
    jitterMs: 500,
  },
  WORKFLOW_NODE: {
    initialDelayMs: 1000,
    maxDelayMs: 60 * 1000,
    multiplier: 2,
    jitterMs: 100,
  },
} as const