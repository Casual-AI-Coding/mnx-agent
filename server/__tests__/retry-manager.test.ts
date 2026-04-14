import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RetryManager, createRetryManager } from '../services/retry-manager'

describe('RetryManager', () => {
  let retryManager: RetryManager

  beforeEach(() => {
    retryManager = createRetryManager()
  })

  describe('getRetryDelay', () => {
    it('should return exponential delay with jitter', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)

      const delay0 = retryManager.getRetryDelay(0)
      expect(delay0).toBeGreaterThan(1000)
      expect(delay0).toBeLessThan(2100)

      const delay1 = retryManager.getRetryDelay(1)
      expect(delay1).toBeGreaterThan(2000)
      expect(delay1).toBeLessThan(3100)

      const delay2 = retryManager.getRetryDelay(2)
      expect(delay2).toBeGreaterThan(4000)
      expect(delay2).toBeLessThan(5100)

      vi.restoreAllMocks()
    })

    it('should cap delay at max retry delay', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)

      const delay10 = retryManager.getRetryDelay(10)
      expect(delay10).toBeLessThanOrEqual(300000)

      const delay20 = retryManager.getRetryDelay(20)
      expect(delay20).toBeLessThanOrEqual(300000)

      vi.restoreAllMocks()
    })
  })

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now()
      await retryManager.delay(100)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(90)
    })
  })
})