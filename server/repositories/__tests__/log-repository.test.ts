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

  describe('getPaginated with all options', () => {
    it('should handle empty options', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '0' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getPaginated({})

      expect(result.total).toBe(0)
      expect(result.logs).toHaveLength(0)
    })

    it('should use default limit and offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getPaginated({})

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([50, 0])
      )
    })

    it('should apply both startDate and endDate filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getPaginated({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        ownerId: 'owner-1',
      })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('started_at >= $')
      expect(queryCall[0]).toContain('started_at <= $')
      expect(queryCall[1]).toContain('2026-01-01T00:00:00Z')
      expect(queryCall[1]).toContain('2026-01-31T23:59:59Z')
    })

    it('should combine ownerId with date filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getPaginated({
        ownerId: 'owner-1',
        startDate: '2026-01-01T00:00:00Z',
      })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('owner_id = $')
      expect(queryCall[0]).toContain('started_at >= $')
    })

    it('should handle custom limit and offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '200' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getPaginated({ limit: 25, offset: 50 })

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(25)
      expect(queryCall[1]).toContain(50)
    })

    it('should return correct total from count query', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '150' }] as any)
        .mockResolvedValueOnce([
          { id: 'log-1', job_id: 'job-1', trigger_type: 'manual' as TriggerType, status: 'completed' as ExecutionStatus },
        ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getPaginated({ limit: 10, offset: 0 })

      expect(result.total).toBe(150)
      expect(result.logs).toHaveLength(1)
    })
  })

  describe('getStatsTrend', () => {
    it('should return daily trend for postgres', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { date: '2026-01-15', total: '10', success: '8', failed: '2' },
        { date: '2026-01-14', total: '15', success: '12', failed: '3' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsTrend('day')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('TO_CHAR(started_at, \'YYYY-MM-DD\')'),
        []
      )
      expect(result).toHaveLength(2)
      expect(result[0].date).toBe('2026-01-15')
      expect(result[0].total).toBe(10)
      expect(result[0].success).toBe(8)
      expect(result[0].failed).toBe(2)
    })

    it('should return weekly trend for postgres', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { date: '2026-03', total: '50', success: '45', failed: '5' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsTrend('week')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('TO_CHAR(started_at, \'IYYY-IW\')'),
        []
      )
      expect(result).toHaveLength(1)
    })

    it('should return monthly trend for postgres', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { date: '2026-01', total: '200', success: '180', failed: '20' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsTrend('month')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('TO_CHAR(started_at, \'YYYY-MM\')'),
        []
      )
      expect(result).toHaveLength(1)
    })

    it('should return daily trend for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { date: '2026-01-15', total: '10', success: '8', failed: '2' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsTrend('day')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('strftime'),
        []
      )
      expect(result).toHaveLength(1)
    })

    it('should apply owner filter to trend', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { date: '2026-01-15', total: '5', success: '4', failed: '1' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getStatsTrend('day', 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $1'),
        ['owner-1']
      )
      expect(result).toHaveLength(1)
    })

    it('should limit results to 90 periods', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getStatsTrend('day')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 90'),
        []
      )
    })
  })

  describe('updateDetail', () => {
    it('should update output_result field', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      await repo.updateDetail('detail-1', { output_result: '{"result":"success"}' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_log_details SET output_result = $1'),
        expect.arrayContaining(['{"result":"success"}', 'detail-1'])
      )
    })

    it('should update error_message field', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      await repo.updateDetail('detail-1', { error_message: 'Connection timeout' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_log_details SET error_message = $1'),
        expect.arrayContaining(['Connection timeout', 'detail-1'])
      )
    })

    it('should update completed_at field', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      await repo.updateDetail('detail-1', { completed_at: '2026-01-15T10:30:00Z' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_log_details SET completed_at = $1'),
        expect.arrayContaining(['2026-01-15T10:30:00Z', 'detail-1'])
      )
    })

    it('should update duration_ms field', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      await repo.updateDetail('detail-1', { duration_ms: 1500 })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_log_details SET duration_ms = $1'),
        expect.arrayContaining([1500, 'detail-1'])
      )
    })

    it('should update multiple fields at once', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new LogRepository(mockDb)
      await repo.updateDetail('detail-1', {
        output_result: '{"success":true}',
        completed_at: '2026-01-15T10:30:00Z',
        duration_ms: 2000,
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('output_result = $1'),
        expect.arrayContaining(['{"success":true}', '2026-01-15T10:30:00Z', 2000, 'detail-1'])
      )
    })

    it('should do nothing when no fields provided', async () => {
      const repo = new LogRepository(mockDb)
      await repo.updateDetail('detail-1', {})

      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })

  describe('getRecent', () => {
    it('should call getAll with default limit', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'log-1', job_id: 'job-1', trigger_type: 'manual' as TriggerType, status: 'completed' as ExecutionStatus },
      ] as any)

      const repo = new LogRepository(mockDb)
      await repo.getRecent()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs ORDER BY started_at DESC LIMIT $1',
        [20]
      )
    })

    it('should call getAll with custom limit', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getRecent(50)

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs ORDER BY started_at DESC LIMIT $1',
        [50]
      )
    })

    it('should apply owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      await repo.getRecent(20, 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_logs WHERE owner_id = $1 ORDER BY started_at DESC LIMIT $2',
        ['owner-1', 20]
      )
    })
  })

  describe('getDetailsByLogId', () => {
    it('should return details for a log', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'detail-1', log_id: 'log-1', node_id: 'node-1', output_result: '{"success":true}' },
        { id: 'detail-2', log_id: 'log-1', node_id: 'node-2', output_result: '{"success":true}' },
      ] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getDetailsByLogId('log-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM execution_log_details WHERE log_id = $1 ORDER BY started_at',
        ['log-1']
      )
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no details found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new LogRepository(mockDb)
      const result = await repo.getDetailsByLogId('log-with-no-details')

      expect(result).toHaveLength(0)
    })
  })
})