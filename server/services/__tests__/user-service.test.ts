import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'

process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'

const REAL_HASH_FOR_PASSWORD123 = '$2b$12$DgXyxiBTYSZxDLO.mHHiwOCqSCQNFfCvSMTGmbI0oBV35GeusVGFa'

vi.mock('bcrypt', async (importOriginal) => {
  const original = await importOriginal<typeof import('bcrypt')>()
  return {
    ...original,
    hash: vi.fn().mockResolvedValue('$2b$12$mockedhash'),
    compare: vi.fn((password: string, hash: string) => {
      if (hash === REAL_HASH_FOR_PASSWORD123) {
        return Promise.resolve(password === 'password123')
      }
      return original.compare(password, hash)
    }),
  }
})

import { UserService } from '../user-service'
import { DatabaseConnection } from '../../database/connection'

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        .mockResolvedValueOnce([])

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
      expect(result.user?.username).toBe('testuser')
    })

    it('should reject invalid invitation code', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: vi.fn().mockResolvedValue([]),
            execute: vi.fn(),
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

    it('should reject password less than 6 characters', async () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: '12345',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('密码至少6位')
    })

    it('should reject fully used invitation code', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // consumedCode UPDATE returns empty (fully used)
        .mockResolvedValueOnce([{ used_count: 5, max_uses: 5, expires_at: null, is_active: true }]) // existingCode SELECT

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: vi.fn(),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'USED123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已用完')
    })

    it('should reject expired invitation code', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // consumedCode UPDATE returns empty (expired, UPDATE condition fails)
        .mockResolvedValueOnce([{ used_count: 0, max_uses: 1, expires_at: '2020-01-01T00:00:00Z', is_active: true }]) // existingCode SELECT

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: vi.fn(),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'EXPIRED123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已过期')
    })

    it('should reject duplicate username', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 1,
          used_count: 1,
          expires_at: null,
          is_active: true
        }])
        .mockResolvedValueOnce([{ id: 'existing-user' }])

      const mockTxExecute = vi.fn()

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

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'existinguser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户名已存在')
    })

    it('should create user with email provided', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 1,
          used_count: 1,
          expires_at: null,
          is_active: true
        }])
        .mockResolvedValueOnce([])

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

      vi.spyOn(UserService.prototype, 'getUserById' as any).mockResolvedValue({
        id: expect.any(String),
        username: 'testuser',
        email: 'test@example.com',
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
        email: 'test@example.com',
      })

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('test@example.com')
    })

    it('should create user with invitation code having valid expiration date', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([{
          id: 'code-1',
          code: 'TEST123',
          max_uses: 1,
          used_count: 1,
          expires_at: futureDate,
          is_active: true
        }])
        .mockResolvedValueOnce([])

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
              password_hash: REAL_HASH_FOR_PASSWORD123,
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
              password_hash: REAL_HASH_FOR_PASSWORD123,
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
              password_hash: REAL_HASH_FOR_PASSWORD123,
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
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.login('testuser', 'password123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('账户已被禁用')
    })

    it('should reject non-existent user', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.login('nonexistent', 'password123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户名或密码错误')
    })
  })

  describe('getUserById', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('should return user by id', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValueOnce([
          {
            id: 'user-1',
            username: 'testuser',
            password_hash: 'hash',
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
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const user = await service.getUserById('user-1')

      expect(user).not.toBeNull()
      expect(user?.username).toBe('testuser')
    })

    it('should return null for non-existent user', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValueOnce([]),
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const user = await service.getUserById('non-existent')

      expect(user).toBeNull()
    })
  })

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const token = service.generateAccessToken({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const token = service.generateRefreshToken({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })
  })

  describe('register', () => {
    it('should reject inactive invitation code', async () => {
      const mockTxQuery = vi.fn()
        .mockResolvedValueOnce([]) // consumedCode UPDATE returns empty (inactive code)
        .mockResolvedValueOnce([{ used_count: 0, max_uses: 10, expires_at: null, is_active: false }]) // existingCode SELECT

      const mockDb = {
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(async (fn: (conn: DatabaseConnection) => Promise<unknown>) => {
          const txConnection = {
            query: mockTxQuery,
            execute: vi.fn(),
          }
          return await fn(txConnection as unknown as DatabaseConnection)
        }),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'INACTIVE123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已失效')
    })
  })

  describe('updateUser', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('should update user minimax_api_key', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([{
          id: 'user-1',
          username: 'testuser',
          email: null,
          minimax_api_key: 'new-api-key',
          minimax_region: 'cn',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.updateUser('user-1', { minimax_api_key: 'new-api-key' })

      expect(result).not.toBeNull()
      expect(result?.minimax_api_key).toBe('new-api-key')
    })

    it('should update user minimax_region', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([{
          id: 'user-1',
          username: 'testuser',
          email: null,
          minimax_api_key: null,
          minimax_region: 'international',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.updateUser('user-1', { minimax_region: 'international' })

      expect(result).not.toBeNull()
      expect(result?.minimax_region).toBe('international')
    })

    it('should return existing user when no updates provided', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValueOnce([{
          id: 'user-1',
          username: 'testuser',
          email: null,
          minimax_api_key: null,
          minimax_region: 'cn',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }]),
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.updateUser('user-1', {})

      expect(result).not.toBeNull()
      expect(result?.username).toBe('testuser')
    })

    it('should update both minimax_api_key and minimax_region', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([{
          id: 'user-1',
          username: 'testuser',
          email: null,
          minimax_api_key: 'new-api-key',
          minimax_region: 'international',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.updateUser('user-1', {
        minimax_api_key: 'new-api-key',
        minimax_region: 'international'
      })

      expect(result).not.toBeNull()
      expect(result?.minimax_api_key).toBe('new-api-key')
      expect(result?.minimax_region).toBe('international')
    })

    it('should set minimax_api_key to null', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([{
          id: 'user-1',
          username: 'testuser',
          email: null,
          minimax_api_key: null,
          minimax_region: 'cn',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.updateUser('user-1', { minimax_api_key: null })

      expect(result).not.toBeNull()
      expect(result?.minimax_api_key).toBeNull()
    })
  })

  describe('changePassword', () => {
    it('should reject new password less than 6 characters', async () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const result = await service.changePassword('user-1', 'oldpassword', '12345')

      expect(result.success).toBe(false)
      expect(result.error).toBe('密码至少6位')
    })

    it('should reject non-existent user', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.changePassword('non-existent', 'oldpassword', 'newpassword123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户不存在')
    })

    it('should reject incorrect old password', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValueOnce([{
          id: 'user-1',
          password_hash: REAL_HASH_FOR_PASSWORD123,
        }]),
        execute: vi.fn(),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.changePassword('user-1', 'wrongpassword', 'newpassword123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('原密码错误')
    })

    it('should change password successfully', async () => {
      const mockDb = {
        query: vi.fn()
          .mockResolvedValueOnce([{
            id: 'user-1',
            password_hash: REAL_HASH_FOR_PASSWORD123,
          }])
          .mockResolvedValueOnce([]) // UPDATE result
          .mockResolvedValueOnce([{
            id: 'user-1',
            username: 'testuser',
            email: null,
            minimax_api_key: null,
            minimax_region: 'cn',
            role: 'user',
            is_active: true,
            last_login_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          }]),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        transaction: vi.fn((fn) => fn(mockDb)),
        isPostgres: vi.fn().mockReturnValue(true),
      } as unknown as DatabaseConnection

      const service = new UserService(mockDb)

      const result = await service.changePassword('user-1', 'password123', 'newpassword123')

      expect(result.success).toBe(true)
    })
  })

  describe('getSecret', () => {
    it('should throw error when JWT_SECRET is undefined', () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      expect(() => (service as any).getSecret()).toThrow('JWT_SECRET environment variable is required')

      process.env.JWT_SECRET = originalSecret
    })
  })

  describe('verifyToken (static)', () => {
    it('should return null when JWT_SECRET is undefined', () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      const result = UserService.verifyToken('some-token')

      expect(result).toBeNull()

      process.env.JWT_SECRET = originalSecret
    })

    it('should return null for invalid token', () => {
      const result = UserService.verifyToken('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null for refresh token passed as access token', () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const refreshToken = service.generateRefreshToken({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      })

      const result = UserService.verifyToken(refreshToken)

      expect(result).toBeNull()
    })

    it('should return payload for valid access token', () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const accessToken = service.generateAccessToken({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      })

      const result = UserService.verifyToken(accessToken)

      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user-1')
      expect(result?.username).toBe('testuser')
      expect(result?.role).toBe('user')
    })
  })

  describe('verifyRefreshToken (static)', () => {
    it('should return null when JWT_SECRET is undefined', () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      const result = UserService.verifyRefreshToken('some-token')

      expect(result).toBeNull()

      process.env.JWT_SECRET = originalSecret
    })

    it('should return null for invalid token', () => {
      const result = UserService.verifyRefreshToken('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null for access token passed as refresh token', () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const accessToken = service.generateAccessToken({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      })

      const result = UserService.verifyRefreshToken(accessToken)

      expect(result).toBeNull()
    })

    it('should return payload for valid refresh token', () => {
      const mockDb = {} as unknown as DatabaseConnection
      const service = new UserService(mockDb)

      const refreshToken = service.generateRefreshToken({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      })

      const result = UserService.verifyRefreshToken(refreshToken)

      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user-1')
      expect(result?.username).toBe('testuser')
      expect(result?.role).toBe('user')
      expect(result?.type).toBe('refresh')
    })
  })
})