import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRepository } from '../user-repository'
import { DatabaseConnection } from '../../database/connection'

describe('UserRepository', () => {
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

  describe('createAuditLog', () => {
    it('should create audit log with all fields', async () => {
      const mockRow = {
        id: 'log-1',
        action: 'create',
        resource_type: 'cron_job',
        resource_id: 'job-1',
        user_id: 'user-1',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'POST',
        request_path: '/api/cron/jobs',
        request_body: '{"name":"test"}',
        response_status: 200,
        error_message: null,
        duration_ms: 150,
        created_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.createAuditLog({
        action: 'create',
        resource_type: 'cron_job',
        resource_id: 'job-1',
        user_id: 'user-1',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'POST',
        request_path: '/api/cron/jobs',
        request_body: '{"name":"test"}',
        response_status: 200,
        duration_ms: 150,
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['create', 'cron_job', 'job-1', 'user-1'])
      )
      expect(result).toBeDefined()
      expect(result.action).toBe('create')
    })

    it('should create audit log with null optional fields', async () => {
      const mockRow = {
        id: 'log-1',
        action: 'delete',
        resource_type: 'media',
        resource_id: 'media-1',
        user_id: null,
        ip_address: null,
        user_agent: null,
        request_method: 'DELETE',
        request_path: '/api/media/media-1',
        request_body: null,
        response_status: 204,
        error_message: null,
        duration_ms: null,
        created_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.createAuditLog({
        action: 'delete',
        resource_type: 'media',
        resource_id: 'media-1',
        request_method: 'DELETE',
        request_path: '/api/media/media-1',
        response_status: 204,
      })

      expect(result.user_id).toBeNull()
      expect(result.ip_address).toBeNull()
    })

    it('should create audit log with error message', async () => {
      const mockRow = {
        id: 'log-1',
        action: 'execute',
        resource_type: 'workflow',
        resource_id: 'workflow-1',
        user_id: 'user-1',
        ip_address: null,
        user_agent: null,
        request_method: 'POST',
        request_path: '/api/workflow/run',
        request_body: null,
        response_status: 500,
        error_message: 'Connection timeout',
        duration_ms: 5000,
        created_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.createAuditLog({
        action: 'execute',
        resource_type: 'workflow',
        resource_id: 'workflow-1',
        user_id: 'user-1',
        request_method: 'POST',
        request_path: '/api/workflow/run',
        response_status: 500,
        error_message: 'Connection timeout',
        duration_ms: 5000,
      })

      expect(result.error_message).toBe('Connection timeout')
    })
  })

  describe('getAuditLogById', () => {
    it('should return audit log by id', async () => {
      const mockRow = {
        id: 'log-1',
        action: 'create',
        resource_type: 'job',
        resource_id: 'job-1',
        user_id: 'user-1',
        ip_address: null,
        user_agent: null,
        request_method: null,
        request_path: null,
        request_body: null,
        response_status: null,
        error_message: null,
        duration_ms: null,
        created_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditLogById('log-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('log-1')
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditLogById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getAuditLogs', () => {
    it('should return all logs with default pagination', async () => {
      const mockRows = [
        {
          id: 'log-1',
          action: 'create',
          resource_type: 'job',
          resource_id: 'job-1',
          user_id: 'user-1',
          ip_address: null,
          user_agent: null,
          request_method: 'POST',
          request_path: '/api/jobs',
          request_body: null,
          response_status: 200,
          error_message: null,
          duration_ms: 100,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditLogs({})

      expect(result.total).toBe(1)
      expect(result.logs).toHaveLength(1)
    })

    it('should filter by action', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ action: 'create' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('action = $1'),
        expect.arrayContaining(['create'])
      )
    })

    it('should filter by resource_type', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ resource_type: 'cron_job' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('resource_type = $1'),
        expect.arrayContaining(['cron_job'])
      )
    })

    it('should filter by user_id', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ user_id: 'user-1' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        expect.arrayContaining(['user-1'])
      )
    })

    it('should filter by resource_id', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ resource_id: 'job-123' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('resource_id = $1'),
        expect.arrayContaining(['job-123'])
      )
    })

    it('should filter by combined filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({
        action: 'create',
        resource_type: 'cron_job',
        user_id: 'user-1',
        response_status: 200
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('action = $1 AND resource_type = $2 AND user_id = $3 AND response_status = $4'),
        expect.arrayContaining(['create', 'cron_job', 'user-1', 200])
      )
    })

    it('should filter by response_status', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ response_status: 200 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('response_status = $1'),
        expect.arrayContaining([200])
      )
    })

    it('should filter by request_path (LIKE)', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ request_path: '/api/cron' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('request_path LIKE $1'),
        expect.arrayContaining(['%\/api\/cron%'])
      )
    })

    it('should filter by status_filter success', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '8' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ status_filter: 'success' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('response_status >= 200 AND response_status < 300'),
        expect.any(Array)
      )
    })

    it('should filter by status_filter error', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ status_filter: 'error' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('response_status >= 400'),
        expect.any(Array)
      )
    })

    it('should filter by date range', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '15' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-01-31T23:59:59Z',
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $'),
        expect.arrayContaining(['2026-01-01T00:00:00Z', '2026-01-31T23:59:59Z'])
      )
    })

    it('should apply pagination', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ page: 3, limit: 25 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([25, 50])
      )
    })

    it('should sort by duration_ms', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ sort_by: 'duration_ms', sort_order: 'desc' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY duration_ms DESC'),
        expect.any(Array)
      )
    })

    it('should sort by created_at ascending', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAuditLogs({ sort_order: 'asc' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        expect.any(Array)
      )
    })

    it('should include username from user query', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'create',
          resource_type: 'job',
          resource_id: 'job-1',
          user_id: 'user-1',
          ip_address: null,
          user_agent: null,
          request_method: null,
          request_path: null,
          request_body: null,
          response_status: null,
          error_message: null,
          duration_ms: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockLogs as any)
        .mockResolvedValueOnce([{ id: 'user-1', username: 'testuser' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditLogs({})

      expect(result.logs[0].username).toBe('testuser')
    })

    it('should handle logs without user_id (null username)', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'create',
          resource_type: 'job',
          resource_id: 'job-1',
          user_id: null,
          ip_address: null,
          user_agent: null,
          request_method: null,
          request_path: null,
          request_body: null,
          response_status: null,
          error_message: null,
          duration_ms: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockLogs as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditLogs({})

      expect(result.logs[0].username).toBeNull()
      expect(mockDb.query).toHaveBeenCalledTimes(2)
    })
  })

  describe('getAuditStats', () => {
    it('should return stats without user filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([
          { action: 'create', count: '50' },
          { action: 'update', count: '30' },
          { action: 'delete', count: '15' },
          { action: 'execute', count: '5' },
        ] as any)
        .mockResolvedValueOnce([
          { resource_type: 'cron_job', count: '40' },
          { resource_type: 'media', count: '30' },
        ] as any)
        .mockResolvedValueOnce([
          { response_status: '200', count: '80' },
          { response_status: '500', count: '20' },
        ] as any)
        .mockResolvedValueOnce([{ avg_duration: '1500.5' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditStats()

      expect(result.total_logs).toBe(100)
      expect(result.by_action.create).toBe(50)
      expect(result.by_action.update).toBe(30)
      expect(result.by_resource_type['cron_job']).toBe(40)
      expect(result.by_response_status['200']).toBe(80)
      expect(result.avg_duration_ms).toBe(1501)
    })

    it('should return stats with user filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '25' }] as any)
        .mockResolvedValueOnce([{ action: 'create', count: '10' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ avg_duration: '0' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditStats('user-1')

      expect(result.total_logs).toBe(25)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['user-1'])
      )
    })

    it('should handle zero logs', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '0' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ avg_duration: '0' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditStats()

      expect(result.total_logs).toBe(0)
      expect(result.by_action.create).toBe(0)
      expect(result.avg_duration_ms).toBe(0)
    })

    it('should handle missing avg_duration', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditStats()

      expect(result.avg_duration_ms).toBe(0)
    })

    it('should handle response_status null entries', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ avg_duration: '0' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAuditStats()

      expect(result.by_response_status).toEqual({})
    })
  })

  describe('getUniqueRequestPaths', () => {
    it('should return unique request paths', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { request_path: '/api/cron/jobs' },
        { request_path: '/api/media' },
        { request_path: '/api/workflow' },
      ] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueRequestPaths()

      expect(result).toHaveLength(3)
      expect(result).toContain('/api/cron/jobs')
    })

    it('should filter by user', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { request_path: '/api/user-specific' },
      ] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueRequestPaths('user-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        ['user-1']
      )
      expect(result).toHaveLength(1)
    })

    it('should exclude null and empty paths', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { request_path: '/api/valid' },
        { request_path: null },
        { request_path: '' },
      ] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueRequestPaths()

      expect(result).toHaveLength(1)
      expect(result).toContain('/api/valid')
    })
  })

  describe('getUniqueAuditUsers', () => {
    it('should return unique users from audit logs', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ user_id: 'user-1' }, { user_id: 'user-2' }] as any)
        .mockResolvedValueOnce([
          { id: 'user-1', username: 'alice' },
          { id: 'user-2', username: 'bob' },
        ] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueAuditUsers()

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('alice')
    })

    it('should return empty array when no users', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueAuditUsers()

      expect(result).toHaveLength(0)
    })

    it('should filter by user', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ user_id: 'user-1' }] as any)
        .mockResolvedValueOnce([{ id: 'user-1', username: 'testuser' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueAuditUsers('user-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        ['user-1']
      )
      expect(result).toHaveLength(1)
    })

    it('should handle null user_ids in results', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ user_id: 'user-1' }, { user_id: null }, { user_id: null }] as any)
        .mockResolvedValueOnce([{ id: 'user-1', username: 'testuser' }] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getUniqueAuditUsers()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('user-1')
    })
  })

  describe('getAllServiceNodePermissions', () => {
    it('should return all service node permissions', async () => {
      const mockRows = [
        {
          id: 'perm-1',
          service_name: 'MiniMaxService',
          method_name: 'chatCompletion',
          display_name: 'Chat Completion',
          category: 'text',
          min_role: 'user',
          is_enabled: true,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'perm-2',
          service_name: 'VoiceService',
          method_name: 'syncVoice',
          display_name: 'Voice Generation',
          category: 'voice',
          min_role: 'pro',
          is_enabled: 1,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAllServiceNodePermissions()

      expect(result).toHaveLength(2)
      expect(result[0].service_name).toBe('MiniMaxService')
      expect(result[1].is_enabled).toBe(true)
    })

    it('should convert is_enabled integer 0 to boolean false', async () => {
      const mockRows = [
        {
          id: 'perm-1',
          service_name: 'DisabledService',
          method_name: 'disabledMethod',
          display_name: 'Disabled Method',
          category: 'test',
          min_role: 'admin',
          is_enabled: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAllServiceNodePermissions()

      expect(result).toHaveLength(1)
      expect(result[0].is_enabled).toBe(false)
    })

    it('should handle is_enabled as boolean', async () => {
      const mockRows = [
        {
          id: 'perm-1',
          service_name: 'TestService',
          method_name: 'testMethod',
          display_name: 'Test',
          category: 'test',
          min_role: 'user',
          is_enabled: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getAllServiceNodePermissions()

      expect(result[0].is_enabled).toBe(false)
    })

    it('should order by category and display_name', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      await repo.getAllServiceNodePermissions()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY category, display_name')
      )
    })
  })

  describe('getServiceNodePermission', () => {
    it('should return permission by service and method', async () => {
      const mockRow = {
        id: 'perm-1',
        service_name: 'MiniMaxService',
        method_name: 'chatCompletion',
        display_name: 'Chat Completion',
        category: 'text',
        min_role: 'user',
        is_enabled: true,
        created_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getServiceNodePermission('MiniMaxService', 'chatCompletion')

      expect(result).toBeDefined()
      expect(result?.service_name).toBe('MiniMaxService')
      expect(result?.method_name).toBe('chatCompletion')
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getServiceNodePermission('NonExistentService', 'unknown')

      expect(result).toBeNull()
    })

    it('should convert is_enabled integer 0 to boolean false', async () => {
      const mockRow = {
        id: 'perm-1',
        service_name: 'DisabledService',
        method_name: 'disabledMethod',
        display_name: 'Disabled Method',
        category: 'test',
        min_role: 'admin',
        is_enabled: 0,
        created_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new UserRepository(mockDb)
      const result = await repo.getServiceNodePermission('DisabledService', 'disabledMethod')

      expect(result?.is_enabled).toBe(false)
    })
  })

  describe('updateServiceNodePermission', () => {
    it('should update min_role', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.updateServiceNodePermission('perm-1', { min_role: 'admin' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('min_role = $1'),
        expect.arrayContaining(['admin', 'perm-1'])
      )
    })

    it('should update is_enabled for postgres', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.updateServiceNodePermission('perm-1', { is_enabled: false })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('is_enabled = $1'),
        expect.arrayContaining([false, 'perm-1'])
      )
    })

    it('should update is_enabled for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.updateServiceNodePermission('perm-1', { is_enabled: false })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0, 'perm-1'])
      )
    })

    it('should update multiple fields', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.updateServiceNodePermission('perm-1', { min_role: 'pro', is_enabled: true })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('min_role = $1, is_enabled = $2'),
        expect.arrayContaining(['pro', true, 'perm-1'])
      )
    })

    it('should do nothing when no fields provided', async () => {
      const repo = new UserRepository(mockDb)
      await repo.updateServiceNodePermission('perm-1', {})

      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })

  describe('upsertServiceNodePermission', () => {
    it('should upsert permission for postgres', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.upsertServiceNodePermission({
        service_name: 'TestService',
        method_name: 'testMethod',
        display_name: 'Test Method',
        category: 'test',
        min_role: 'user',
        is_enabled: true,
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (service_name, method_name)'),
        expect.arrayContaining(['TestService', 'testMethod', 'Test Method', 'test'])
      )
    })

    it('should upsert permission for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.upsertServiceNodePermission({
        service_name: 'TestService',
        method_name: 'testMethod',
        display_name: 'Test Method',
        category: 'test',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(service_name, method_name)'),
        expect.any(Array)
      )
    })

    it('should use default min_role pro', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.upsertServiceNodePermission({
        service_name: 'TestService',
        method_name: 'testMethod',
        display_name: 'Test',
        category: 'test',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['pro'])
      )
    })

    it('should use default is_enabled true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.upsertServiceNodePermission({
        service_name: 'TestService',
        method_name: 'testMethod',
        display_name: 'Test',
        category: 'test',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([true])
      )
    })

    it('should use explicit is_enabled false', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.upsertServiceNodePermission({
        service_name: 'DisabledService',
        method_name: 'disabledMethod',
        display_name: 'Disabled',
        category: 'test',
        is_enabled: false,
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([false])
      )
    })

    it('should use explicit is_enabled false for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.upsertServiceNodePermission({
        service_name: 'DisabledService',
        method_name: 'disabledMethod',
        display_name: 'Disabled',
        category: 'test',
        is_enabled: false,
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0])
      )
    })
  })

  describe('deleteServiceNodePermission', () => {
    it('should delete permission by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.deleteServiceNodePermission('perm-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM service_node_permissions WHERE id = $1',
        ['perm-1']
      )
    })
  })

  describe('batchUpsertServiceNodePermissions', () => {
    it('should upsert multiple permissions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue({ changes: 1 } as any)

      const repo = new UserRepository(mockDb)
      await repo.batchUpsertServiceNodePermissions([
        { service_name: 'Service1', method_name: 'method1', display_name: 'Method 1', category: 'cat1' },
        { service_name: 'Service2', method_name: 'method2', display_name: 'Method 2', category: 'cat2' },
      ])

      expect(mockDb.execute).toHaveBeenCalledTimes(2)
    })
  })
})