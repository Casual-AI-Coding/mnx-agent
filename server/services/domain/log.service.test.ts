import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogService } from './log.service.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { ExecutionLog, ExecutionLogDetail } from '../../database/types.js'

describe('LogService', () => {
  let service: LogService
  let mockDb: {
    getAllExecutionLogs: ReturnType<typeof vi.fn>
    getExecutionLogById: ReturnType<typeof vi.fn>
    createExecutionLog: ReturnType<typeof vi.fn>
    updateExecutionLog: ReturnType<typeof vi.fn>
    createExecutionLogDetail: ReturnType<typeof vi.fn>
    getExecutionLogDetailsByLogId: ReturnType<typeof vi.fn>
    getExecutionStatsOverview: ReturnType<typeof vi.fn>
  }

  const mockLog: ExecutionLog = {
    id: 'log-1',
    status: 'running',
    started_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockDetail: ExecutionLogDetail = {
    id: 'detail-1',
    log_id: 'log-1',
    node_id: 'node-1',
    status: 'completed',
    started_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-01T00:00:01Z',
    created_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    mockDb = {
      getAllExecutionLogs: vi.fn(),
      getExecutionLogById: vi.fn(),
      createExecutionLog: vi.fn(),
      updateExecutionLog: vi.fn(),
      createExecutionLogDetail: vi.fn(),
      getExecutionLogDetailsByLogId: vi.fn(),
      getExecutionStatsOverview: vi.fn(),
    }
    service = new LogService(mockDb as unknown as DatabaseService)
  })

  describe('getAll', () => {
    it('should return all logs with default limit', async () => {
      mockDb.getAllExecutionLogs.mockResolvedValue([mockLog])
      const result = await service.getAll({})
      expect(mockDb.getAllExecutionLogs).toHaveBeenCalledWith(undefined, 100, undefined)
      expect(result).toEqual([mockLog])
    })

    it('should filter by jobId and ownerId', async () => {
      mockDb.getAllExecutionLogs.mockResolvedValue([mockLog])
      const result = await service.getAll({ jobId: 'job-1', ownerId: 'owner-1', limit: 50 })
      expect(mockDb.getAllExecutionLogs).toHaveBeenCalledWith('job-1', 50, 'owner-1')
      expect(result).toEqual([mockLog])
    })
  })

  describe('getById', () => {
    it('should return log by id', async () => {
      mockDb.getExecutionLogById.mockResolvedValue(mockLog)
      const result = await service.getById('log-1', 'owner-1')
      expect(mockDb.getExecutionLogById).toHaveBeenCalledWith('log-1', 'owner-1')
      expect(result).toEqual(mockLog)
    })

    it('should return null if not found', async () => {
      mockDb.getExecutionLogById.mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new log', async () => {
      mockDb.createExecutionLog.mockResolvedValue(mockLog)
      const result = await service.create({
        job_id: 'job-1',
        status: 'running',
        trigger_type: 'manual',
      }, 'owner-1')
      expect(mockDb.createExecutionLog).toHaveBeenCalled()
      expect(result).toEqual(mockLog)
    })
  })

  describe('update', () => {
    it('should update an existing log', async () => {
      const updatedLog = { ...mockLog, status: 'completed' }
      mockDb.updateExecutionLog.mockResolvedValue(updatedLog)
      const result = await service.update('log-1', { status: 'completed' })
      expect(result.status).toBe('completed')
    })

    it('should throw if log not found', async () => {
      mockDb.updateExecutionLog.mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow('ExecutionLog not found: nonexistent')
    })
  })

  describe('createDetail', () => {
    it('should create a log detail', async () => {
      mockDb.createExecutionLogDetail.mockResolvedValue('detail-1')
      mockDb.getExecutionLogDetailsByLogId.mockResolvedValue([mockDetail])
      const result = await service.createDetail({
        log_id: 'log-1',
        node_id: 'node-1',
        status: 'running',
      })
      expect(result).toEqual(mockDetail)
    })

    it('should throw if detail not found after creation', async () => {
      mockDb.createExecutionLogDetail.mockResolvedValue('detail-1')
      mockDb.getExecutionLogDetailsByLogId.mockResolvedValue([])
      await expect(service.createDetail({
        log_id: 'log-1',
        node_id: 'node-1',
        status: 'running',
      })).rejects.toThrow('ExecutionLogDetail not found after creation: detail-1')
    })
  })

  describe('getDetails', () => {
    it('should return log details', async () => {
      mockDb.getExecutionLogDetailsByLogId.mockResolvedValue([mockDetail])
      const result = await service.getDetails('log-1')
      expect(mockDb.getExecutionLogDetailsByLogId).toHaveBeenCalledWith('log-1')
      expect(result).toEqual([mockDetail])
    })
  })

  describe('getStats', () => {
    it('should return log statistics', async () => {
      const mockStats = { total: 100, completed: 80, failed: 20 }
      mockDb.getExecutionStatsOverview.mockResolvedValue(mockStats)
      const result = await service.getStats('owner-1')
      expect(mockDb.getExecutionStatsOverview).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual(mockStats)
    })
  })
})