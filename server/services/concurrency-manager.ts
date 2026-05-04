// server/services/concurrency-manager.ts

import type { IConcurrencyManager } from './interfaces/concurrency-manager.interface.js'
import { getLogger } from '../lib/logger.js'

const logger = getLogger()

export interface ConcurrencyManagerOptions {
  maxConcurrent?: number
}

/**
 * ConcurrencyManager - Manages concurrent job execution limits
 *
 * ## Thread Safety in Node.js
 *
 * This implementation is safe for Node.js's single-threaded event loop because:
 *
 * 1. **Atomic synchronous operations**: The check (`runningJobs.size >= maxConcurrent`)
 *    and mutation (`runningJobs.add(jobId)`) are synchronous with no async boundaries
 *    between them, so they execute atomically in a single tick.
 *
 * 2. **No TOCTOU vulnerability**: In Node.js, the event loop cannot interleave other
 *    operations between the size check and the Set add operation. Only an `await`
 *    or similar yielding operation would create an interleaving point.
 *
 * 3. **Single-threaded guarantee**: Node.js processes one event loop tick at a time.
 *    Even with multiple async jobs calling `acquireSlot()`, each call completes
 *    fully before the next can start.
 *
 * ## When This Would NOT Be Safe
 *
 * This pattern would be unsafe in:
 * - Multi-threaded environments (worker_threads, cluster)
 * - If the check involved I/O or async operations
 * - If the function were broken up by `await` between check and add
 */
export class ConcurrencyManager implements IConcurrencyManager {
  private runningJobs: Set<string> = new Set()
  private maxConcurrent: number
  private shuttingDown: boolean = false

  constructor(options?: ConcurrencyManagerOptions) {
    this.maxConcurrent = options?.maxConcurrent ?? 5
  }

  async acquireSlot(jobId: string): Promise<boolean> {
    if (this.shuttingDown) {
      logger.warn(`[ConcurrencyManager] System shutting down, skipping job ${jobId}`)
      return false
    }

    if (this.runningJobs.size >= this.maxConcurrent) {
      logger.warn(`[ConcurrencyManager] Max concurrent jobs (${this.maxConcurrent}) reached, skipping job ${jobId}`)
      return false
    }

    this.runningJobs.add(jobId)
    return true
  }

  releaseSlot(jobId: string): void {
    this.runningJobs.delete(jobId)
  }

  getRunningJobs(): Set<string> {
    return this.runningJobs
  }

  getRunningCount(): number {
    return this.runningJobs.size
  }

  isShuttingDown(): boolean {
    return this.shuttingDown
  }

  setShuttingDown(value: boolean): void {
    this.shuttingDown = value
  }
}