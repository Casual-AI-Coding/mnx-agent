// server/services/interfaces/retry-manager.interface.ts

export interface IRetryManager {
  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param retryCount - Current retry attempt number
   * @returns Delay in milliseconds
   */
  getRetryDelay(retryCount: number): number

  /**
   * Async delay helper
   * @param ms - Milliseconds to wait
   */
  delay(ms: number): Promise<void>
}