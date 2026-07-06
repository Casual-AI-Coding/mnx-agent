/**
 * CapacityService Implementation
 *
 * Domain service handling all CapacityRecord-related operations.
 * Depends on CapacityRepository for data access — no DatabaseService facade.
 */

import type { CapacityRepository } from '../../repositories/capacity-repository.js'
import type { CapacityRecord, UpdateCapacityRecord } from '../../database/types.js'
import type { ICapacityService } from './interfaces/index.js'

export class CapacityService implements ICapacityService {
  constructor(private readonly capacityRepo: CapacityRepository) {}

  async getAll(): Promise<CapacityRecord[]> {
    return this.capacityRepo.getAll()
  }

  async getByService(serviceType: string): Promise<CapacityRecord | null> {
    return this.capacityRepo.getByService(serviceType)
  }

  async upsert(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord> {
    return this.capacityRepo.upsert(serviceType, data)
  }

  async updateCapacity(serviceType: string, remaining: number): Promise<void> {
    return this.capacityRepo.updateCapacity(serviceType, remaining)
  }

  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> {
    return this.capacityRepo.decrementCapacity(serviceType, amount)
  }
}