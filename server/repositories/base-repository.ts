import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import { toLocalISODateString } from '../lib/date-utils.js'

export interface RepositoryOptions {
  conn: DatabaseConnection
}

export interface ListOptions {
  limit?: number
  offset?: number
  ownerId?: string
  [key: string]: string | number | boolean | null | undefined
}

export abstract class BaseRepository<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  protected conn: DatabaseConnection
  protected abstract readonly tableName: string

  constructor(options: RepositoryOptions) {
    this.conn = options.conn
  }

  protected abstract getIdColumn(): string
  protected abstract rowToEntity(row: unknown): T

  async getById(id: string, ownerId?: string): Promise<T | null> {
    if (ownerId) {
      const rows = await this.conn.query(
        `SELECT * FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1 AND owner_id = $2`,
        [id, ownerId]
      )
      return rows[0] ? this.rowToEntity(rows[0]) : null
    }
    const rows = await this.conn.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1`,
      [id]
    )
    return rows[0] ? this.rowToEntity(rows[0]) : null
  }

  async list(options: ListOptions = {}): Promise<{ items: T[]; total: number }> {
    const { limit = 50, offset = 0, ownerId, ...rest } = options

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      conditions.push(`owner_id = $${paramIndex}`)
      params.push(ownerId)
      paramIndex++
    }

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        const columnName = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
        conditions.push(`${columnName} = $${paramIndex}`)
        params.push(value as string | number)
        paramIndex++
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query(
      `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      items: rows.map(row => this.rowToEntity(row)),
      total,
    }
  }

  async delete(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute(
        `DELETE FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1 AND owner_id = $2`,
        [id, ownerId]
      )
      return result.changes > 0
    }
    const result = await this.conn.execute(
      `DELETE FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1`,
      [id]
    )
    return result.changes > 0
  }

  protected buildUpdateFields(
    updates: UpdateDto,
    fieldMapping?: Record<string, string>
  ): { fields: string[]; values: (string | number | boolean | null)[]; paramIndex: number } {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    const entries = Object.entries(updates as Record<string, unknown>)
    for (const [key, value] of entries) {
      if (value !== undefined) {
        const columnName = fieldMapping?.[key] ?? key
        fields.push(`${columnName} = $${paramIndex}`)
        values.push(value as string | number | boolean | null)
        paramIndex++
      }
    }

    return { fields, values, paramIndex }
  }

  protected async executeUpdate(
    updates: UpdateDto,
    id: string,
    ownerId?: string,
    fieldMapping?: Record<string, string>
  ): Promise<T | null> {
    const { fields, values, paramIndex } = this.buildUpdateFields(updates, fieldMapping)

    if (fields.length === 0) {
      return this.getById(id, ownerId)
    }

    let currentParamIndex = paramIndex
    fields.push(`updated_at = $${currentParamIndex}`)
    values.push(toLocalISODateString())
    currentParamIndex++
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId
      ? `WHERE ${this.getIdColumn()} = $${currentParamIndex} AND owner_id = $${currentParamIndex + 1}`
      : `WHERE ${this.getIdColumn()} = $${currentParamIndex}`

    await this.conn.execute(
      `UPDATE ${this.tableName} SET ${fields.join(', ')} ${whereClause}`,
      values
    )

    return this.getById(id, ownerId)
  }

  protected generateId(): string {
    return uuidv4()
  }

  isPostgres(): boolean {
    return this.conn.isPostgres()
  }
}
