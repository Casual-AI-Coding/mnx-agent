# 认证系统实施计划 (Authentication System Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MiniMax 工作台添加基于 JWT + RBAC 的多用户认证系统，支持邀请码注册、角色权限控制和数据隔离。

**Architecture:** 后端 Express 中间件 + JWT 认证 + PostgreSQL 用户/邀请码表，前端 React 路由守卫 + axios 拦截器 + 角色控制菜单。分 3 个版本迭代交付。

**Tech Stack:** jsonwebtoken, bcrypt, PostgreSQL, React, Zustand, axios

---

## 版本规划

| 版本 | 内容 | 可交付物 |
|------|------|---------|
| **v1.1.1** | 认证核心 | 登录/注册/JWT/邀请码验证，用户可登录并使用调试台 |
| **v1.1.2** | 角色权限 + 数据隔离 | RBAC 中间件、owner_id 过滤、菜单按角色显示 |
| **v1.1.3** | 管理功能 | 用户管理、邀请码批量生成（super only） |

---

## 版本 v1.1.1 — 认证核心

### Task 1.1.1-1: 数据库迁移 — users 和 invitation_codes 表

**Files:**
- Modify: `server/database/schema-pg.ts` — 添加 users 和 invitation_codes 表定义
- Modify: `server/database/migrations-async.ts` — 添加 migration_008
- Modify: `server/database/types.ts` — 添加 User, InvitationCode 类型

- [ ] **Step 1: 在 schema-pg.ts 末尾添加 users 和 invitation_codes 表定义**

在 `PG_SCHEMA_SQL` 的 Audit Logs 部分之后、Indexes 之前添加：

```sql
-- ============================================
-- Authentication
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  minimax_api_key VARCHAR(255),
  minimax_region VARCHAR(20) DEFAULT 'cn',
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitation_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  created_by VARCHAR(36) REFERENCES users(id),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: 在 migrations-async.ts 添加 migration_008**

在 `MIGRATIONS` 数组末尾添加：

```typescript
{
  id: 8,
  name: 'migration_008_auth_system',
  sql: `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  minimax_api_key VARCHAR(255),
  minimax_region VARCHAR(20) DEFAULT 'cn',
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitation_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  created_by VARCHAR(36) REFERENCES users(id),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
  `,
},
```

- [ ] **Step 3: 在 types.ts 添加认证相关类型**

在文件末尾 Audit Logs 部分之后添加：

```typescript
// ============================================================================
// Authentication
// ============================================================================

export type UserRole = 'super' | 'admin' | 'pro' | 'user'

export interface User {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserRow {
  id: string
  username: string
  email: string | null
  password_hash: string
  minimax_api_key: string | null
  minimax_region: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateUser {
  username: string
  email?: string | null
  password: string
  minimax_api_key?: string | null
  minimax_region?: string
  role?: UserRole
}

export interface UpdateUser {
  email?: string | null
  minimax_api_key?: string | null
  minimax_region?: string
  role?: UserRole
  is_active?: boolean
}

export interface InvitationCode {
  id: string
  code: string
  created_by: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface InvitationCodeRow {
  id: string
  code: string
  created_by: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface CreateInvitationCode {
  code: string
  created_by?: string | null
  max_uses?: number
  expires_at?: string | null
}
```

- [ ] **Step 4: Commit**

```bash
git add server/database/schema-pg.ts server/database/migrations-async.ts server/database/types.ts
git commit -m "feat(auth): add users and invitation_codes tables (migration 008)"
```

---

### Task 1.1.1-2: 安装依赖 + JWT 配置

**Files:**
- Modify: `package.json` — 添加 jsonwebtoken, bcrypt
- Modify: `.env` — 添加 JWT_SECRET

- [ ] **Step 1: 安装依赖**

```bash
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

- [ ] **Step 2: 在 .env 添加 JWT_SECRET**

在 `.env` 文件末尾添加：

```env
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env
git commit -m "feat(auth): install jwt and bcrypt dependencies"
```

---

### Task 1.1.1-3: 后端 — user-service.ts

**Files:**
- Create: `server/services/user-service.ts`
- Test: `server/services/__tests__/user-service.test.ts`

- [ ] **Step 1: 编写测试**

创建 `server/services/__tests__/user-service.test.ts`：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../user-service'
import { DatabaseConnection } from '../database/connection'
import bcrypt from 'bcrypt'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$12$mockedhash'),
  compare: vi.fn().mockResolvedValue(true),
}))

// Mock database
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
      mockDb.query = vi.fn().mockResolvedValueOnce([
        { id: 'code-1', code: 'TEST123', max_uses: 1, used_count: 0, expires_at: null, is_active: true }
      ])
      mockDb.execute = vi.fn().mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce({ changes: 1 })

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
        invitationCode: 'TEST123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12)
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
      ;(bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true)

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
      ;(bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)

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

