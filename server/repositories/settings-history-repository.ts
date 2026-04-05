import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type { SettingsCategory } from '../../src/settings/types/index.js'

export interface SettingsHistoryRow {
  id: string
  user_id: string
  category: string
  setting_key: string
  old_value: string | null
  new_value: string | null
  changed_at: string
  changed_by: string
  source: 'user' | 'sync' | 'default' | 'admin'
  ip_address: string | null
  user_agent: string | null
}

export interface CreateSettingsHistory {
  userId: string
  category: SettingsCategory
  settingKey: string
  oldValue: unknown | null
  newValue: unknown | null
  changedBy: string
  source: 'user' | 'sync' | 'default' | 'admin'
  ipAddress?: string
  userAgent?: string
}

export interface SettingsHistoryQuery {
  userId: string
  category?: SettingsCategory
  page?: number
  limit?: number
}

export class SettingsHistoryRepository {
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  protected toISODate(): string {
    return new Date().toISOString()
  }

  async logChange(data: CreateSettingsHistory): Promise<SettingsHistoryRow> {
    const id = uuidv4()
    const now = this.toISODate()

    await this.conn.execute(
      `INSERT INTO settings_history (id, user_id, category, setting_key, old_value, new_value, changed_at, changed_by, source, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        data.userId,
        data.category,
        data.settingKey,
        data.oldValue ? JSON.stringify(data.oldValue) : null,
        data.newValue ? JSON.stringify(data.newValue) : null,
        now,
        data.changedBy,
        data.source,
        data.ipAddress ?? null,
        data.userAgent ?? null,
      ]
    )

    const rows = await this.conn.query<SettingsHistoryRow>(
      'SELECT * FROM settings_history WHERE id = $1',
      [id]
    )
    return rows[0]
  }

  async getHistory(query: SettingsHistoryQuery): Promise<{ items: SettingsHistoryRow[]; total: number }> {
    const { userId, category, page = 1, limit = 50 } = query
    const offset = (page - 1) * limit

    const conditions: string[] = ['user_id = $1']
    const params: (string | number)[] = [userId]
    let paramIndex = 2

    if (category) {
      conditions.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM settings_history ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<SettingsHistoryRow>(
      `SELECT * FROM settings_history ${whereClause} ORDER BY changed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return { items: rows, total }
  }
}