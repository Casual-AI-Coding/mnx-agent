// server/services/interfaces/dlq-auto-retry-scheduler.interface.ts

export interface AutoRetryConfig {
  enabled: boolean
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
  backoffMultiplier: number
}

export interface IDLQAutoRetryScheduler {
  /**
   * Start the auto-retry scheduler
   * Sets up periodic check of DLQ items for auto-retry
   */
  start(): void

  /**
   * Stop the auto-retry scheduler
   * Clears the timer and stops processing
   */
  stop(): void

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean

  /**
   * Get current auto-retry statistics
   * @returns Stats including enabled status, DLQ count, pending retry count
   */
  getStats(): Promise<{
    enabled: boolean
    dlqItemCount: number
    pendingRetryCount: number
    config: AutoRetryConfig
  }>
}