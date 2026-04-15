import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { DatabaseConnection } from '../database/connection.js'
import type { User, UserRow, UserRole } from '../database/types.js'
import { toLocalISODateString } from '../lib/date-utils.js'

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

export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh'
}

export class UserService {
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    if (input.password.length < 6) {
      return { success: false, error: '密码至少6位' }
    }

    // Atomic invitation code consumption with transaction
    // This prevents race conditions where concurrent registrations
    // could exceed max_uses limit
    return this.conn.transaction(async (tx) => {
      // Attempt to atomically consume the invitation code
      // Single UPDATE with WHERE clause: only increments if used_count < max_uses
      // Returns null if code is invalid, expired, inactive, or fully used
      const consumedCode = await tx.query<{
        id: string
        code: string
        max_uses: number
        used_count: number
        expires_at: string | null
        is_active: boolean
      }>(
        `UPDATE invitation_codes
         SET used_count = used_count + 1
         WHERE code = $1
           AND is_active = true
           AND (expires_at IS NULL OR expires_at > NOW())
           AND used_count < max_uses
         RETURNING id, code, max_uses, used_count, expires_at, is_active`,
        [input.invitationCode]
      )

      if (consumedCode.length === 0) {
        // Check why it failed - code invalid vs expired vs fully used
        const existingCode = await tx.query<{ used_count: number; max_uses: number; expires_at: string | null; is_active: boolean }>(
          'SELECT used_count, max_uses, expires_at, is_active FROM invitation_codes WHERE code = $1',
          [input.invitationCode]
        )
        if (existingCode.length === 0) {
          return { success: false, error: '邀请码无效' }
        }
        const code = existingCode[0]
        if (!code.is_active) {
          return { success: false, error: '邀请码已失效' }
        }
        if (code.expires_at && new Date(code.expires_at) < new Date()) {
          return { success: false, error: '邀请码已过期' }
        }
        return { success: false, error: '邀请码已用完' }
      }

      // Check if username already exists (inside transaction for proper rollback)
      const existingUser = await tx.query<UserRow>(
        'SELECT id FROM users WHERE username = $1',
        [input.username]
      )
      if (existingUser.length > 0) {
        // Transaction will be rolled back automatically
        return { success: false, error: '用户名已存在' }
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
      const id = uuidv4()
      const now = toLocalISODateString()

      await tx.execute(
        `INSERT INTO users (id, username, email, password_hash, minimax_api_key, minimax_region, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, input.username, input.email ?? null, passwordHash, null, 'cn', 'user', true, now, now]
      )

      const user = await this.getUserById(id)
      return { success: true, user: user! }
    })
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const rows = await this.conn.query<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )
    if (rows.length === 0) {
      return { success: false, error: '用户名或密码错误' }
    }

    const userRow = rows[0]

    if (!userRow.is_active) {
      return { success: false, error: '账户已被禁用' }
    }

    const passwordValid = await bcrypt.compare(password, userRow.password_hash)
    if (!passwordValid) {
      return { success: false, error: '用户名或密码错误' }
    }

    await this.conn.execute(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [toLocalISODateString(), userRow.id]
    )

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
    if (!rows[0]) return null
    const row = rows[0]
    return {
      ...row,
      role: row.role as UserRole,
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (newPassword.length < 6) {
      return { success: false, error: '密码至少6位' }
    }

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
      [newHash, toLocalISODateString(), userId]
    )

    return { success: true }
  }

  async updateUser(userId: string, updates: { minimax_api_key?: string | null; minimax_region?: string }): Promise<Omit<User, 'password_hash'> | null> {
    const setClauses: string[] = []
    const values: (string | null)[] = []
    let paramIndex = 1

    if (updates.minimax_api_key !== undefined) {
      setClauses.push(`minimax_api_key = $${paramIndex}`)
      values.push(updates.minimax_api_key)
      paramIndex++
    }

    if (updates.minimax_region !== undefined) {
      setClauses.push(`minimax_region = $${paramIndex}`)
      values.push(updates.minimax_region)
      paramIndex++
    }

    if (setClauses.length === 0) {
      return this.getUserById(userId)
    }

    setClauses.push(`updated_at = $${paramIndex}`)
    values.push(toLocalISODateString())
    paramIndex++

    values.push(userId)

    await this.conn.execute(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return this.getUserById(userId)
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

  private getSecret(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.getSecret(), { expiresIn: '15m' })
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign({ ...payload, type: 'refresh' }, this.getSecret(), { expiresIn: '7d' })
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required')
      }
      const payload = jwt.verify(token, secret) as TokenPayload
      // Reject refresh tokens when expecting access tokens
      if ((payload as RefreshTokenPayload).type === 'refresh') {
        return null
      }
      return payload
    } catch {
      return null
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required')
      }
      const payload = jwt.verify(token, secret) as RefreshTokenPayload
      // Must be a refresh token
      if (payload.type !== 'refresh') {
        return null
      }
      return payload
    } catch {
      return null
    }
  }
}