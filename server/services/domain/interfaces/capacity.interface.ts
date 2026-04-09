/**
 * CapacityService Domain Interface
 *
 * Defines the contract for all CapacityRecord-related operations.
 */

import type { CapacityRecord, UpdateCapacityRecord } from '../../../database/types.js'

export interface ICapacityService {
  /**
   * Get all capacity records
   */
  getAll(): Promise<CapacityRecord[]>

  /**
   * Get a capacity record by service type
   */
  getByService(serviceType: string): Promise<CapacityRecord | null>

  /**
   * Upsert a capacity record
   */
  upsert(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord>

  /**
   * Update capacity remaining quota
   */
  updateCapacity(serviceType: string, remaining: number): Promise<void>

  /**
   * Decrement capacity by amount
   */
  decrementCapacity(serviceType: string, amount?: number): Promise<CapacityRecord | null>
}