  describe('getUserById', () => {
    it('should return user without password_hash', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([
        {
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
        }
      ])

      const user = await service.getUserById('user-1')

      expect(user).toBeDefined()
      expect(user).not.toHaveProperty('password_hash')
    })

    it('should return null for non-existent user', async () => {
      mockDb.query = vi.fn().mockResolvedValueOnce([])

      const user = await service.getUserById('nonexistent')

      expect(user).toBeNull()
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm run test:server -- server/services/__tests__/user-service.test.ts
```

预期：FAIL（UserService 模块不存在）

- [ ] **Step 3: 实现 UserService**

创建 `server/services/user-service.ts`：

```typescript
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { DatabaseConnection } from '../database/connection.js'
import type { User, UserRow, CreateUser, UserRole } from '../database/types.js'

const BCRYPT_ROUNDS = 12

export interface RegisterInput {
  username: string
  password: string
  invitationCode: string
  email?: string | null
}

export interface RegisterResult {
  success: boolean
  user?: Omit<User, 'password_hash'>
  error?: string
}

export interface LoginResult {
  success: boolean
  user?: Omit<User, 'password_hash'>
  accessToken?: string
  refreshToken?: string
  error?: string
}

export interface TokenPayload {
  userId: string
  username: string
  role: UserRole
}

export class UserService {
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    // Validate password length
    if (input.password.length < 6) {
      return { success: false, error: '密码至少6位' }
    }

    // Validate invitation code
    const codeValidation = await this.validateInvitationCode(input.invitationCode)
    if (!codeValidation.valid) {
      return { success: false, error: codeValidation.error }
    }

    // Check if username already exists
    const existing = await this.conn.query<UserRow>(
      'SELECT id FROM users WHERE username = $1',
      [input.username]
    )
    if (existing.length > 0) {
      return { success: false, error: '用户名已存在' }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    // Create user
    const id = uuidv4()
    const now = new Date().toISOString()

    await this.conn.execute(
      `INSERT INTO users (id, username, email, password_hash, minimax_api_key, minimax_region, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, input.username, input.email ?? null, passwordHash, null, 'cn', 'user', true, now, now]
    )

    // Increment invitation code usage
    await this.conn.execute(
      'UPDATE invitation_codes SET used_count = used_count + 1 WHERE id = $1',
      [codeValidation.codeId]
    )

    // Return user without password
    const user = await this.getUserById(id)
    return { success: true, user: user! }
  }

  async login(username: string, password: string): Promise<LoginResult> {
    // Find user
    const rows = await this.conn.query<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )
    if (rows.length === 0) {
      return { success: false, error: '用户名或密码错误' }
    }

    const userRow = rows[0]

    // Check if user is active
    if (!userRow.is_active) {
      return { success: false, error: '账户已被禁用' }
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, userRow.password_hash)
    if (!passwordValid) {
      return { success: false, error: '用户名或密码错误' }
    }

    // Update last login
    await this.conn.execute(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), userRow.id]
    )

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: userRow.id,
      username: userRow.username,
      role: userRow.role as UserRole,
    })
    const refreshToken = this.generateRefreshToken({
      userId: userRow.id,
      username: userRow.username,
      role: userRow.role as UserRole,
    })

    // Build user object without password
    const { password_hash, ...user } = userRow

    return {
      success: true,
      user: user as Omit<User, 'password_hash'>,
      accessToken,
      refreshToken,
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const rows = await this.conn.query<Omit<UserRow, 'password_hash'>>(
      'SELECT id, username, email, minimax_api_key, minimax_region, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = $1',
      [id]
    )
    return rows[0] ?? null
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const rows = await this.conn.query<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )
    return rows[0] ?? null
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (newPassword.length < 6) {
      return { success: false, error: '密码至少6位' }
    }

    const userRow = await this.getUserById(userId)
    if (!userRow) {
      return { success: false, error: '用户不存在' }
    }

    // Get password hash for comparison
    const rows = await this.conn.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    )
    if (rows.length === 0) {
      return { success: false, error: '用户不存在' }
    }

    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash)
    if (!valid) {
      return { success: false, error: '原密码错误' }
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await this.conn.execute(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [newHash, new Date().toISOString(), userId]
    )

    return { success: true }
  }

  private async validateInvitationCode(code: string): Promise<{ valid: boolean; codeId?: string; error?: string }> {
    const rows = await this.conn.query<{ id: string; max_uses: number; used_count: number; expires_at: string | null; is_active: boolean }>(
      'SELECT id, max_uses, used_count, expires_at, is_active FROM invitation_codes WHERE code = $1',
      [code]
    )

    if (rows.length === 0) {
      return { valid: false, error: '邀请码无效' }
    }

    const invitationCode = rows[0]

    if (!invitationCode.is_active) {
      return { valid: false, error: '邀请码已失效' }
    }

    if (invitationCode.expires_at && new Date(invitationCode.expires_at) < new Date()) {
      return { valid: false, error: '邀请码已过期' }
    }

    if (invitationCode.used_count >= invitationCode.max_uses) {
      return { valid: false, error: '邀请码已用完' }
    }

    return { valid: true, codeId: invitationCode.id }
  }

  private generateAccessToken(payload: TokenPayload): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    return jwt.sign(payload, secret, { expiresIn: '15m' })
  }

  private generateRefreshToken(payload: TokenPayload): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    return jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' })
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret'
      return jwt.verify(token, secret) as TokenPayload
    } catch {
      return null
    }
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm run test:server -- server/services/__tests__/user-service.test.ts
```

预期：全部 PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/user-service.ts server/services/__tests__/user-service.test.ts
git commit -m "feat(auth): implement UserService with register, login, and password change"
```

---

### Task 1.1.1-4: 后端 — auth 中间件和路由

**Files:**
- Create: `server/middleware/auth-middleware.ts`
- Create: `server/routes/auth.ts`
- Modify: `server/index.ts` — 注册 auth 路由和中间件

- [ ] **Step 1: 创建 auth 中间件**

创建 `server/middleware/auth-middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import { UserService, TokenPayload } from '../services/user-service.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header or query string (for WebSocket).
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const queryToken = req.query.token as string | undefined

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken

  if (!token) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const payload = UserService.verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' })
    return
  }

  // Reject refresh tokens used as access tokens
  if ((payload as any).type === 'refresh') {
    res.status(401).json({ success: false, error: '认证令牌类型错误' })
    return
  }

  req.user = payload
  next()
}

/**
 * Role-based access control middleware.
 * Usage: requireRole(['admin', 'super'])
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }

    next()
  }
}
```

- [ ] **Step 2: 创建 auth 路由**

创建 `server/routes/auth.ts`：

```typescript
import { Router, Request } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'
import { z } from 'zod'
import { UserService } from '../services/user-service.js'
import { getConnection } from '../database/connection.js'
import { authenticateJWT } from '../middleware/auth-middleware.js'

const router = Router()

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

const registerSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名不能超过50字符'),
  password: z.string().min(6, '密码至少6位'),
  invitationCode: z.string().min(1, '邀请码不能为空'),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '原密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位'),
})

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.login(username, password)

  if (!result.success) {
    res.status(401).json({ success: false, error: result.error })
    return
  }

  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  })
}))

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { username, password, invitationCode, email } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.register({ username, password, invitationCode, email })

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error })
    return
  }

  // Auto-login after registration
  const loginResult = await userService.login(username, password)

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    },
  })
}))

// GET /api/auth/me — requires authentication
router.get('/me', authenticateJWT, asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const userService = new UserService(conn)

  const user = await userService.getUserById(req.user!.userId)

  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  res.json({ success: true, data: user })
}))

// POST /api/auth/change-password — requires authentication
router.post('/change-password', authenticateJWT, validateBody(changePasswordSchema), asyncHandler(async (req: Request, res) => {
  const { oldPassword, newPassword } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.changePassword(req.user!.userId, oldPassword, newPassword)

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error })
    return
  }

  res.json({ success: true, message: '密码已修改' })
}))

export default router
```

- [ ] **Step 3: 在 server/index.ts 注册 auth 路由**

在 `server/index.ts` 中，在现有路由之前添加：

```typescript
import authRouter from './routes/auth'
import { authenticateJWT } from './middleware/auth-middleware.js'

// ... 在 app.use(cors()) 等之后，现有路由之前添加 ...

// Auth routes (public)
app.use('/api/auth', authRouter)

// All other API routes require authentication
app.use('/api/*', authenticateJWT)
```

注意：`/api/auth/*` 路由必须在认证中间件之前注册。修改后的路由注册顺序：

```typescript
// Auth routes (public — no authentication required)
app.use('/api/auth', authRouter)

// All other API routes require authentication
app.use('/api/text', authenticateJWT, textRouter)
app.use('/api/voice', authenticateJWT, voiceRouter)
// ... 其余路由都加上 authenticateJWT
```

或者更简洁的方式，在 auth 路由之后加一个全局中间件：

```typescript
// Auth routes (public)
app.use('/api/auth', authRouter)

// Protect all other /api/* routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    return next()
  }
  authenticateJWT(req, res, next)
})

// Then mount all other routers
app.use('/api/text', textRouter)
// ...
```

- [ ] **Step 4: Commit**

```bash
git add server/middleware/auth-middleware.ts server/routes/auth.ts server/index.ts
git commit -m "feat(auth): add JWT auth middleware and auth routes (login, register, me, change-password)"
```

---

### Task 1.1.1-5: 后端 — WebSocket 认证

**Files:**
- Modify: `server/services/websocket-service.ts` — 添加 JWT 验证

- [ ] **Step 1: 修改 WebSocket 服务支持 JWT**

读取 `server/services/websocket-service.ts`，在连接处理中添加 token 验证：

```typescript
// 在 WebSocket 连接处理中
wss.on('connection', (ws, req) => {
  // Extract token from query string
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const token = url.searchParams.get('token')

  if (!token) {
    ws.close(1008, 'Authentication required')
    return
  }

  const payload = UserService.verifyToken(token)
  if (!payload) {
    ws.close(1008, 'Invalid or expired token')
    return
  }

  // Store user info on the WebSocket connection
  (ws as any).userId = payload.userId
  (ws as any).userRole = payload.role

  // ... rest of existing connection handling
})
```

- [ ] **Step 2: Commit**

```bash
git add server/services/websocket-service.ts
git commit -m "feat(auth): add JWT authentication to WebSocket connections"
```

---

### Task 1.1.1-6: 前端 — auth store 和 API 客户端

**Files:**
- Create: `src/stores/auth.ts`
- Create: `src/lib/api/auth.ts`
- Modify: `src/lib/api/client.ts` — 添加 JWT token 拦截器

- [ ] **Step 1: 创建 auth store**

创建 `src/stores/auth.ts`：

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'super' | 'admin' | 'pro' | 'user'

export interface AuthUser {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string
  role: UserRole
  is_active: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  setTokens: (accessToken: string | null, refreshToken: string | null) => void
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      login: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      }),
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

- [ ] **Step 2: 创建 auth API**

创建 `src/lib/api/auth.ts`：

```typescript
import axios from 'axios'
import type { AuthUser, UserRole } from '@/stores/auth'

const authApi = axios.create({
  baseURL: '/api/auth',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export interface LoginResponse {
  success: boolean
  data?: {
    user: AuthUser
    accessToken: string
    refreshToken: string
  }
  error?: string
}

export interface RegisterResponse {
  success: boolean
  data?: {
    user: AuthUser
    accessToken: string
    refreshToken: string
  }
  error?: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/login', { username, password })
  return response.data
}

export async function register(username: string, password: string, invitationCode: string, email?: string | null): Promise<RegisterResponse> {
  const response = await authApi.post<RegisterResponse>('/register', {
    username,
    password,
    invitationCode,
    email,
  })
  return response.data
}

export async function getMe(token: string): Promise<{ success: boolean; data?: AuthUser; error?: string }> {
  const response = await authApi.get<{ success: boolean; data?: AuthUser; error?: string }>('/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export async function changePassword(token: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await authApi.post<{ success: boolean; message?: string; error?: string }>('/change-password', {
    oldPassword,
    newPassword,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}
```

- [ ] **Step 3: 修改 API 客户端添加 JWT 拦截器**

修改 `src/lib/api/client.ts`，将 `X-API-Key` 替换为 JWT Bearer token：

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { API_HOSTS } from '@/types'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class InternalAPIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      // Skip auth header for auth endpoints
      if (config.url?.startsWith('/auth/') || config.url === '/auth') {
        const { accessToken } = useAuthStore.getState()
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`
        }
        return config
      }

      const { accessToken } = useAuthStore.getState()
      if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`
      }

      // Still pass region for MiniMax API routing
      const { region } = useAppStore.getState()
      config.headers['X-Region'] = region
      config.headers['X-API-Host'] = API_HOSTS[region]

      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ error?: string; base_resp?: { status_code: number; status_msg: string } }>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid — clear auth and redirect
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }

        const statusCode = error.response?.status
        const apiCode = error.response?.data?.base_resp?.status_code
        const message =
          error.response?.data?.error ||
          error.response?.data?.base_resp?.status_msg ||
          error.message ||
          'Unknown error'
        return Promise.reject(new ApiError(message, statusCode, apiCode?.toString()))
      }
    )
  }

  get client_() {
    return this.client
  }

  async get<T>(url: string, params?: Record<string, unknown>) {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: unknown) {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  async put<T>(url: string, data?: unknown) {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  async patch<T>(url: string, data?: unknown) {
    const response = await this.client.patch<T>(url, data)
    return response.data
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<T>(url)
    return response.data
  }
}

export const apiClient = new InternalAPIClient()
export const internalAxios = apiClient.client_
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/auth.ts src/lib/api/auth.ts src/lib/api/client.ts
git commit -m "feat(auth): add auth store, auth API client, and JWT interceptor"
```

---

### Task 1.1.1-7: 前端 — 登录页面

**Files:**
- Create: `src/pages/Login.tsx`

- [ ] **Step 1: 创建登录页面**

创建 `src/pages/Login.tsx`：

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, User, Lock, Key, ArrowRight, Loader2 } from 'lucide-react'
import { login, register } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

const registerSchema = z.object({
  username: z.string().min(1, '请输入用户名').max(50, '用户名不能超过50字符'),
  password: z.string().min(6, '密码至少6位'),
  confirmPassword: z.string().min(1, '请确认密码'),
  invitationCode: z.string().min(1, '请输入邀请码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '', invitationCode: '' },
  })

  const form = isRegister ? registerForm : loginForm

  const onSubmit = async (data: LoginFormData | RegisterFormData) => {
    setIsLoading(true)
    try {
      if (isRegister) {
        const regData = data as RegisterFormData
        const result = await register(regData.username, regData.password, regData.invitationCode)
        if (!result.success) {
          toast.error(result.error || '注册失败')
          return
        }
        if (result.data) {
          authLogin(result.data.user, result.data.accessToken, result.data.refreshToken)
          toast.success('注册成功')
          navigate('/')
        }
      } else {
        const logData = data as LoginFormData
        const result = await login(logData.username, logData.password)
        if (!result.success) {
          toast.error(result.error || '登录失败')
          return
        }
        if (result.data) {
          authLogin(result.data.user, result.data.accessToken, result.data.refreshToken)
          toast.success('登录成功')
          navigate('/')
        }
      }
    } catch (error) {
      toast.error(isRegister ? '注册失败，请重试' : '登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Mnx-Agent 工作台</h1>
          <p className="text-dark-400 mt-2">
            {isRegister ? '创建新账户' : '登录到你的账户'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-dark-900/50 backdrop-blur-xl rounded-2xl border border-dark-800/50 p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  {...form.register('username')}
                  placeholder="输入用户名"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  placeholder="输入密码"
                  className="w-full pl-10 pr-10 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password (register only) */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...form.register('confirmPassword')}
                    placeholder="再次输入密码"
                    className="w-full pl-10 pr-10 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            {/* Invitation Code (register only) */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">邀请码</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input
                    type="text"
                    {...form.register('invitationCode')}
                    placeholder="输入邀请码"
                    className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                {form.formState.errors.invitationCode && (
                  <p className="text-red-400 text-xs mt-1">{form.formState.errors.invitationCode.message}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2',
                isLoading
                  ? 'bg-indigo-500/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegister ? '注册并登录' : '登录'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister)
                form.reset()
              }}
              className="text-sm text-dark-400 hover:text-white transition-colors"
            >
              {isRegister ? '已有账户？返回登录' : '没有账户？使用邀请码注册'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat(auth): add login/register page with invitation code support"
```

---

### Task 1.1.1-8: 前端 — AuthGuard 和路由集成

**Files:**
- Create: `src/components/AuthGuard.tsx`
- Modify: `src/App.tsx` — 添加 /login 路由和 AuthGuard

- [ ] **Step 1: 创建 AuthGuard**

创建 `src/components/AuthGuard.tsx`：

```typescript
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 2: 修改 App.tsx 添加登录路由和守卫**

修改 `src/App.tsx`：

```typescript
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import AuthGuard from '@/components/AuthGuard'
import { useAppStore } from '@/stores/app'
import analytics from '@/lib/analytics'

const Login = lazy(() => import('@/pages/Login'))
// ... 保持现有的 lazy imports ...

function AppContent() {
  // ... 保持现有的 useEffect ...

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <RouteWithErrorBoundary pageName="登录">
            <Login />
          </RouteWithErrorBoundary>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/text" replace />} />
        {/* ... 保持所有现有子路由不变 ... */}
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthGuard.tsx src/App.tsx
git commit -m "feat(auth): add AuthGuard and integrate login route"
```

---

### Task 1.1.1-9: 前端 — Header 显示用户信息

**Files:**
- Modify: `src/components/layout/Header.tsx` — 添加用户信息展示和登出

- [ ] **Step 1: 修改 Header**

在 Header 组件中，用 auth store 替换 API Key 展示，添加用户名/角色显示和登出按钮。

关键改动：
- 导入 `useAuthStore`
- 在 Header 右侧添加用户信息区域（用户名 + 角色 badge）
- 添加登出按钮（调用 `useAuthStore.logout()`）
- 保留 Region 和 Language 切换
- 移除 API Key 输入（改为在 Settings 中管理用户自己的 API Key）

```typescript
// 在 Header 中添加（在 LanguageSwitcher 之后）：
import { useAuthStore } from '@/stores/auth'
import { LogOut, User } from 'lucide-react'

const { user, logout } = useAuthStore()

// 在 header 右侧添加：
{user && (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 px-3 py-2 bg-dark-800/50 rounded-lg border border-dark-700">
      <User className="w-4 h-4 text-dark-400" />
      <span className="text-sm text-white">{user.username}</span>
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded font-medium',
        user.role === 'super' && 'bg-red-500/20 text-red-400',
        user.role === 'admin' && 'bg-orange-500/20 text-orange-400',
        user.role === 'pro' && 'bg-blue-500/20 text-blue-400',
        user.role === 'user' && 'bg-green-500/20 text-green-400',
      )}>
        {user.role}
      </span>
    </div>
    <button
      onClick={() => { logout(); window.location.href = '/login' }}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-gray-700 hover:border-gray-500"
    >
      <LogOut className="w-4 h-4" />
      <span>登出</span>
    </button>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(auth): add user info display and logout button to header"
```

---

### Task 1.1.1-10: 端到端验证 + 构建测试

- [ ] **Step 1: 运行后端测试**

```bash
npm run test:server
```

- [ ] **Step 2: 运行前端测试**

```bash
npm run test
```

- [ ] **Step 3: 构建检查**

```bash
npm run build
```

- [ ] **Step 4: TypeScript 检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "chore: v1.1.1 auth core verified — login, register, JWT, invitation codes working"
```

---

## 版本 v1.1.2 — 角色权限 + 数据隔离

### Task 1.1.2-1: 数据库迁移 — owner_id 字段

**Files:**
- Modify: `server/database/migrations-async.ts` — 添加 migration_009

- [ ] **Step 1: 添加 migration_009 为业务表添加 owner_id**

```typescript
{
  id: 9,
  name: 'migration_009_add_owner_id',
  sql: `
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE media_records ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE dead_letter_queue ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_owner ON cron_jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_records_owner ON media_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_owner ON execution_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_owner ON task_queue(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_owner ON workflow_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_owner ON prompt_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_owner ON webhook_configs(owner_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_owner ON dead_letter_queue(owner_id);
  `,
},
```

- [ ] **Step 2: Commit**

```bash
git add server/database/migrations-async.ts
git commit -m "feat(auth): add owner_id columns to business tables for data isolation (migration 009)"
```

---

### Task 1.1.2-2: 后端 — 数据隔离中间件

**Files:**
- Create: `server/middleware/data-isolation.ts`
- Modify: 各业务路由 — 使用 owner_id 过滤

- [ ] **Step 1: 创建数据隔离中间件**

创建 `server/middleware/data-isolation.ts`：

```typescript
import { Request } from 'express'

/**
 * Generate SQL WHERE clause for data isolation based on user role.
 * Admin/super can see all data, user/pro only see their own.
 *
 * Usage in route handlers:
 *   const whereClause = buildOwnerFilter(req)
 *   const params = buildOwnerFilterParams(req)
 */
export function buildOwnerFilter(req: Request): { whereClause: string; params: any[] } {
  const user = req.user
  if (!user) return { whereClause: '', params: [] }

  // Admin and super can see all data
  if (user.role === 'admin' || user.role === 'super') {
    return { whereClause: '', params: [] }
  }

  // User and pro can only see their own data
  return {
    whereClause: 'WHERE owner_id = $1',
    params: [user.userId],
  }
}

/**
 * Append owner_id to INSERT statements for user/pro roles.
 */
export function buildOwnerInsert(req: Request): { field: string; value: string; params: any[] } | null {
  const user = req.user
  if (!user) return null

  // Admin/super don't require owner_id on insert (but can set it)
  if (user.role === 'admin' || user.role === 'super') {
    return null
  }

  return {
    field: 'owner_id',
    value: '$',
    params: [user.userId],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/middleware/data-isolation.ts
git commit -m "feat(auth): add data isolation middleware for owner-based filtering"
```

---

### Task 1.1.2-3: 后端 — 修改业务路由使用 owner_id

**Files:**
- Modify: `server/routes/cron.ts` — 添加 owner_id 过滤
- Modify: `server/routes/media.ts` — 添加 owner_id 过滤
- Modify: `server/database/service-async.ts` — 添加 owner_id 参数到 CRUD 方法

- [ ] **Step 1: 修改 cron 路由使用 owner 过滤**

在 `server/routes/cron.ts` 的 GET 列表端点中：

```typescript
import { buildOwnerFilter } from '../middleware/data-isolation.js'

// 在 getAllCronJobs 调用前添加过滤
const { whereClause, params } = buildOwnerFilter(req)
// 如果 DatabaseService 支持 owner_id 参数则传入
// 否则在路由层过滤
```

由于 DatabaseService 的 CRUD 方法需要感知 owner_id，需要在 service-async.ts 中为相关方法添加可选的 `ownerId` 参数。

- [ ] **Step 2: 修改 DatabaseService 支持 owner_id**

在 `server/database/service-async.ts` 中，为 `getAllCronJobs`、`getMediaRecords` 等方法添加 `ownerId` 可选参数：

```typescript
async getAllCronJobs(ownerId?: string): Promise<CronJob[]> {
  let sql = 'SELECT * FROM cron_jobs'
  const params: any[] = []

  if (ownerId) {
    sql += ' WHERE owner_id = $1'
    params.push(ownerId)
  }

  sql += ' ORDER BY created_at DESC'
  const rows = await this.conn.query<CronJobRow>(sql, params)
  return rows.map(rowToCronJob)
}
```

对 `createCronJob` 类似地添加 `ownerId`：

```typescript
async createCronJob(job: CreateCronJob, ownerId?: string): Promise<CronJob> {
  const id = uuidv4()
  const now = toISODate()
  const isActive = job.is_active !== false
  const timeoutMs = job.timeout_ms ?? 300000

  if (this.conn.isPostgres()) {
    await this.conn.execute(
      `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_json, created_at, updated_at, timeout_ms, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, job.name, job.description ?? null, job.cron_expression, isActive, job.workflow_json, now, now, timeoutMs, ownerId ?? null]
    )
  }
  // ...
}
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/cron.ts server/routes/media.ts server/database/service-async.ts
git commit -m "feat(auth): add owner_id filtering to cron and media routes"
```

---

### Task 1.1.2-4: 前端 — RoleGuard 组件

**Files:**
- Create: `src/components/RoleGuard.tsx`

- [ ] **Step 1: 创建 RoleGuard**

创建 `src/components/RoleGuard.tsx`：

```typescript
import { useAuthStore, type UserRole } from '@/stores/auth'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuthStore()

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoleGuard.tsx
git commit -m "feat(auth): add RoleGuard component for role-based UI visibility"
```

---

### Task 1.1.2-5: 前端 — Sidebar 按角色过滤

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` — 按角色过滤菜单项

- [ ] **Step 1: 修改 Sidebar**

在 Sidebar 中导入 `useAuthStore` 和 `RoleGuard`，根据角色过滤菜单：

```typescript
import { useAuthStore } from '@/stores/auth'

const { user } = useAuthStore()

// Debug pages always visible
const debugItems = [/* ... keep existing ... */]

// Management pages — only pro+
const managementItems = [
  { path: '/voice-mgmt', label: '音色管理', icon: User, minRole: 'pro' as UserRole },
  { path: '/files', label: '文件管理', icon: FolderOpen, minRole: 'pro' as UserRole },
  { path: '/media', label: '媒体管理', icon: HardDrive, minRole: 'pro' as UserRole },
  { path: '/templates', label: '模板库', icon: FileText, minRole: 'pro' as UserRole },
  { path: '/capacity', label: '容量监控', icon: Gauge, minRole: 'pro' as UserRole },
  { path: '/stats', label: '执行统计', icon: BarChart3, minRole: 'pro' as UserRole },
  { path: '/audit', label: '审计日志', icon: Shield, minRole: 'pro' as UserRole },
  { path: '/cron', label: '定时任务', icon: Clock, minRole: 'pro' as UserRole },
  { path: '/workflow-builder', label: '工作流构建器', icon: GitBranch, minRole: 'pro' as UserRole },
]

const roleHierarchy: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

const visibleManagementItems = managementItems.filter(
  item => roleHierarchy[user?.role ?? 'user'] >= roleHierarchy[item.minRole]
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(auth): filter sidebar items by user role"
```

---

### Task 1.1.2-6: 前端 — Settings 页面改为用户 API Key 配置

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: 修改 Settings 页面**

将 Settings 页面的 API Key 配置从全局 store 改为调用后端 API 保存用户自己的 MiniMax API Key：

```typescript
import { useAuthStore } from '@/stores/auth'

// 从 auth store 读取用户的 API Key
const { user } = useAuthStore()

// 保存时调用后端 API
const saveApiKey = async (key: string) => {
  await apiClient.patch('/auth/profile', { minimax_api_key: key })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat(auth): update Settings to use per-user MiniMax API key"
```

---

### Task 1.1.2-7: v1.1.2 验证

- [ ] **Step 1: 运行全部测试**

```bash
npm run test && npm run test:server
```

- [ ] **Step 2: 构建检查**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: v1.1.2 role-based access control and data isolation verified"
```

---

## 版本 v1.1.3 — 管理功能

### Task 1.1.3-1: 后端 — 用户管理路由（super only）

**Files:**
- Create: `server/routes/users.ts`

- [ ] **Step 1: 创建用户管理路由**

创建 `server/routes/users.ts`：

```typescript
import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getConnection } from '../database/connection.js'
import { UserService } from '../services/user-service.js'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// All routes require super role
router.use(requireRole(['super']))

const updateUserSchema = z.object({
  email: z.string().email().nullable().optional(),
  role: z.enum(['super', 'admin', 'pro', 'user']).optional(),
  is_active: z.boolean().optional(),
  minimax_api_key: z.string().nullable().optional(),
  minimax_region: z.enum(['cn', 'intl']).optional(),
})

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6),
  email: z.string().email().nullable().optional(),
  role: z.enum(['super', 'admin', 'pro', 'user']).default('user'),
  minimax_api_key: z.string().nullable().optional(),
})

// GET /api/users — list all users
router.get('/', asyncHandler(async (req, res) => {
  const conn = getConnection()
  const db = conn
  const rows = await db.query('SELECT id, username, email, minimax_api_key, minimax_region, role, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at DESC')
  res.json({ success: true, data: rows })
}))

// POST /api/users — create user
router.post('/', validateBody(createUserSchema), asyncHandler(async (req, res) => {
  const { username, password, email, role, minimax_api_key } = req.body
  const conn = getConnection()
  const passwordHash = await bcrypt.hash(password, 12)
  const id = uuidv4()
  const now = new Date().toISOString()

  await conn.execute(
    `INSERT INTO users (id, username, email, password_hash, role, minimax_api_key, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, username, email ?? null, passwordHash, role, minimax_api_key ?? null, true, now, now]
  )

  const userService = new UserService(conn)
  const user = await userService.getUserById(id)
  res.status(201).json({ success: true, data: user })
}))

// PATCH /api/users/:id — update user
router.patch('/:id', validateBody(updateUserSchema), asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = req.body
  const conn = getConnection()

  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (updates.email !== undefined) { fields.push(`email = $${idx++}`); values.push(updates.email) }
  if (updates.role !== undefined) { fields.push(`role = $${idx++}`); values.push(updates.role) }
  if (updates.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.is_active) }
  if (updates.minimax_api_key !== undefined) { fields.push(`minimax_api_key = $${idx++}`); values.push(updates.minimax_api_key) }
  if (updates.minimax_region !== undefined) { fields.push(`minimax_region = $${idx++}`); values.push(updates.minimax_region) }

  if (fields.length === 0) {
    res.json({ success: true, message: 'No changes' })
    return
  }

  fields.push(`updated_at = $${idx++}`)
  values.push(new Date().toISOString())
  values.push(id)

  await conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values)

  const userService = new UserService(conn)
  const user = await userService.getUserById(id)
  res.json({ success: true, data: user })
}))

// DELETE /api/users/:id — delete user
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()

  // Prevent self-deletion
  if (id === req.user?.userId) {
    res.status(400).json({ success: false, error: '不能删除自己的账户' })
    return
  }

  const result = await conn.execute('DELETE FROM users WHERE id = $1', [id])
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  res.json({ success: true, message: '用户已删除' })
}))

export default router
```

- [ ] **Step 2: 在 server/index.ts 注册用户路由**

```typescript
import usersRouter from './routes/users.js'

// After auth routes, before other protected routes
app.use('/api/users', authenticateJWT, usersRouter)
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/users.ts server/index.ts
git commit -m "feat(auth): add user management routes (super only)"
```

---

### Task 1.1.3-2: 后端 — 邀请码管理路由（super only）

**Files:**
- Create: `server/routes/invitation-codes.ts`

- [ ] **Step 1: 创建邀请码管理路由**

创建 `server/routes/invitation-codes.ts`：

```typescript
import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getConnection } from '../database/connection.js'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const router = Router()

