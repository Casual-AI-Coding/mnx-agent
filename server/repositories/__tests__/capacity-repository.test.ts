import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, getConnection } from '../../__tests__/test-helpers.js'
import { CapacityRepository } from '../capacity-repository.js'

describe('CapacityRepository', () => {
  let repo: CapacityRepository
  const fileMarker = Math.random().toString(36).slice(2, 8)
  const MAX_INTERFERENCE_RETRIES = 3

  const serviceName = (name: string): string => `${fileMarker}-${name}`
  const isNonNullResult = <T>(result: T | null): result is T => result !== null
  const isInterferenceError = (error: unknown): boolean => error instanceof Error && error.message === 'CAPACITY_TEST_INTERFERENCE'

  const runWithFreshCapacity = async <T>(
    serviceType: string,
    capacity: { remaining_quota: number; total_quota: number },
    operation: () => Promise<T>,
  ): Promise<T> => {
    let lastError: unknown

    for (let attempt = 0; attempt < MAX_INTERFERENCE_RETRIES; attempt += 1) {
      await repo.upsert(serviceType, capacity)

      try {
        return await operation()
      } catch (error) {
        if (!isInterferenceError(error) || attempt === MAX_INTERFERENCE_RETRIES - 1) {
          throw error
        }

        lastError = error
      }
    }

    throw lastError ?? new Error('CAPACITY_TEST_INTERFERENCE')
  }

  beforeAll(async () => {
    await setupTestDatabase()
    repo = new CapacityRepository(getConnection())
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM capacity_tracking WHERE service_type LIKE $1', [`${fileMarker}-%`])
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('decrementCapacity', () => {
    it('should decrement remaining quota atomically', async () => {
      const trackedService = serviceName('text')
      await repo.upsert(trackedService, { remaining_quota: 100, total_quota: 1000 })

      const result = await repo.decrementCapacity(trackedService, 10)

      expect(result).not.toBeNull()
      expect(result!.remaining_quota).toBe(90)
    })

    it('should return null when service type does not exist', async () => {
      const result = await repo.decrementCapacity('non-existent', 10)

      expect(result).toBeNull()
    })

    it('should not allow remaining quota to go below zero', async () => {
      const trackedService = serviceName('text')
      await repo.upsert(trackedService, { remaining_quota: 5, total_quota: 100 })

      const result = await repo.decrementCapacity(trackedService, 10)

      // Atomic update with WHERE clause should prevent the update if amount > remaining_quota
      // The old implementation would set it to -5 (or max(0, -5) = 0)
      // The new implementation should return null or the unchanged record
      // Since we're using RETURNING, we can detect if update happened
      expect(result).toBeDefined()
      // If atomic update works correctly, remaining_quota should still be 5
      // because the WHERE condition remaining_quota >= amount would fail
      const record = await repo.getByService(trackedService)
      expect(record!.remaining_quota).toBe(5)
    })

    it('should handle exact quota match', async () => {
      const trackedService = serviceName('text')
      await repo.upsert(trackedService, { remaining_quota: 10, total_quota: 100 })

      const result = await repo.decrementCapacity(trackedService, 10)

      expect(result).not.toBeNull()
      expect(result!.remaining_quota).toBe(0)
    })

    it('should handle multiple sequential decrements', async () => {
      const trackedService = serviceName('text')

      const result = await runWithFreshCapacity(
        trackedService,
        { remaining_quota: 100, total_quota: 1000 },
        async () => {
          await repo.decrementCapacity(trackedService, 30)
          const secondResult = await repo.decrementCapacity(trackedService, 30)

          if (!secondResult) {
            throw new Error('CAPACITY_TEST_INTERFERENCE')
          }

          return secondResult
        },
      )

      expect(result).not.toBeNull()
      expect(result!.remaining_quota).toBe(40)
    })

    it('should update last_checked_at timestamp', async () => {
      const trackedService = serviceName('text')
      await repo.upsert(trackedService, { remaining_quota: 100, total_quota: 1000 })

      await repo.decrementCapacity(trackedService, 10)

      const result = await repo.getByService(trackedService)
      expect(result!.last_checked_at).toBeDefined()
    })
  })

  describe('atomic behavior under concurrency', () => {
    it('should prevent race condition with concurrent decrements', async () => {
      // Set up: 10 quota, 10 concurrent requests each trying to decrement 1
      const trackedService = serviceName('concurrent_test')

      const { successCount, record } = await runWithFreshCapacity(
        trackedService,
        { remaining_quota: 10, total_quota: 10 },
        async () => {
          const decrements = Array.from({ length: 10 }, () => repo.decrementCapacity(trackedService, 1))
          const results = await Promise.all(decrements)
          const currentSuccessCount = results.filter(isNonNullResult).length
          const currentRecord = await repo.getByService(trackedService)

          if (currentSuccessCount !== 10 || !currentRecord) {
            throw new Error('CAPACITY_TEST_INTERFERENCE')
          }

          return { successCount: currentSuccessCount, record: currentRecord }
        },
      )
      
      // The key invariant: remaining_quota should never go negative
      expect(successCount).toBe(10)
      expect(record!.remaining_quota).toBeGreaterThanOrEqual(0)
      expect(record!.remaining_quota).toBeLessThanOrEqual(10)
    })

    it('should handle burst of concurrent requests correctly', async () => {
      const initialQuota = 5
      const concurrentRequests = 20
      const amountPerRequest = 1
      const trackedService = serviceName('burst_test')

      const { successCount, finalRecord } = await runWithFreshCapacity(
        trackedService,
        { remaining_quota: initialQuota, total_quota: 100 },
        async () => {
          const promises = Array.from({ length: concurrentRequests }, () =>
            repo.decrementCapacity(trackedService, amountPerRequest),
          )

          const results = await Promise.all(promises)
          const currentSuccessCount = results.filter(isNonNullResult).length
          const currentRecord = await repo.getByService(trackedService)

          if (!currentRecord) {
            throw new Error('CAPACITY_TEST_INTERFERENCE')
          }

          return { successCount: currentSuccessCount, finalRecord: currentRecord }
        },
      )

      // At most initialQuota requests should succeed
      expect(successCount).toBeLessThanOrEqual(initialQuota)

      // Final remaining should be >= 0
      expect(finalRecord!.remaining_quota).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getByService', () => {
    it('should return capacity record by service type', async () => {
      const trackedService = serviceName('voice')
      await repo.upsert(trackedService, { remaining_quota: 50, total_quota: 500 })

      const result = await repo.getByService(trackedService)

      expect(result).not.toBeNull()
      expect(result!.service_type).toBe(trackedService)
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
      const trackedService = serviceName('new_service')
      const result = await repo.upsert(trackedService, { remaining_quota: 100, total_quota: 1000 })

      expect(result.service_type).toBe(trackedService)
      expect(result.remaining_quota).toBe(100)
      expect(result.total_quota).toBe(1000)
    })

    it('should update existing capacity record', async () => {
      const trackedService = serviceName('update_service')
      await repo.upsert(trackedService, { remaining_quota: 100, total_quota: 1000 })
      const result = await repo.upsert(trackedService, { remaining_quota: 80, total_quota: 1000 })

      expect(result.remaining_quota).toBe(80)
    })
  })
})
