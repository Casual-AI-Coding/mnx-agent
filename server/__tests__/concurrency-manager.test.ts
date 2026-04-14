import { describe, it, expect, beforeEach } from 'vitest'
import { ConcurrencyManager, ConcurrencyManagerOptions } from '../services/concurrency-manager'

describe('ConcurrencyManager', () => {
  let manager: ConcurrencyManager

  beforeEach(() => {
    manager = new ConcurrencyManager({ maxConcurrent: 3 })
  })

  describe('acquireSlot', () => {
    it('should acquire slot when under limit', async () => {
      const result = await manager.acquireSlot('job-1')
      expect(result).toBe(true)
      expect(manager.getRunningCount()).toBe(1)
    })

    it('should reject when at limit', async () => {
      await manager.acquireSlot('job-1')
      await manager.acquireSlot('job-2')
      await manager.acquireSlot('job-3')

      const result = await manager.acquireSlot('job-4')
      expect(result).toBe(false)
      expect(manager.getRunningCount()).toBe(3)
    })

    it('should reject when shutting down', async () => {
      manager.setShuttingDown(true)
      const result = await manager.acquireSlot('job-1')
      expect(result).toBe(false)
    })
  })

  describe('releaseSlot', () => {
    it('should release slot and allow new jobs', async () => {
      await manager.acquireSlot('job-1')
      await manager.acquireSlot('job-2')
      await manager.acquireSlot('job-3')

      manager.releaseSlot('job-1')

      const result = await manager.acquireSlot('job-4')
      expect(result).toBe(true)
      expect(manager.getRunningCount()).toBe(3)
    })
  })

  describe('getRunningJobs', () => {
    it('should return set of running job ids', async () => {
      await manager.acquireSlot('job-1')
      await manager.acquireSlot('job-2')

      const running = manager.getRunningJobs()
      expect(running.has('job-1')).toBe(true)
      expect(running.has('job-2')).toBe(true)
      expect(running.size).toBe(2)
    })
  })

  describe('getRunningCount', () => {
    it('should return correct count', async () => {
      expect(manager.getRunningCount()).toBe(0)

      await manager.acquireSlot('job-1')
      expect(manager.getRunningCount()).toBe(1)

      await manager.acquireSlot('job-2')
      expect(manager.getRunningCount()).toBe(2)
    })
  })

  describe('isShuttingDown', () => {
    it('should return false by default', () => {
      expect(manager.isShuttingDown()).toBe(false)
    })

    it('should return true after setShuttingDown', () => {
      manager.setShuttingDown(true)
      expect(manager.isShuttingDown()).toBe(true)
    })
  })

  describe('default options', () => {
    it('should use default maxConcurrent of 5', async () => {
      const defaultManager = new ConcurrencyManager()
      await defaultManager.acquireSlot('job-1')
      await defaultManager.acquireSlot('job-2')
      await defaultManager.acquireSlot('job-3')
      await defaultManager.acquireSlot('job-4')
      await defaultManager.acquireSlot('job-5')

      const result = await defaultManager.acquireSlot('job-6')
      expect(result).toBe(false)
    })
  })
})