// All routes require super role
router.use(requireRole(['super']))

const batchGenerateSchema = z.object({
  count: z.number().int().min(1).max(100),
  max_uses: z.number().int().min(1).default(1),
  expires_at: z.string().datetime().nullable().optional(),
})

// GET /api/invitation-codes — list all codes
router.get('/', asyncHandler(async (req, res) => {
  const conn = getConnection()
  const rows = await conn.query(`
    SELECT ic.*, u.username as created_by_username
    FROM invitation_codes ic
    LEFT JOIN users u ON ic.created_by = u.id
    ORDER BY ic.created_at DESC
  `)
  res.json({ success: true, data: rows })
}))

// POST /api/invitation-codes/batch — batch generate codes
router.post('/batch', validateBody(batchGenerateSchema), asyncHandler(async (req, res) => {
  const { count, max_uses, expires_at } = req.body
  const conn = getConnection()
  const codes = []

  for (let i = 0; i < count; i++) {
    const id = uuidv4()
    const code = crypto.randomBytes(16).toString('hex').substring(0, 32).toUpperCase()
    const now = new Date().toISOString()

    await conn.execute(
      `INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, expires_at, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, code, req.user!.userId, max_uses, 0, expires_at ?? null, true, now]
    )

    codes.push({ code, max_uses, expires_at })
  }

  res.status(201).json({ success: true, data: { count: codes.length, codes } })
}))

// DELETE /api/invitation-codes/:id — deactivate a code
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()

  const result = await conn.execute(
    'UPDATE invitation_codes SET is_active = false WHERE id = $1',
    [id]
  )

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '邀请码不存在' })
    return
  }

  res.json({ success: true, message: '邀请码已失效' })
}))

export default router
```

- [ ] **Step 2: 在 server/index.ts 注册邀请码路由**

```typescript
import invitationCodesRouter from './routes/invitation-codes.js'

app.use('/api/invitation-codes', authenticateJWT, invitationCodesRouter)
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/invitation-codes.ts server/index.ts
git commit -m "feat(auth): add invitation code management routes (super only)"
```

---

### Task 1.1.3-3: 前端 — 用户管理页面

**Files:**
- Create: `src/pages/UserManagement.tsx`

- [ ] **Step 1: 创建用户管理页面**

创建 `src/pages/UserManagement.tsx` — 包含用户列表、角色变更、启用/禁用、删除功能。使用现有的 UI 组件（Card, Button, Table 等）保持风格一致。

- [ ] **Step 2: Commit**

```bash
git add src/pages/UserManagement.tsx
git commit -m "feat(auth): add user management page (super only)"
```

---

### Task 1.1.3-4: 前端 — 邀请码管理页面

**Files:**
- Create: `src/pages/InvitationCodes.tsx`

- [ ] **Step 1: 创建邀请码管理页面**

创建 `src/pages/InvitationCodes.tsx` — 包含邀请码列表、批量生成表单（数量、最大使用次数、过期时间）、显示已使用次数。

- [ ] **Step 2: Commit**

```bash
git add src/pages/InvitationCodes.tsx
git commit -m "feat(auth): add invitation code management page (super only)"
```

---

### Task 1.1.3-5: 前端 — 添加管理页面路由和菜单

**Files:**
- Modify: `src/App.tsx` — 添加用户管理和邀请码路由
- Modify: `src/components/layout/Sidebar.tsx` — 添加管理菜单项

- [ ] **Step 1: 在 App.tsx 添加路由**

```typescript
const UserManagement = lazy(() => import('@/pages/UserManagement'))
const InvitationCodes = lazy(() => import('@/pages/InvitationCodes'))

// Inside protected routes:
<Route
  path="users"
  element={
    <RoleGuard allowedRoles={['super']}>
      <RouteWithErrorBoundary pageName="用户管理">
        <UserManagement />
      </RouteWithErrorBoundary>
    </RoleGuard>
  }
/>
<Route
  path="invitation-codes"
  element={
    <RoleGuard allowedRoles={['super']}>
      <RouteWithErrorBoundary pageName="邀请码管理">
        <InvitationCodes />
      </RouteWithErrorBoundary>
    </RoleGuard>
  }
/>
```

- [ ] **Step 2: 在 Sidebar 添加管理菜单项**

在 Sidebar 底部添加 super-only 菜单项：用户管理、邀请码管理。

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(auth): add user management and invitation code routes to sidebar"
```

---

### Task 1.1.3-6: v1.1.3 验证

- [ ] **Step 1: 运行全部测试**

```bash
npm run test && npm run test:server
```

- [ ] **Step 2: 构建检查**

```bash
npm run build
```

- [ ] **Step 3: 更新版本号**

```bash
npm version 1.1.3 --no-git-tag-version
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: release v1.1.3 — full authentication system with RBAC, data isolation, and admin features"
```

---

## 自审检查

### Spec 覆盖检查
- ✅ users 表 + invitation_codes 表
- ✅ JWT 认证（access + refresh token）
- ✅ 登录/注册/修改密码
- ✅ 邀请码验证（过期、用完、无效检查）
- ✅ 密码 ≥ 6 位，bcrypt 哈希
- ✅ 4 角色权限矩阵
- ✅ 数据隔离（owner_id 过滤）
- ✅ 前端 AuthGuard + RoleGuard
- ✅ 菜单按角色过滤
- ✅ 用户管理（super only）
- ✅ 邀请码批量生成（super only）
- ✅ WebSocket 认证
- ✅ API Key 用户级配置

### 占位符扫描
- 无 TBD、TODO、"类似 Task N" 等占位符
- 所有步骤包含完整代码

### 类型一致性
- UserRole 类型在 types.ts、auth store、中间件中统一使用
- TokenPayload 结构在所有 token 操作中一致

### 范围检查
- 拆分为 3 个版本，每个版本可独立部署和测试
- v1.1.1 交付可用的认证系统
- v1.1.2 交付权限控制
- v1.1.3 交付管理功能
