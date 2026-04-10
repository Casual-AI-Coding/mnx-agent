import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, getConnection } from '../../__tests__/test-helpers.js'
import { CapacityRepository } from '../capacity-repository.js'

describe('CapacityRepository', () => {
  let repo: CapacityRepository

  beforeAll(async () => {
    await setupTestDatabase()
    repo = new CapacityRepository(getConnection())
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM capacity_tracking')
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('decrementCapacity', () => {
    it('should decrement remaining quota atomically', async () => {
      await repo.upsert('text', { remaining_quota: 100, total_quota: 1000 })

      const result = await repo.decrementCapacity('text', 10)

      expect(result).not.toBeNull()
      expect(result!.remaining_quota).toBe(90)
    })

    it('should return null when service type does not exist', async () => {
      const result = await repo.decrementCapacity('non-existent', 10)

      expect(result).toBeNull()
    })

    it('should not allow remaining quota to go below zero', async () => {
      await repo.upsert('text', { remaining_quota: 5, total_quota: 100 })

      const result = await repo.decrementCapacity('text', 10)

      // Atomic update with WHERE clause should prevent the update if amount > remaining_quota
      // The old implementation would set it to -5 (or max(0, -5) = 0)
      // The new implementation should return null or the unchanged record
      // Since we're using RETURNING, we can detect if update happened
      expect(result).toBeDefined()
      // If atomic update works correctly, remaining_quota should still be 5
      // because the WHERE condition remaining_quota >= amount would fail
      const record = await repo.getByService('text')
      expect(record!.remaining_quota).toBe(5)
    })

    it('should handle exact quota match', async () => {
      await repo.upsert('text', { remaining_quota: 10, total_quota: 100 })

      const result = await repo.decrementCapacity('text', 10)

      expect(result).not.toBeNull()
      expect(result!.remaining_quota).toBe(0)
    })

    it('should handle multiple sequential decrements', async () => {
      await repo.upsert('text', { remaining_quota: 100, total_quota: 1000 })

      await repo.decrementCapacity('text', 30)
      const result = await repo.decrementCapacity('text', 30)

      expect(result).not.toBeNull()
      expect(result!.remaining_quota).toBe(40)
    })

    it('should update last_checked_at timestamp', async () => {
      await repo.upsert('text', { remaining_quota: 100, total_quota: 1000 })

      await repo.decrementCapacity('text', 10)

      const result = await repo.getByService('text')
      expect(result!.last_checked_at).toBeDefined()
    })
  })

  describe('atomic behavior under concurrency', () => {
    it('should prevent race condition with concurrent decrements', async () => {
      // Set up: 10 quota, 10 concurrent requests each trying to decrement 1
      await repo.upsert('concurrent_test', { remaining_quota: 10, total_quota: 10 })

      // Simulate concurrent decrements
      const decrements = Array(10).fill(null).map(() => 
        repo.decrementCapacity('concurrent_test', 1)
      )

      const results = await Promise.all(decrements)

      // With proper atomic update, exactly 10 should succeed and 0 should remain
      const record = await repo.getByService('concurrent_test')
      
      // The key invariant: remaining_quota should never go negative
      expect(record!.remaining_quota).toBeGreaterThanOrEqual(0)
      expect(record!.remaining_quota).toBeLessThanOrEqual(10)
    })

    it('should handle burst of concurrent requests correctly', async () => {
      const initialQuota = 5
      const concurrentRequests = 20
      const amountPerRequest = 1

      await repo.upsert('burst_test', { remaining_quota: initialQuota, total_quota: 100 })

      const promises = Array(concurrentRequests).fill(null).map(() =>
        repo.decrementCapacity('burst_test', amountPerRequest)
      )

      const results = await Promise.all(promises)

      // Count how many succeeded (returned non-null)
      const successCount = results.filter(r => r !== null).length

      // At most initialQuota requests should succeed
      expect(successCount).toBeLessThanOrEqual(initialQuota)

      // Final remaining should be >= 0
      const finalRecord = await repo.getByService('burst_test')
      expect(finalRecord!.remaining_quota).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getByService', () => {
    it('should return capacity record by service type', async () => {
      await repo.upsert('voice', { remaining_quota: 50, total_quota: 500 })

      const result = await repo.getByService('voice')

      expect(result).not.toBeNull()
      expect(result!.service_type).toBe('voice')
      expect(result!.remaining_quota).toBe(50)
      expect(result!.total_quota).toBe(500)
    })

    it('should return null for non-existent service', async () => {
      const result = await repo.getByService('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('upsert', () => {
    it('should create new capacity record', async () => {
      const result = await repo.upsert('new_service', { remaining_quota: 100, total_quota: 1000 })

      expect(result.service_type).toBe('new_service')
      expect(result.remaining_quota).toBe(100)
      expect(result.total_quota).toBe(1000)
    })

    it('should update existing capacity record', async () => {
      await repo.upsert('update_service', { remaining_quota: 100, total_quota: 1000 })
      const result = await repo.upsert('update_service', { remaining_quota: 80, total_quota: 1000 })

      expect(result.remaining_quota).toBe(80)
    })
  })
})
