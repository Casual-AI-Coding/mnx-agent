import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import { BaseRepository } from './base-repository.js'
import { toLocalISODateString } from '../lib/date-utils.js'
import type { SettingsCategory } from '../../src/settings/types/index.js'

export interface UserSettingsRow {
  id: string
  user_id: string
  category: string
  settings_json: string | Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export interface CreateUserSettings {
  userId: string
  category: SettingsCategory
  settings: Record<string, unknown>
}

export interface UpdateUserSettings {
  settings: Record<string, unknown>
  version?: number
}

export class SettingsRepository extends BaseRepository<UserSettingsRow, CreateUserSettings, UpdateUserSettings> {
  protected readonly tableName = 'user_settings'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): UserSettingsRow {
    const r = row as UserSettingsRow
    return {
      ...r,
      settings_json: typeof r.settings_json === 'string'
        ? JSON.parse(r.settings_json)
        : r.settings_json,
    }
  }

  async getSettings(userId: string, category: SettingsCategory): Promise<UserSettingsRow | null> {
    const rows = await this.conn.query<UserSettingsRow>(
      'SELECT * FROM user_settings WHERE user_id = $1 AND category = $2',
      [userId, category]
    )
    return rows[0] ? this.rowToEntity(rows[0]) : null
  }

  async getAllSettings(userId: string): Promise<UserSettingsRow[]> {
    const rows = await this.conn.query<UserSettingsRow>(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    )
    return rows.map(row => this.rowToEntity(row))
  }

  async upsertSettings(data: CreateUserSettings): Promise<UserSettingsRow> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const settingsJson = JSON.stringify(data.settings)

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO user_settings (id, user_id, category, settings_json, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, $5, $5)
         ON CONFLICT (user_id, category)
         DO UPDATE SET settings_json = EXCLUDED.settings_json, version = user_settings.version + 1, updated_at = EXCLUDED.updated_at`,
        [id, data.userId, data.category, settingsJson, now]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO user_settings (id, user_id, category, settings_json, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(user_id, category) DO UPDATE SET settings_json = excluded.settings_json, version = version + 1, updated_at = excluded.updated_at`,
        [id, data.userId, data.category, settingsJson, now, now]
      )
    }

    return (await this.getSettings(data.userId, data.category))!
  }

  async updateSettings(userId: string, category: SettingsCategory, settings: Record<string, unknown>): Promise<UserSettingsRow | null> {
    const now = toLocalISODateString()
    const settingsJson = JSON.stringify(settings)

    await this.conn.execute(
      `UPDATE user_settings SET settings_json = $1, version = version + 1, updated_at = $2 WHERE user_id = $3 AND category = $4`,
      [settingsJson, now, userId, category]
    )

    return this.getSettings(userId, category)
  }

  async deleteSettings(userId: string, category: SettingsCategory): Promise<boolean> {
    const result = await this.conn.execute(
      'DELETE FROM user_settings WHERE user_id = $1 AND category = $2',
      [userId, category]
    )
    return result.changes > 0
  }
}