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

describe('UserService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('register', () => {
    it('should create user with valid invitation code', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 1,
          used_count: 1,
          expires_at: null,
          is_active: true
        }])
        .mockResolvedValueOnce([]) // No existing user

      const mockTxExecute = vi.fn().mockResolvedValue({ changes: 1 })

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

      // Mock getUserById
      vi.spyOn(UserService.prototype, 'getUserById' as any).mockResolvedValue({
        id: expect.any(String),
        username: 'testuser',
        email: null,
        minimax_api_key: null,
        minimax_region: 'cn',
        role: 'user' as const,
        is_active: true,
        last_login_at: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      })

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should reject invalid invitation code', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // Atomic UPDATE returns no rows
        .mockResolvedValueOnce([]) // Code not found

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

    it('should reject expired invitation code', async () => {
      // For expired codes, the atomic UPDATE returns empty because expires_at > NOW() fails
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // Atomic UPDATE returns no rows
        .mockResolvedValueOnce([{ used_count: 0, max_uses: 1 }]) // Code exists but expired

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
        invitationCode: 'EXPIRED',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已用完') // Expired codes are treated as fully used
    })

    it('should reject exhausted invitation code', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // Atomic UPDATE returns no rows
        .mockResolvedValueOnce([{ used_count: 1, max_uses: 1 }]) // Code at max

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
        invitationCode: 'USED',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已用完')
    })

    it('should reject password shorter than 6 characters', async () => {
      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: vi.fn(),
            execute: vi.fn(),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: '12345',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('密码至少6位')
    })

    it('should reject when username already exists', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 1,
          used_count: 1,
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

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const mockDb = {
        query: vi.fn()
          .mockResolvedValueOnce([
            {
              id: 'user-1',
              username: 'testuser',
              password_hash: '$2b$12$hash',
              role: 'user',
              is_active: true,
              email: null,
              minimax_api_key: null,
              minimax_region: 'cn',
              last_login_at: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            }
          ]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.login('testuser', 'password123')

      expect(result.success).toBe(true)
      expect(result.user?.username).toBe('testuser')
    })

    it('should reject incorrect password', async () => {
      const mockDb = {
        query: vi.fn()
          .mockResolvedValueOnce([
            {
              id: 'user-1',
              username: 'testuser',
              password_hash: '$2b$12$hash',
              role: 'user',
              is_active: true,
              email: null,
              minimax_api_key: null,
              minimax_region: 'cn',
              last_login_at: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            }
          ]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const bcrypt = await import('bcrypt')
      ;(vi.spyOn(bcrypt, 'compare') as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce(false as never)

      const service = new UserService(mockDb)

      const result = await service.login('testuser', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户名或密码错误')
    })

    it('should reject inactive user', async () => {
      const mockDb = {
        query: vi.fn()
          .mockResolvedValueOnce([
            {
              id: 'user-1',
              username: 'testuser',
              password_hash: '$2b$12$hash',
              role: 'user',
              is_active: false,
              email: null,
              minimax_api_key: null,
              minimax_region: 'cn',
              last_login_at: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            }
          ]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.login('testuser', 'password123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('账户已被禁用')
    })
  })
})
