export type AdminUserListItem = Record<string, unknown> & {
  id: string
  username: string
  email: string
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

export interface AdminUserRepositoryConnection {
  query(sql: string): Promise<Array<{ total: string | number }>>
  query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
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
}
