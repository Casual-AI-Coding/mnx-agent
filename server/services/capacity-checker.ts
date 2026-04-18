import { MiniMaxClient } from '../lib/minimax'
import { CapacityRecord, CreateCapacityRecord } from '../database/types'
import type { DatabaseService } from '../database/service-async.js'
import { SimpleCache } from '../lib/cache.js'
import { toLocalISODateString } from '../lib/date-utils.js'
import { RATE_LIMITS_BY_SERVICE } from '../config/rate-limits.js'

const BALANCE_CACHE_TTL_MS = 30000

export interface BalanceResult {
  totalBalance: number
  accountBalance: number
  grantBalance: number
  cashBalance: number
  lastCheckedAt: string
}

export interface ServiceCapacity {
  serviceType: string
  remainingQuota: number
  totalQuota: number
  resetAt: string | null
  hasCapacity: boolean
}

const MIN_BALANCE_THRESHOLD = 1.0

export class CapacityChecker {
  private client: MiniMaxClient
  private db: DatabaseService
  private balanceCache: SimpleCache<BalanceResult>

  constructor(client: MiniMaxClient, db: DatabaseService) {
    this.client = client
    this.db = db
    this.balanceCache = new SimpleCache<BalanceResult>()
  }

  async checkBalance(): Promise<BalanceResult> {
    const cached = this.balanceCache.get('balance')
    if (cached) {
      return cached
    }

    const rawResponse = await this.client.getBalance()
    const result = this.parseBalanceResponse(rawResponse)
    await this.saveCapacityRecord('all', result.totalBalance, result.totalBalance)
    this.balanceCache.set('balance', result, BALANCE_CACHE_TTL_MS)
    return result
  }

  async checkCodingPlanRemains(productId?: string): Promise<unknown> {
    const rawResponse = await this.client.getCodingPlanRemains(productId)
    return rawResponse
  }

  parseBalanceResponse(raw: unknown): BalanceResult {
    const data = raw as {
      base_resp?: { status_code: number }
      account_balance?: number | string
      grant_balance?: number | string
      cash_balance?: number | string
      data?: {
        account_balance?: number | string
        grant_balance?: number | string
        cash_balance?: number | string
      }
    }

    const accountBalance = Number(data?.account_balance ?? data?.data?.account_balance ?? 0)
    const grantBalance = Number(data?.grant_balance ?? data?.data?.grant_balance ?? 0)
    const cashBalance = Number(data?.cash_balance ?? data?.data?.cash_balance ?? 0)
    const totalBalance = accountBalance + grantBalance + cashBalance

    return {
      totalBalance,
      accountBalance,
      grantBalance,
      cashBalance,
      lastCheckedAt: toLocalISODateString(),
    }
  }

  async hasCapacity(serviceType: string): Promise<boolean> {
    const balance = await this.checkBalance()
    if (balance.totalBalance < MIN_BALANCE_THRESHOLD) {
      return false
    }

    const capacity = await this.fetchCapacityRecord(serviceType)
    if (!capacity) {
      return true
    }

    return capacity.remaining_quota > 0
  }

  async getRemainingCapacity(serviceType: string): Promise<number> {
    const capacity = await this.fetchCapacityRecord(serviceType)
    if (!capacity) {
      const rateLimit = RATE_LIMITS_BY_SERVICE[serviceType]
      return rateLimit?.rpm ?? 100
    }
    return capacity.remaining_quota
  }

  async refreshAllCapacity(): Promise<void> {
    this.balanceCache.delete('balance')

    const balance = await this.checkBalance()
    await this.saveCapacityRecord('all', balance.totalBalance, balance.totalBalance)

    const now = new Date()
    const resetAt = toLocalISODateString(new Date(now.getTime() + 60000))

    for (const [serviceType, config] of Object.entries(RATE_LIMITS_BY_SERVICE)) {
      await this.saveCapacityRecord(serviceType, config.rpm, config.rpm, resetAt)
    }
  }

  async canExecuteTask(serviceType: string, estimatedCost: number): Promise<boolean> {
    const balance = await this.checkBalance()
    if (balance.totalBalance - estimatedCost < MIN_BALANCE_THRESHOLD) {
      return false
    }

    const remaining = await this.getRemainingCapacity(serviceType)
    return remaining > 0
  }

  async getSafeExecutionLimit(serviceType: string): Promise<number> {
    const balance = await this.checkBalance()
    const remainingCapacity = await this.getRemainingCapacity(serviceType)
    const rateLimit = RATE_LIMITS_BY_SERVICE[serviceType]

    const safeLimit = Math.min(remainingCapacity, rateLimit?.rpm ?? 100)
    const balanceBasedLimit = Math.floor(balance.totalBalance / 0.01)

    return Math.min(safeLimit, balanceBasedLimit)
  }

  async waitForCapacity(serviceType: string, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now()
    const deadline = startTime + timeoutMs

    while (Date.now() < deadline) {
      if (await this.hasCapacity(serviceType)) {
        return true
      }
      await this.delay(1000)
    }

    return false
  }

  async decrementCapacity(serviceType: string): Promise<void> {
    const capacity = await this.fetchCapacityRecord(serviceType)
    if (!capacity) {
      return
    }

    const newRemaining = Math.max(0, capacity.remaining_quota - 1)
    await this.saveCapacityRecord(
      serviceType,
      newRemaining,
      capacity.total_quota,
      capacity.reset_at
    )
  }

  private async fetchCapacityRecord(serviceType: string): Promise<CapacityRecord | null> {
    return await this.db.getCapacityRecord(serviceType)
  }

  private async saveCapacityRecord(
    serviceType: string,
    remainingQuota: number,
    totalQuota: number,
    resetAt?: string | null
  ): Promise<void> {
    const record: CreateCapacityRecord = {
      service_type: serviceType,
      remaining_quota: remainingQuota,
      total_quota: totalQuota,
      reset_at: resetAt ?? null,
    }
    await this.db.upsertCapacityRecord(serviceType, record)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export function createCapacityChecker(client: MiniMaxClient, db: DatabaseService): CapacityChecker {
  return new CapacityChecker(client, db)
}