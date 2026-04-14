import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogRepository } from '../log-repository'
import { DatabaseConnection } from '../../database/connection'
import { TriggerType, ExecutionStatus } from '../../database/types'

describe('LogRepository', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      transaction: vi.fn(async (fn) => {
        const txConnection = {
          query: mockDb.query,
          execute: mockDb.execute,
          isPostgres: mockDb.isPostgres,
        }
        return await fn(txConnection as unknown as DatabaseConnection)
      }),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('getAll', () => {
    it('should return all logs without filters', async () => {
      const mockRows = [
        {
          id: 'log-1',
          job_id: 'job-1',
          trigger_type: 'manual' as TriggerType,
          status: 'completed' as ExecutionStatus,
          owner_id: null,
        },
        {
          id: 'log-2',
          job_id: 'job-2',
          trigger_type: 'schedule' as TriggerType,
          status: 'failed' as ExecutionStatus,
          owner_id: null,
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getAll()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs ORDER BY started_at DESC LIMIT $1',
        [100]
      )
      expect(result).toHaveLength(2)
    })

    it('should filter by jobId', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'log-1', job_id: 'job-1', trigger_type: 'manual' as TriggerType, status: 'completed' as ExecutionStatus },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getAll('job-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs WHERE job_id = $1 ORDER BY started_at DESC LIMIT $2',
        ['job-1', 100]
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by ownerId', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'log-1', job_id: 'job-1', trigger_type: 'manual' as TriggerType, status: 'completed' as ExecutionStatus, owner_id: 'owner-1' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getAll(undefined, 100, 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs WHERE owner_id = $1 ORDER BY started_at DESC LIMIT $2',
        ['owner-1', 100]
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by both jobId and ownerId', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'log-1', job_id: 'job-1', trigger_type: 'manual' as TriggerType, status: 'completed' as ExecutionStatus, owner_id: 'owner-1' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getAll('job-1', 100, 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs WHERE job_id = $1 AND owner_id = $2 ORDER BY started_at DESC LIMIT $3',
        ['job-1', 'owner-1', 100]
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('getPaginated', () => {
    it('should return paginated results with total count', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '50' }] as any)
        .mockResolvedValueOnce([
          { id: 'log-1', job_id: 'job-1', trigger_type: 'manual' as TriggerType, status: 'completed' as ExecutionStatus },
        ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getPaginated({ limit: 20, offset: 0 })

      expect(result.total).toBe(50)
      expect(result.logs).toHaveLength(1)
    })

    it('should apply date filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getPaginated({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at >= $'),
        expect.arrayContaining(['2026-01-01T00:00:00Z', '2026-01-31T23:59:59Z'])
      )
    })

    it('should apply owner filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getPaginated({ ownerId: 'owner-1' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $'),
        expect.arrayContaining(['owner-1'])
      )
    })
  })

  describe('createDetail', () => {
    it('should create execution log detail', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.createDetail({
        log_id: 'log-1',
        node_id: 'node-1',
        node_type: 'action',
        service_name: 'MiniMaxService',
        method_name: 'chatCompletion',
        input_payload: '{"text":"hello"}',
        output_result: '{"response":"hi"}',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_log_details'),
        expect.any(Array)
      )
      expect(result).toBeDefined()
    })

    it('should handle optional fields', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.createDetail({
        log_id: 'log-1',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_log_details'),
        expect.arrayContaining(['log-1', null, null, null, null, null, null, null, null, expect.any(String), null, null])
      )
      expect(result).toBeDefined()
    })
  })

  describe('complete stats', () => {
    it('should complete log with success stats', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 'log-1',
        job_id: 'job-1',
        trigger_type: 'manual' as TriggerType,
        status: 'completed' as ExecutionStatus,
        tasks_executed: 5,
        tasks_succeeded: 5,
        tasks_failed: 0,
      }] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.complete('log-1', {
        success: true,
        durationMs: 1000,
        tasksExecuted: 5,
        tasksSucceeded: 5,
        tasksFailed: 0,
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_logs SET status = $1'),
        expect.arrayContaining(['completed', 1000, 5, 5, 0, null, 'log-1'])
      )
      expect(result).not.toBeNull()
    })

    it('should complete log with failure stats', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 'log-1',
        job_id: 'job-1',
        trigger_type: 'manual' as TriggerType,
        status: 'failed' as ExecutionStatus,
        tasks_executed: 3,
        tasks_succeeded: 1,
        tasks_failed: 2,
        error_summary: 'API rate limit exceeded',
      }] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.complete('log-1', {
        success: false,
        durationMs: 500,
        tasksExecuted: 3,
        tasksSucceeded: 1,
        tasksFailed: 2,
        errorSummary: 'API rate limit exceeded',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_logs SET status = $1'),
        expect.arrayContaining(['failed', 500, 3, 1, 2, 'API rate limit exceeded', 'log-1'])
      )
      expect(result?.status).toBe('failed')
    })

    it('should apply owner filter when completing', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 'log-1',
        job_id: 'job-1',
        trigger_type: 'manual' as TriggerType,
        status: 'completed' as ExecutionStatus,
        owner_id: 'owner-1',
      }] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.complete('log-1', {
        success: true,
        durationMs: 1000,
        tasksExecuted: 5,
        tasksSucceeded: 5,
        tasksFailed: 0,
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $8 AND owner_id = $9'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result).not.toBeNull()
    })
  })

  describe('getStatsOverview', () => {
    it('should return stats overview without owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        totalexecutions: '100',
        successcount: '80',
        avgduration: '1500.5',
        errorcount: '20',
      }] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsOverview()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM execution_logs'),
        []
      )
      expect(result.totalExecutions).toBe(100)
      expect(result.successRate).toBe(0.8)
      expect(result.avgDuration).toBe(1501)
      expect(result.errorCount).toBe(20)
    })

    it('should return stats overview with owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        totalexecutions: '50',
        successcount: '40',
        avgduration: '1000',
        errorcount: '10',
      }] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsOverview('owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $1'),
        ['owner-1']
      )
      expect(result.totalExecutions).toBe(50)
    })

    it('should handle zero executions', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        totalexecutions: '0',
        successcount: '0',
        avgduration: '0',
        errorcount: '0',
      }] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsOverview()

      expect(result.successRate).toBe(0)
      expect(result.avgDuration).toBe(0)
    })
  })
})