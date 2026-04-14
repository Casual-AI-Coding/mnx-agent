import { describe, it, expect, vi } from 'vitest'
import { UserService } from '../user-service'
import { DatabaseConnection } from '../../database/connection'

process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'

vi.mock('bcrypt', () => {
  const mockBcrypt = {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedhash'),
    compare: vi.fn().mockResolvedValue(true),
  }
  return {
    default: mockBcrypt,
    ...mockBcrypt,
  }
})

describe('UserService - Invitation Code Race Condition', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Race condition vulnerability test:
   * 
   * The vulnerable pattern:
   * 1. SELECT * FROM invitation_codes WHERE code = 'X'  -- sees used_count=0, max_uses=1
   * 2. (Time passes, another registration happens and increments to used_count=1)
   * 3. UPDATE invitation_codes SET used_count = used_count + 1 WHERE id = 'X'  -- would succeed even though max_uses=1
   * 
   * The fix requires a single atomic UPDATE with WHERE clause:
   * UPDATE invitation_codes SET used_count = used_count + 1 
   * WHERE code = 'X' AND used_count < max_uses
   * RETURNING *
   * 
   * If no rows returned, the code is invalid or fully used.
   */
  describe('atomic invitation code consumption', () => {
    it('should reject registration when code is exhausted (atomic UPDATE returns no rows)', async () => {
      // Mock DB that simulates atomic UPDATE returning empty (code exhausted)
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // Atomic UPDATE returns no rows (code exhausted)
        .mockResolvedValueOnce([{ used_count: 1, max_uses: 1, expires_at: null, is_active: true }]) // Check why failed

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: vi.fn().mockResolvedValue({ changes: 0 }),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已用完')
    })

    it('should reject invalid code (atomic UPDATE returns no rows and code does not exist)', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // Atomic UPDATE returns no rows (code doesn't exist)
        .mockResolvedValueOnce([]) // Check why failed - code not found

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: vi.fn().mockResolvedValue({ changes: 0 }),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'INVALID',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码无效')
    })

    it('should consume code atomically when code has remaining uses', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 5,
          used_count: 1,
          expires_at: null,
          is_active: true
        }])
        .mockResolvedValueOnce([]) // No existing user

      const mockTxExecute = vi.fn()
        .mockResolvedValueOnce({ changes: 1 }) // user insert

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: mockTxExecute,
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      // Mock getUserById which uses this.conn (not transaction)
      vi.spyOn(UserService.prototype, 'getUserById' as any).mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        email: null,
        minimax_api_key: null,
        minimax_region: 'cn',
        role: 'user' as const,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      })

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('testuser')
    })

    it('should rollback if username already exists', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 1,
          used_count: 0,
          expires_at: null,
          is_active: true
        }])
        .mockResolvedValueOnce([{ id: 'existing-user-id' }]) // User exists

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: vi.fn().mockResolvedValue({ changes: 0 }),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'existinguser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户名已存在')
    })
  })

  describe('concurrent registration simulation', () => {
    it('should not allow more registrations than max_uses even with concurrent calls', async () => {
      // This test verifies the atomic behavior:
      // - The atomic UPDATE uses WHERE used_count < max_uses
      // - When max_uses=1 and used_count=0, UPDATE succeeds (returns row)
      // - When used_count=1, UPDATE fails (no row returned)
      
      // First call: code is available (used_count=0, max_uses=1)
      // Chain all tx.query calls: atomic UPDATE + username check
      const mockTxQuery1 = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'SINGLE_USE',
          max_uses: 1,
          used_count: 1, // incremented from 0 to 1
          expires_at: null,
          is_active: true
        }])
        .mockResolvedValueOnce([]) // No existing user

      const mockDb1 = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery1,
            execute: vi.fn().mockResolvedValue({ changes: 1 }),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      // Second call: code is exhausted (UPDATE returns empty)
      // Chain all tx.query calls: atomic UPDATE + check why failed
      const mockTxQuery2 = vi.fn()
        .mockResolvedValueOnce([]) // Atomic UPDATE returns no rows - code exhausted
        .mockResolvedValueOnce([{ used_count: 1, max_uses: 1, expires_at: null, is_active: true }]) // Check why failed

      const mockDb2 = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery2,
            execute: vi.fn().mockResolvedValue({ changes: 0 }),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      // Mock getUserById
      vi.spyOn(UserService.prototype, 'getUserById' as any).mockResolvedValue({
        id: 'user-1',
        username: 'user1',
        email: null,
        minimax_api_key: null,
        minimax_region: 'cn',
        role: 'user' as const,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      })

      const service1 = new UserService(mockDb1)
      const service2 = new UserService(mockDb2)

      // First registration should succeed
      const result1 = await service1.register({
        username: 'user1',
        password: 'password123',
        invitationCode: 'SINGLE_USE',
      })

      // Second registration should fail because atomic UPDATE returns no rows
      const result2 = await service2.register({
        username: 'user2',
        password: 'password123',
        invitationCode: 'SINGLE_USE',
      })

      // The key assertion: with atomic UPDATE...RETURNING,
      // only one registration succeeds even though both passed initial validation
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('邀请码已用完')
    })
  })
})
