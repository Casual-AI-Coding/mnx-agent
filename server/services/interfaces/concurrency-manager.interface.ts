// server/services/interfaces/concurrency-manager.interface.ts

export interface IConcurrencyManager {
  /**
   * Attempt to acquire an execution slot for a job.
   * Returns false if max concurrent limit reached.
   */
  acquireSlot(jobId: string): Promise<boolean>
  
  /**
   * Release an execution slot after job completion.
   */
  releaseSlot(jobId: string): void
  
  /**
   * Get the set of currently running job IDs.
   */
  getRunningJobs(): Set<string>
  
  /**
   * Get count of currently running jobs.
   */
  getRunningCount(): number
  
  /**
   * Check if the system is shutting down.
   */
  isShuttingDown(): boolean
  
  /**
   * Set shutdown state to prevent new executions.
   */
  setShuttingDown(value: boolean): void
}