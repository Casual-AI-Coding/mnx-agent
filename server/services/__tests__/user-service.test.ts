import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../user-service'
import { DatabaseConnection } from '../../database/connection'

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

const mockDb = {
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn) => fn(mockDb)),
  isPostgres: vi.fn().mockReturnValue(true),
  isSqlite: vi.fn().mockReturnValue(false),
} as unknown as DatabaseConnection

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UserService(mockDb)
  })

  describe('register', () => {
    it('should create user with valid invitation code', async () => {
      mockDb.query = vi.fn()
        .mockResolvedValueOnce([
          { id: 'code-1', code: 'TEST123', max_uses: 1, used_count: 0, expires_at: null, is_active: true }
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          id: expect.any(String),
          username: 'testuser',
          email: null,
          minimax_api_key: null,
          minimax_region: 'cn',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: expect.any(String),
          updated_at: expect.any(String),
        }])
      mockDb.execute = vi.fn().mockResolvedValue({ changes: 1 })

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should reject invalid invitation code', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([])

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'INVALID',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码无效')
    })

    it('should reject expired invitation code', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([
        { id: 'code-1', code: 'EXPIRED', max_uses: 1, used_count: 0, expires_at: '2020-01-01T00:00:00Z', is_active: true }
      ])

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'EXPIRED',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已过期')
    })

    it('should reject exhausted invitation code', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([
        { id: 'code-1', code: 'USED', max_uses: 1, used_count: 1, expires_at: null, is_active: true }
      ])

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'USED',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('邀请码已用完')
    })

    it('should reject password shorter than 6 characters', async () => {
      const result = await service.register({
        username: 'testuser',
        password: '12345',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('密码至少6位')
    })
  })

  describe('login', () => {
    it('should login with correct credentials', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([
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
      ])

      const result = await service.login('testuser', 'password123')

      expect(result.success).toBe(true)
      expect(result.user?.username).toBe('testuser')
    })

    it('should reject incorrect password', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([
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
      ])

      const bcrypt = await import('bcrypt')
      ;(vi.spyOn(bcrypt, 'compare') as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce(false as never)

      const result = await service.login('testuser', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户名或密码错误')
    })

    it('should reject inactive user', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([
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
      ])

      const result = await service.login('testuser', 'password123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('账户已被禁用')
    })
  })
})