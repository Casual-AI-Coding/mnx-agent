import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogService } from './log.service.js'
import type { DatabaseConnection } from '../../database/connection.js'
import type { ExecutionLog, ExecutionLogDetail } from '../../database/types.js'
import { ExternalApiLogRepository } from '../../repositories/external-api-log.repository.js'
import { LogRepository } from '../../repositories/log-repository.js'
import { UserRepository } from '../../repositories/user-repository.js'

const fakeConnection: DatabaseConnection = {
  async query() {
    return []
  },
  async execute() {
    return { changes: 0 }
  },
  async transaction(fn) {
    return fn(fakeConnection)
  },
  async close() {},
  isPostgres() {
    return false
  },
}

describe('LogService', () => {
  let service: LogService
  let logRepo: LogRepository
  let userRepo: UserRepository
  let externalApiLogRepo: ExternalApiLogRepository

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
    vi.restoreAllMocks()
    logRepo = new LogRepository(fakeConnection)
    userRepo = new UserRepository(fakeConnection)
    externalApiLogRepo = new ExternalApiLogRepository(fakeConnection)
    service = new LogService(logRepo, userRepo, externalApiLogRepo)
  })

  describe('getAll', () => {
    it('should return all logs with default limit', async () => {
      const getAll = vi.spyOn(logRepo, 'getAll').mockResolvedValue([mockLog])
      const result = await service.getAll({})
      expect(getAll).toHaveBeenCalledWith(undefined, 100, undefined)
      expect(result).toEqual([mockLog])
    })

    it('should filter by jobId and ownerId', async () => {
      const getAll = vi.spyOn(logRepo, 'getAll').mockResolvedValue([mockLog])
      const result = await service.getAll({ jobId: 'job-1', ownerId: 'owner-1', limit: 50 })
      expect(getAll).toHaveBeenCalledWith('job-1', 50, 'owner-1')
      expect(result).toEqual([mockLog])
    })
  })

  describe('getById', () => {
    it('should return log by id', async () => {
      const getById = vi.spyOn(logRepo, 'getById').mockResolvedValue(mockLog)
      const result = await service.getById('log-1', 'owner-1')
      expect(getById).toHaveBeenCalledWith('log-1', 'owner-1')
      expect(result).toEqual(mockLog)
    })

    it('should return null if not found', async () => {
      vi.spyOn(logRepo, 'getById').mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new log', async () => {
      const create = vi.spyOn(logRepo, 'create').mockResolvedValue(mockLog)
      const result = await service.create({
        job_id: 'job-1',
        status: 'running',
        trigger_type: 'manual',
      }, 'owner-1')
      expect(create).toHaveBeenCalled()
      expect(result).toEqual(mockLog)
    })
  })

  describe('update', () => {
    it('should update an existing log', async () => {
      const updatedLog = { ...mockLog, status: 'completed' }
      vi.spyOn(logRepo, 'update').mockResolvedValue(updatedLog)
      const result = await service.update('log-1', { status: 'completed' })
      expect(result.status).toBe('completed')
    })

    it('should throw if log not found', async () => {
      vi.spyOn(logRepo, 'update').mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow('ExecutionLog not found: nonexistent')
    })
  })

  describe('createDetail', () => {
    it('should create a log detail', async () => {
      vi.spyOn(logRepo, 'createDetail').mockResolvedValue('detail-1')
      vi.spyOn(logRepo, 'getDetailsByLogId').mockResolvedValue([mockDetail])
      const result = await service.createDetail({
        log_id: 'log-1',
        node_id: 'node-1',
        status: 'running',
      })
      expect(result).toEqual(mockDetail)
    })

    it('should throw if detail not found after creation', async () => {
      vi.spyOn(logRepo, 'createDetail').mockResolvedValue('detail-1')
      vi.spyOn(logRepo, 'getDetailsByLogId').mockResolvedValue([])
      await expect(service.createDetail({
        log_id: 'log-1',
        node_id: 'node-1',
        status: 'running',
      })).rejects.toThrow('ExecutionLogDetail not found after creation: detail-1')
    })
  })

  describe('getDetails', () => {
    it('should return log details', async () => {
      const getDetailsByLogId = vi.spyOn(logRepo, 'getDetailsByLogId').mockResolvedValue([mockDetail])
      const result = await service.getDetails('log-1')
      expect(getDetailsByLogId).toHaveBeenCalledWith('log-1')
      expect(result).toEqual([mockDetail])
    })
  })

  describe('getStats', () => {
    it('should return log statistics', async () => {
      const mockStats = { totalExecutions: 100, successRate: 80, avgDuration: 25, errorCount: 20 }
      const getStatsOverview = vi.spyOn(logRepo, 'getStatsOverview').mockResolvedValue(mockStats)
      const result = await service.getStats('owner-1')
      expect(getStatsOverview).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual(mockStats)
    })
  })

  describe('audit reads', () => {
    it('should read audit logs through UserRepository', async () => {
      const getAuditLogs = vi.spyOn(userRepo, 'getAuditLogs').mockResolvedValue({ logs: [], total: 0 })
      const result = await service.getAuditLogs({ user_id: 'owner-1' })
      expect(getAuditLogs).toHaveBeenCalledWith({ user_id: 'owner-1' })
      expect(result).toEqual({ logs: [], total: 0 })
    })
  })
})
