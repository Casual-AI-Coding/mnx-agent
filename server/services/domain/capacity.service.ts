/**
 * CapacityService Implementation
 *
 * Domain service handling all CapacityRecord-related operations.
 * Delegates to DatabaseService for data access.
 */

import type { DatabaseService } from '../../database/service-async.js'
import type { CapacityRecord, UpdateCapacityRecord } from '../../database/types.js'
import type { ICapacityService } from './interfaces/index.js'

export class CapacityService implements ICapacityService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(): Promise<CapacityRecord[]> {
    return this.db.getAllCapacityRecords()
  }

  async getByService(serviceType: string): Promise<CapacityRecord | null> {
    return this.db.getCapacityByService(serviceType)
  }

  async upsert(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord> {
    return this.db.upsertCapacityRecord(serviceType, data)
  }

  async updateCapacity(serviceType: string, remaining: number): Promise<void> {
    return this.db.updateCapacity(serviceType, remaining)
  }

  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> {
    return this.db.decrementCapacity(serviceType, amount)
  }
}