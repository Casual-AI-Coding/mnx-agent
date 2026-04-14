import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CapacityChecker } from '../services/capacity-checker'
import type { DatabaseService } from '../database/service'
import type { MiniMaxClient } from '../lib/minimax'
import type { CapacityRecord } from '../database/types'

class TestableCapacityChecker extends CapacityChecker {
  public testDelay(ms: number): Promise<void> {
    return (this as unknown as { delay(ms: number): Promise<void> }).delay(ms)
  }
}

describe('CapacityChecker', () => {
  let checker: TestableCapacityChecker
  let mockClient: Partial<MiniMaxClient>
  let mockDb: Partial<DatabaseService>

  beforeEach(() => {
    mockClient = {
      getBalance: vi.fn().mockResolvedValue({
        account_balance: 100,
        grant_balance: 50,
        cash_balance: 25,
      }),
      getCodingPlanRemains: vi.fn().mockResolvedValue({ remains: 1000 }),
    }

    mockDb = {
      getCapacityRecord: vi.fn().mockResolvedValue(null),
      upsertCapacityRecord: vi.fn().mockResolvedValue(undefined),
    }

    checker = new TestableCapacityChecker(
      mockClient as MiniMaxClient,
      mockDb as DatabaseService
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkBalance', () => {
    it('should return parsed balance result', async () => {
      const result = await checker.checkBalance()

      expect(result.totalBalance).toBe(175)
      expect(result.accountBalance).toBe(100)
      expect(result.grantBalance).toBe(50)
      expect(result.cashBalance).toBe(25)
      expect(result.lastCheckedAt).toBeDefined()
    })

    it('should handle nested data structure', async () => {
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          account_balance: 200,
          grant_balance: 100,
          cash_balance: 50,
        },
      })

      const result = await checker.checkBalance()

      expect(result.totalBalance).toBe(350)
      expect(result.accountBalance).toBe(200)
    })

    it('should handle string balance values', async () => {
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        account_balance: '150',
        grant_balance: '75',
        cash_balance: '25',
      })

      const result = await checker.checkBalance()

      expect(result.totalBalance).toBe(250)
    })

    it('should handle missing balance fields with defaults', async () => {
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

      const result = await checker.checkBalance()

      expect(result.totalBalance).toBe(0)
      expect(result.accountBalance).toBe(0)
      expect(result.grantBalance).toBe(0)
      expect(result.cashBalance).toBe(0)
    })

    it('should save capacity record after checking balance', async () => {
      await checker.checkBalance()

      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledWith('all', expect.objectContaining({
        service_type: 'all',
        remaining_quota: expect.any(Number),
        total_quota: expect.any(Number),
      }))
    })
  })

  describe('parseBalanceResponse', () => {
    it('should parse standard response format', () => {
      const raw = {
        account_balance: 100,
        grant_balance: 50,
        cash_balance: 25,
      }

      const result = checker.parseBalanceResponse(raw)

      expect(result.totalBalance).toBe(175)
      expect(result.accountBalance).toBe(100)
    })

    it('should parse nested data format', () => {
      const raw = {
        data: {
          account_balance: 200,
          grant_balance: 100,
          cash_balance: 50,
        },
      }

      const result = checker.parseBalanceResponse(raw)

      expect(result.totalBalance).toBe(350)
    })

    it('should handle numeric string values', () => {
      const raw = {
        account_balance: '100',
        grant_balance: '50',
        cash_balance: '25',
      }

      const result = checker.parseBalanceResponse(raw)

      expect(result.totalBalance).toBe(175)
    })

    it('should default to 0 for missing values', () => {
      const raw = {}

      const result = checker.parseBalanceResponse(raw)

      expect(result.totalBalance).toBe(0)
    })
  })

  describe('hasCapacity', () => {
    it('should return true when balance is sufficient and no capacity record', async () => {
      const result = await checker.hasCapacity('text')

      expect(result).toBe(true)
    })

    it('should return false when balance is below threshold', async () => {
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        account_balance: 0.5,
        grant_balance: 0,
        cash_balance: 0,
      })

      const result = await checker.hasCapacity('text')

      expect(result).toBe(false)
    })

    it('should return false when capacity record has zero remaining quota', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 0,
        total_quota: 100,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      const result = await checker.hasCapacity('text')

      expect(result).toBe(false)
    })

    it('should return true when capacity record has remaining quota', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 50,
        total_quota: 100,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      const result = await checker.hasCapacity('text')

      expect(result).toBe(true)
    })
  })

  describe('getRemainingCapacity', () => {
    it('should return rpm limit when no capacity record exists', async () => {
      const result = await checker.getRemainingCapacity('text')

      expect(result).toBe(500)
    })

    it('should return remaining quota from capacity record', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 250,
        total_quota: 500,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      const result = await checker.getRemainingCapacity('text')

      expect(result).toBe(250)
    })

    it('should return default rpm for unknown service types', async () => {
      const result = await checker.getRemainingCapacity('unknown_service')

      expect(result).toBe(100)
    })

    it('should return specific rpm for voice_sync', async () => {
      const result = await checker.getRemainingCapacity('voice_sync')

      expect(result).toBe(60)
    })

    it('should return specific rpm for video', async () => {
      const result = await checker.getRemainingCapacity('video')

      expect(result).toBe(5)
    })
  })

  describe('refreshAllCapacity', () => {
    it('should reset all capacity records', async () => {
      await checker.refreshAllCapacity()

      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledTimes(8)
    })

    it('should save balance as total for all service', async () => {
      await checker.refreshAllCapacity()

      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledWith(
        'all',
        expect.objectContaining({
          service_type: 'all',
          remaining_quota: 175,
          total_quota: 175,
        })
      )
    })

    it('should set reset_at for each service type', async () => {
      await checker.refreshAllCapacity()

      const calls = mockDb.upsertCapacityRecord.mock.calls
      for (const call of calls) {
        if (call[0] !== 'all') {
          expect(call[1].reset_at).toBeDefined()
        }
      }
    })
  })

  describe('canExecuteTask', () => {
    it('should return true when balance and capacity are sufficient', async () => {
      const result = await checker.canExecuteTask('text', 0.5)

      expect(result).toBe(true)
    })

    it('should return false when estimated cost would drop balance below threshold', async () => {
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        account_balance: 1.0,
        grant_balance: 0,
        cash_balance: 0,
      })

      const result = await checker.canExecuteTask('text', 0.5)

      expect(result).toBe(false)
    })

    it('should return false when remaining capacity is zero', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 0,
        total_quota: 100,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      const result = await checker.canExecuteTask('text', 0.5)

      expect(result).toBe(false)
    })
  })

  describe('getSafeExecutionLimit', () => {
    it('should return minimum of remaining capacity and rate limit', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 200,
        total_quota: 500,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      const result = await checker.getSafeExecutionLimit('text')

      expect(result).toBe(200)
    })

    it('should consider balance when calculating safe limit', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 500,
        total_quota: 500,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        account_balance: 1.0,
        grant_balance: 0,
        cash_balance: 0,
      })

      const result = await checker.getSafeExecutionLimit('text')

      expect(result).toBeLessThan(500)
    })
  })

  describe('waitForCapacity', () => {
    it('should return true immediately when capacity is available', async () => {
      const result = await checker.waitForCapacity('text', 5000)

      expect(result).toBe(true)
    })

    it('should return false when capacity never becomes available', async () => {
      ;(mockClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValue({
        account_balance: 0.5,
        grant_balance: 0,
        cash_balance: 0,
      })

      const result = await checker.waitForCapacity('text', 100)

      expect(result).toBe(false)
    })

    it('should poll until capacity becomes available', async () => {
      let callCount = 0
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          return {
            id: '1',
            service_type: 'text',
            remaining_quota: 0,
            total_quota: 500,
            reset_at: null,
            last_checked_at: new Date().toISOString(),
          } as CapacityRecord
        }
        return {
          id: '1',
          service_type: 'text',
          remaining_quota: 100,
          total_quota: 500,
          reset_at: null,
          last_checked_at: new Date().toISOString(),
        } as CapacityRecord
      })

      const result = await checker.waitForCapacity('text', 5000)

      expect(result).toBe(true)
    })
  })

  describe('decrementCapacity', () => {
    it('should decrement remaining quota by 1', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 100,
        total_quota: 500,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      await checker.decrementCapacity('text')

      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledWith(
        'text',
        expect.objectContaining({
          service_type: 'text',
          remaining_quota: 99,
          total_quota: 500,
        })
      )
    })

    it('should not go below zero', async () => {
      ;(mockDb.getCapacityRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: '1',
        service_type: 'text',
        remaining_quota: 0,
        total_quota: 500,
        reset_at: null,
        last_checked_at: new Date().toISOString(),
      } as CapacityRecord)

      await checker.decrementCapacity('text')

      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledWith(
        'text',
        expect.objectContaining({
          service_type: 'text',
          remaining_quota: 0,
          total_quota: 500,
        })
      )
    })

    it('should do nothing when no capacity record exists', async () => {
      await checker.decrementCapacity('text')

      expect(mockDb.upsertCapacityRecord).not.toHaveBeenCalled()
    })
  })

  describe('delay method', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now()
      await checker.testDelay(50)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(45)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('checkCodingPlanRemains', () => {
    it('should return coding plan remains', async () => {
      const result = await checker.checkCodingPlanRemains()

      expect(result).toEqual({ remains: 1000 })
      expect(mockClient.getCodingPlanRemains).toHaveBeenCalledWith(undefined)
    })

    it('should pass productId to client', async () => {
      await checker.checkCodingPlanRemains('1002')

      expect(mockClient.getCodingPlanRemains).toHaveBeenCalledWith('1002')
    })
  })
})
