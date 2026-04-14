import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CapacityService } from './capacity.service.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { CapacityRecord, UpdateCapacityRecord } from '../../database/types.js'

describe('CapacityService', () => {
  let service: CapacityService
  let mockDb: {
    getAllCapacityRecords: ReturnType<typeof vi.fn>
    getCapacityByService: ReturnType<typeof vi.fn>
    upsertCapacityRecord: ReturnType<typeof vi.fn>
    updateCapacity: ReturnType<typeof vi.fn>
    decrementCapacity: ReturnType<typeof vi.fn>
  }

  const mockCapacityRecord: CapacityRecord = {
    id: 'capacity-1',
    service_type: 'text',
    remaining_quota: 100,
    total_quota: 200,
    reset_at: '2024-01-01T00:00:00Z',
    last_checked_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    mockDb = {
      getAllCapacityRecords: vi.fn(),
      getCapacityByService: vi.fn(),
      upsertCapacityRecord: vi.fn(),
      updateCapacity: vi.fn(),
      decrementCapacity: vi.fn(),
    }
    service = new CapacityService(mockDb as unknown as DatabaseService)
  })

  describe('getAll', () => {
    it('should return all capacity records', async () => {
      const records = [mockCapacityRecord, { ...mockCapacityRecord, id: 'capacity-2', service_type: 'voice' }]
      mockDb.getAllCapacityRecords.mockResolvedValue(records)
      const result = await service.getAll()
      expect(mockDb.getAllCapacityRecords).toHaveBeenCalled()
      expect(result).toEqual(records)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no records exist', async () => {
      mockDb.getAllCapacityRecords.mockResolvedValue([])
      const result = await service.getAll()
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should propagate database errors', async () => {
      mockDb.getAllCapacityRecords.mockRejectedValue(new Error('Database connection error'))
      await expect(service.getAll()).rejects.toThrow('Database connection error')
    })
  })

  describe('getByService', () => {
    it('should return capacity record by service type', async () => {
      mockDb.getCapacityByService.mockResolvedValue(mockCapacityRecord)
      const result = await service.getByService('text')
      expect(mockDb.getCapacityByService).toHaveBeenCalledWith('text')
      expect(result).toEqual(mockCapacityRecord)
    })

    it('should return null if not found', async () => {
      mockDb.getCapacityByService.mockResolvedValue(null)
      const result = await service.getByService('nonexistent')
      expect(mockDb.getCapacityByService).toHaveBeenCalledWith('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle different service types', async () => {
      const voiceRecord = { ...mockCapacityRecord, service_type: 'voice' }
      mockDb.getCapacityByService.mockResolvedValue(voiceRecord)
      const result = await service.getByService('voice')
      expect(result?.service_type).toBe('voice')
    })

    it('should propagate database errors', async () => {
      mockDb.getCapacityByService.mockRejectedValue(new Error('Query failed'))
      await expect(service.getByService('text')).rejects.toThrow('Query failed')
    })
  })

  describe('upsert', () => {
    it('should create a new capacity record', async () => {
      mockDb.upsertCapacityRecord.mockResolvedValue(mockCapacityRecord)
      const data = { remaining_quota: 100, total_quota: 200 }
      const result = await service.upsert('text', data)
      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledWith('text', data)
      expect(result).toEqual(mockCapacityRecord)
    })

    it('should update an existing capacity record', async () => {
      const updatedRecord = { ...mockCapacityRecord, remaining_quota: 50 }
      mockDb.upsertCapacityRecord.mockResolvedValue(updatedRecord)
      const data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number } = {
        remaining_quota: 50,
        total_quota: 200,
        reset_at: '2024-02-01T00:00:00Z',
      }
      const result = await service.upsert('text', data)
      expect(result.remaining_quota).toBe(50)
    })

    it('should include reset_at in data', async () => {
      mockDb.upsertCapacityRecord.mockResolvedValue(mockCapacityRecord)
      const data = { remaining_quota: 100, total_quota: 200, reset_at: '2024-03-01T00:00:00Z' }
      await service.upsert('text', data)
      expect(mockDb.upsertCapacityRecord).toHaveBeenCalledWith('text', data)
    })

    it('should propagate database errors', async () => {
      mockDb.upsertCapacityRecord.mockRejectedValue(new Error('Upsert failed'))
      const data = { remaining_quota: 100, total_quota: 200 }
      await expect(service.upsert('text', data)).rejects.toThrow('Upsert failed')
    })
  })

  describe('updateCapacity', () => {
    it('should update remaining quota', async () => {
      mockDb.updateCapacity.mockResolvedValue(undefined)
      await service.updateCapacity('text', 150)
      expect(mockDb.updateCapacity).toHaveBeenCalledWith('text', 150)
    })

    it('should update to zero', async () => {
      mockDb.updateCapacity.mockResolvedValue(undefined)
      await service.updateCapacity('text', 0)
      expect(mockDb.updateCapacity).toHaveBeenCalledWith('text', 0)
    })

    it('should handle negative values', async () => {
      mockDb.updateCapacity.mockResolvedValue(undefined)
      await service.updateCapacity('text', -10)
      expect(mockDb.updateCapacity).toHaveBeenCalledWith('text', -10)
    })

    it('should propagate database errors', async () => {
      mockDb.updateCapacity.mockRejectedValue(new Error('Update failed'))
      await expect(service.updateCapacity('text', 100)).rejects.toThrow('Update failed')
    })
  })

  describe('decrementCapacity', () => {
    it('should decrement capacity by default amount (1)', async () => {
      const decrementedRecord = { ...mockCapacityRecord, remaining_quota: 99 }
      mockDb.decrementCapacity.mockResolvedValue(decrementedRecord)
      const result = await service.decrementCapacity('text')
      expect(mockDb.decrementCapacity).toHaveBeenCalledWith('text', 1)
      expect(result?.remaining_quota).toBe(99)
    })

    it('should decrement capacity by specified amount', async () => {
      const decrementedRecord = { ...mockCapacityRecord, remaining_quota: 90 }
      mockDb.decrementCapacity.mockResolvedValue(decrementedRecord)
      const result = await service.decrementCapacity('text', 10)
      expect(mockDb.decrementCapacity).toHaveBeenCalledWith('text', 10)
      expect(result?.remaining_quota).toBe(90)
    })

    it('should return null when capacity insufficient', async () => {
      mockDb.decrementCapacity.mockResolvedValue(null)
      const result = await service.decrementCapacity('text', 1000)
      expect(result).toBeNull()
    })

    it('should handle zero amount', async () => {
      mockDb.decrementCapacity.mockResolvedValue(mockCapacityRecord)
      const result = await service.decrementCapacity('text', 0)
      expect(mockDb.decrementCapacity).toHaveBeenCalledWith('text', 0)
      expect(result).toEqual(mockCapacityRecord)
    })

    it('should propagate database errors', async () => {
      mockDb.decrementCapacity.mockRejectedValue(new Error('Decrement failed'))
      await expect(service.decrementCapacity('text')).rejects.toThrow('Decrement failed')
    })
  })
})