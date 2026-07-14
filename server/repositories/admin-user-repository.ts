import { toLocalISODateString } from '../lib/date-utils.js'

export type AdminUserUpdate = {
  readonly email?: string | null
  readonly role?: 'super' | 'admin' | 'pro' | 'user'
  readonly is_active?: boolean
  readonly minimax_api_key?: string | null
  readonly minimax_region?: 'cn' | 'intl'
}

export type AdminUserListItem = Record<string, unknown> & {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string | null
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminUserListOptions {
  limit: number
  offset: number
}

type AdminUserUpdateValue = AdminUserUpdate[keyof AdminUserUpdate] | string

export interface AdminUserRepositoryConnection {
  query(sql: string): Promise<Array<{ total: string | number }>>
  query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>
}

export class AdminUserRepository {
  constructor(private readonly conn: AdminUserRepositoryConnection) {}

  async countUsers(): Promise<number> {
    const rows = await this.conn.query('SELECT COUNT(*) as total FROM users')

    return Number(rows[0]?.total ?? 0)
  }

  async listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]> {
    return this.conn.query(
      `SELECT id, username, email,
        CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4)) AS minimax_api_key,
        minimax_region, role, is_active, last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [options.limit, options.offset]
    )
  }

  async updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null> {
    const fields: string[] = []
    const values: AdminUserUpdateValue[] = []
    let index = 1

    if (updates.email !== undefined) { fields.push(`email = $${index++}`); values.push(updates.email) }
    if (updates.role !== undefined) { fields.push(`role = $${index++}`); values.push(updates.role) }
    if (updates.is_active !== undefined) { fields.push(`is_active = $${index++}`); values.push(updates.is_active) }
    if (updates.minimax_api_key !== undefined) { fields.push(`minimax_api_key = $${index++}`); values.push(updates.minimax_api_key) }
    if (updates.minimax_region !== undefined) { fields.push(`minimax_region = $${index++}`); values.push(updates.minimax_region) }

    fields.push(`updated_at = $${index++}`)
    values.push(toLocalISODateString())
    values.push(id)

    await this.conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`, values)
    const rows = await this.conn.query(
      `SELECT id, username, email,
        CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4)) AS minimax_api_key,
        minimax_region, role, is_active, last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    )

    return rows[0] ?? null
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM users WHERE id = $1', [id])
    return result.changes > 0
  }
}
