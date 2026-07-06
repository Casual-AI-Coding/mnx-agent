import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CapacityService } from './capacity.service.js'
import type { CapacityRepository } from '../../repositories/capacity-repository.js'
import type { CapacityRecord, UpdateCapacityRecord } from '../../database/types.js'

describe('CapacityService', () => {
  let service: CapacityService
  let mockRepo: {
    getAll: ReturnType<typeof vi.fn>
    getByService: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
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
    mockRepo = {
      getAll: vi.fn(),
      getByService: vi.fn(),
      upsert: vi.fn(),
      updateCapacity: vi.fn(),
      decrementCapacity: vi.fn(),
    }
    service = new CapacityService(mockRepo as unknown as CapacityRepository)
  })

  describe('getAll', () => {
    it('should return all capacity records', async () => {
      const records = [mockCapacityRecord, { ...mockCapacityRecord, id: 'capacity-2', service_type: 'voice' }]
      mockRepo.getAll.mockResolvedValue(records)
      const result = await service.getAll()
      expect(mockRepo.getAll).toHaveBeenCalled()
      expect(result).toEqual(records)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no records exist', async () => {
      mockRepo.getAll.mockResolvedValue([])
      const result = await service.getAll()
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should propagate database errors', async () => {
      mockRepo.getAll.mockRejectedValue(new Error('Database connection error'))
      await expect(service.getAll()).rejects.toThrow('Database connection error')
    })
  })

  describe('getByService', () => {
    it('should return capacity record by service type', async () => {
      mockRepo.getByService.mockResolvedValue(mockCapacityRecord)
      const result = await service.getByService('text')
      expect(mockRepo.getByService).toHaveBeenCalledWith('text')
      expect(result).toEqual(mockCapacityRecord)
    })

    it('should return null if not found', async () => {
      mockRepo.getByService.mockResolvedValue(null)
      const result = await service.getByService('nonexistent')
      expect(mockRepo.getByService).toHaveBeenCalledWith('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle different service types', async () => {
      const voiceRecord = { ...mockCapacityRecord, service_type: 'voice' }
      mockRepo.getByService.mockResolvedValue(voiceRecord)
      const result = await service.getByService('voice')
      expect(result?.service_type).toBe('voice')
    })

    it('should propagate database errors', async () => {
      mockRepo.getByService.mockRejectedValue(new Error('Query failed'))
      await expect(service.getByService('text')).rejects.toThrow('Query failed')
    })
  })

  describe('upsert', () => {
    it('should create a new capacity record', async () => {
      mockRepo.upsert.mockResolvedValue(mockCapacityRecord)
      const data = { remaining_quota: 100, total_quota: 200 }
      const result = await service.upsert('text', data)
      expect(mockRepo.upsert).toHaveBeenCalledWith('text', data)
      expect(result).toEqual(mockCapacityRecord)
    })

    it('should update an existing capacity record', async () => {
      const updatedRecord = { ...mockCapacityRecord, remaining_quota: 50 }
      mockRepo.upsert.mockResolvedValue(updatedRecord)
      const data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number } = {
        remaining_quota: 50,
        total_quota: 200,
        reset_at: '2024-02-01T00:00:00Z',
      }
      const result = await service.upsert('text', data)
      expect(result.remaining_quota).toBe(50)
    })

    it('should include reset_at in data', async () => {
      mockRepo.upsert.mockResolvedValue(mockCapacityRecord)
      const data = { remaining_quota: 100, total_quota: 200, reset_at: '2024-03-01T00:00:00Z' }
      await service.upsert('text', data)
      expect(mockRepo.upsert).toHaveBeenCalledWith('text', data)
    })

    it('should propagate database errors', async () => {
      mockRepo.upsert.mockRejectedValue(new Error('Upsert failed'))
      const data = { remaining_quota: 100, total_quota: 200 }
      await expect(service.upsert('text', data)).rejects.toThrow('Upsert failed')
    })
  })

  describe('updateCapacity', () => {
    it('should update remaining quota', async () => {
      mockRepo.updateCapacity.mockResolvedValue(undefined)
      await service.updateCapacity('text', 150)
      expect(mockRepo.updateCapacity).toHaveBeenCalledWith('text', 150)
    })

    it('should update to zero', async () => {
      mockRepo.updateCapacity.mockResolvedValue(undefined)
      await service.updateCapacity('text', 0)
      expect(mockRepo.updateCapacity).toHaveBeenCalledWith('text', 0)
    })

    it('should handle negative values', async () => {
      mockRepo.updateCapacity.mockResolvedValue(undefined)
      await service.updateCapacity('text', -10)
      expect(mockRepo.updateCapacity).toHaveBeenCalledWith('text', -10)
    })

    it('should propagate database errors', async () => {
      mockRepo.updateCapacity.mockRejectedValue(new Error('Update failed'))
      await expect(service.updateCapacity('text', 100)).rejects.toThrow('Update failed')
    })
  })

  describe('decrementCapacity', () => {
    it('should decrement capacity by default amount (1)', async () => {
      const decrementedRecord = { ...mockCapacityRecord, remaining_quota: 99 }
      mockRepo.decrementCapacity.mockResolvedValue(decrementedRecord)
      const result = await service.decrementCapacity('text')
      expect(mockRepo.decrementCapacity).toHaveBeenCalledWith('text', 1)
      expect(result?.remaining_quota).toBe(99)
    })

    it('should decrement capacity by specified amount', async () => {
      const decrementedRecord = { ...mockCapacityRecord, remaining_quota: 90 }
      mockRepo.decrementCapacity.mockResolvedValue(decrementedRecord)
      const result = await service.decrementCapacity('text', 10)
      expect(mockRepo.decrementCapacity).toHaveBeenCalledWith('text', 10)
      expect(result?.remaining_quota).toBe(90)
    })

    it('should return null when capacity insufficient', async () => {
      mockRepo.decrementCapacity.mockResolvedValue(null)
      const result = await service.decrementCapacity('text', 1000)
      expect(result).toBeNull()
    })

    it('should handle zero amount', async () => {
      mockRepo.decrementCapacity.mockResolvedValue(mockCapacityRecord)
      const result = await service.decrementCapacity('text', 0)
      expect(mockRepo.decrementCapacity).toHaveBeenCalledWith('text', 0)
      expect(result).toEqual(mockCapacityRecord)
    })

    it('should propagate database errors', async () => {
      mockRepo.decrementCapacity.mockRejectedValue(new Error('Decrement failed'))
      await expect(service.decrementCapacity('text')).rejects.toThrow('Decrement failed')
    })
  })
})