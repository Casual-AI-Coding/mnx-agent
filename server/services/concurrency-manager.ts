// server/services/concurrency-manager.ts

import type { IConcurrencyManager } from './interfaces/concurrency-manager.interface.js'

export interface ConcurrencyManagerOptions {
  maxConcurrent?: number
}

export class ConcurrencyManager implements IConcurrencyManager {
  private runningJobs: Set<string> = new Set()
  private maxConcurrent: number
  private shuttingDown: boolean = false

  constructor(options?: ConcurrencyManagerOptions) {
    this.maxConcurrent = options?.maxConcurrent ?? 5
  }

  async acquireSlot(jobId: string): Promise<boolean> {
    if (this.shuttingDown) {
      console.warn(`[ConcurrencyManager] System shutting down, skipping job ${jobId}`)
      return false
    }

    if (this.runningJobs.size >= this.maxConcurrent) {
      console.warn(`[ConcurrencyManager] Max concurrent jobs (${this.maxConcurrent}) reached, skipping job ${jobId}`)
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