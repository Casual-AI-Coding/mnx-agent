import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExternalApiLogRepository } from '../external-api-log.repository'
import { DatabaseConnection } from '../../database/connection'
import type { ExternalApiLogRow, CreateExternalApiLog, ExternalApiLogQuery } from '../../database/types'

describe('ExternalApiLogRepository', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('create', () => {
    it('should create external API log entry', async () => {
      const logData: CreateExternalApiLog = {
        service_provider: 'minimax',
        api_endpoint: '/v1/text/chatcompletion_v2',
        operation: 'chat.completion',
        request_params: { model: 'abab6.5s-chat' },
        request_body: '{"prompt":"hello"}',
        response_body: '{"choices":[{"message":{"content":"hi"}}]}',
        status: 'success',
        duration_ms: 1500,
        user_id: 'user-123',
        trace_id: 'trace-abc',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ id: 1 }] as any)
        .mockResolvedValueOnce([{
          id: 1,
          ...logData,
          created_at: '2026-04-20T10:00:00Z',
          request_params: JSON.stringify(logData.request_params),
        }] as ExternalApiLogRow[])

      const repo = new ExternalApiLogRepository(mockDb)
      const result = await repo.create(logData)

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO external_api_logs'),
        expect.arrayContaining([
          'minimax',
          '/v1/text/chatcompletion_v2',
          'chat.completion',
          expect.any(String),
          expect.any(String),
        ])
      )
      expect(result.service_provider).toBe('minimax')
    })

    it('should handle failed status', async () => {
      const logData: CreateExternalApiLog = {
        service_provider: 'minimax',
        api_endpoint: '/v1/image generation',
        operation: 'image.generate',
        status: 'failed',
        error_message: 'Rate limit exceeded',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ id: 2 }] as any)
        .mockResolvedValueOnce([{
          id: 2,
          service_provider: 'minimax',
          api_endpoint: '/v1/image generation',
          operation: 'image.generate',
          status: 'failed',
          error_message: 'Rate limit exceeded',
          created_at: '2026-04-20T10:00:00Z',
        }] as ExternalApiLogRow[])

      const repo = new ExternalApiLogRepository(mockDb)
      const result = await repo.create(logData)

      expect(result.status).toBe('failed')
      expect(result.error_message).toBe('Rate limit exceeded')
    })
  })

  describe('getById', () => {
    it('should return log by id', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([{
        id: 1,
        service_provider: 'minimax',
        api_endpoint: '/v1/text/chatcompletion_v2',
        operation: 'chat.completion',
        status: 'success',
        created_at: '2026-04-20T10:00:00Z',
      }] as ExternalApiLogRow[])

      const repo = new ExternalApiLogRepository(mockDb)
      const result = await repo.getById('1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe(1)
      expect(result?.service_provider).toBe('minimax')
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      const result = await repo.getById('999')

      expect(result).toBeNull()
    })
  })

  describe('queryLogs', () => {
    it('should query logs with no filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([
          { id: 1, service_provider: 'minimax', operation: 'chat.completion', status: 'success', created_at: '2026-04-20T10:00:00Z' },
          { id: 2, service_provider: 'minimax', operation: 'image.generate', status: 'success', created_at: '2026-04-20T11:00:00Z' },
        ] as ExternalApiLogRow[])

      const repo = new ExternalApiLogRepository(mockDb)
      const result = await repo.queryLogs({})

      expect(result.total).toBe(10)
      expect(result.logs).toHaveLength(2)
    })

    it('should filter by service_provider', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.queryLogs({ service_provider: 'minimax' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('service_provider = $'),
        expect.arrayContaining(['minimax'])
      )
    })

    it('should filter by status', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.queryLogs({ status: 'failed' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.arrayContaining(['failed'])
      )
    })

    it('should filter by operation', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.queryLogs({ operation: 'chat.completion' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('operation = $'),
        expect.arrayContaining(['chat.completion'])
      )
    })

    it('should filter by user_id', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '4' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.queryLogs({ user_id: 'user-123' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $'),
        expect.arrayContaining(['user-123'])
      )
    })

    it('should filter by date range', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.queryLogs({
        start_date: '2026-04-01',
        end_date: '2026-04-20',
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $'),
        expect.arrayContaining(['2026-04-01', '2026-04-20'])
      )
    })

    it('should handle pagination', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      const result = await repo.queryLogs({ page: 3, limit: 25 })

      expect(result.total).toBe(100)
      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(25)
      expect(queryCall[1]).toContain(50) // offset = (3-1) * 25 = 50
    })

    it('should sort by duration_ms when specified', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.queryLogs({ sort_by: 'duration_ms', sort_order: 'asc' })

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[0]).toContain('ORDER BY duration_ms ASC')
    })
  })

  describe('getStats', () => {
    it('should return stats for all logs', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([{ service_provider: 'minimax', count: '80' }, { service_provider: 'openai', count: '20' }] as any)
        .mockResolvedValueOnce([{ status: 'success', count: '90' }, { status: 'failed', count: '10' }] as any)
        .mockResolvedValueOnce([{ operation: 'chat.completion', count: '50' }, { operation: 'image.generate', count: '30' }] as any)
        .mockResolvedValueOnce([{ avg_duration: '1500.5' }] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      const stats = await repo.getStats()

      expect(stats.total_logs).toBe(100)
      expect(stats.by_service_provider.minimax).toBe(80)
      expect(stats.by_service_provider.openai).toBe(20)
      expect(stats.by_status.success).toBe(90)
      expect(stats.by_status.failed).toBe(10)
      expect(stats.by_operation.chat.completion).toBe(50)
      expect(stats.avg_duration_ms).toBe(1501)
    })

    it('should filter stats by userId', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '25' }] as any)
        .mockResolvedValueOnce([{ service_provider: 'minimax', count: '25' }] as any)
        .mockResolvedValueOnce([{ status: 'success', count: '25' }] as any)
        .mockResolvedValueOnce([{ operation: 'chat.completion', count: '25' }] as any)
        .mockResolvedValueOnce([{ avg_duration: '1000' }] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      const stats = await repo.getStats('user-123')

      expect(stats.total_logs).toBe(25)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      )
    })
  })

  describe('getUniqueOperations', () => {
    it('should return all unique operations', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { operation: 'chat.completion' },
        { operation: 'image.generate' },
        { operation: 'text.to_speech' },
      ] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      const operations = await repo.getUniqueOperations()

      expect(operations).toEqual(['chat.completion', 'image.generate', 'text.to_speech'])
    })

    it('should filter by userId', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { operation: 'chat.completion' },
      ] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.getUniqueOperations('user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      )
    })
  })

  describe('getUniqueServiceProviders', () => {
    it('should return all unique service providers', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { service_provider: 'minimax' },
        { service_provider: 'openai' },
      ] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      const providers = await repo.getUniqueServiceProviders()

      expect(providers).toEqual(['minimax', 'openai'])
    })

    it('should filter by userId', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { service_provider: 'minimax' },
      ] as any)

      const repo = new ExternalApiLogRepository(mockDb)
      await repo.getUniqueServiceProviders('user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      )
    })
  })
})