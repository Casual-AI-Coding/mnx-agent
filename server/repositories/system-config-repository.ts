import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  SystemConfig,
  SystemConfigRow,
  CreateSystemConfig,
  UpdateSystemConfig,
} from '../database/types.js'
import { SystemConfigValueType } from '../database/types.js'
import { BaseRepository, ListOptions } from './base-repository.js'

import { toLocalISODateString } from '../lib/date-utils.js'

function rowToSystemConfig(row: SystemConfigRow): SystemConfig {
  return {
    ...row,
    value_type: row.value_type as SystemConfigValueType,
  }
}

export class SystemConfigRepository extends BaseRepository<SystemConfig, CreateSystemConfig, UpdateSystemConfig> {
  protected readonly tableName = 'system_config'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'key'
  }

  protected rowToEntity(row: unknown): SystemConfig {
    return rowToSystemConfig(row as SystemConfigRow)
  }

  async getById(id: string): Promise<SystemConfig | null> {
    return this.getByKey(id)
  }

  async getByKey(key: string): Promise<SystemConfig | null> {
    const rows = await this.conn.query<SystemConfigRow>(
      'SELECT * FROM system_config WHERE key = $1',
      [key]
    )
    return rows[0] ? rowToSystemConfig(rows[0]) : null
  }

  async list(_options?: ListOptions): Promise<{ items: SystemConfig[]; total: number }> {
    const rows = await this.conn.query<SystemConfigRow>('SELECT * FROM system_config ORDER BY key')
    const countRows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM system_config')
    return {
      items: rows.map(row => rowToSystemConfig(row)),
      total: parseInt(countRows[0]?.count ?? '0', 10),
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.conn.execute(
      'DELETE FROM system_config WHERE key = $1',
      [key]
    )
    return result.changes > 0
  }

  async create(data: CreateSystemConfig, updatedBy?: string): Promise<SystemConfig> {
    const id = uuidv4()
    const now = toLocalISODateString()

    await this.conn.execute(
      `INSERT INTO system_config (id, key, value, description, value_type, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.key, data.value, data.description, data.value_type, now, updatedBy ?? null]
    )

    return (await this.getByKey(data.key))!
  }

  async update(key: string, updates: UpdateSystemConfig, updatedBy?: string): Promise<SystemConfig | null> {
    const existing = await this.getByKey(key)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | null)[] = []
    let paramIndex = 1

    if (updates.value !== undefined) {
      fields.push(`value = $${paramIndex}`)
      values.push(updates.value)
      paramIndex++
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`)
      values.push(updates.description)
      paramIndex++
    }

    if (fields.length === 0) return existing

    fields.push(`updated_at = $${paramIndex}`)
    values.push(toLocalISODateString())
    paramIndex++
    fields.push(`updated_by = $${paramIndex}`)
    values.push(updatedBy ?? null)
    paramIndex++
    values.push(key)

    await this.conn.execute(
      `UPDATE system_config SET ${fields.join(', ')} WHERE key = $${paramIndex}`,
      values
    )

    return this.getByKey(key)
  }
}
