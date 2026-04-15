import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  PromptTemplate,
  PromptTemplateRow,
  CreatePromptTemplate,
  UpdatePromptTemplate,
} from '../database/types.js'
import { TemplateCategory } from '../database/types.js'
import { BaseRepository } from './base-repository.js'

import { toLocalISODateString } from '../lib/date-utils.js'

function rowToPromptTemplate(row: PromptTemplateRow): PromptTemplate {
  const variables = row.variables ? (typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables) : []
  return {
    ...row,
    category: row.category as TemplateCategory | null,
    is_builtin: typeof row.is_builtin === 'boolean' ? row.is_builtin : row.is_builtin === 1,
    variables,
  }
}

export interface PromptTemplateListOptions {
  category?: string
  limit?: number
  offset?: number
  ownerId?: string
}

export class PromptTemplateRepository extends BaseRepository<PromptTemplate, CreatePromptTemplate, UpdatePromptTemplate> {
  protected readonly tableName = 'prompt_templates'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): PromptTemplate {
    return rowToPromptTemplate(row as PromptTemplateRow)
  }

  async list(options: PromptTemplateListOptions = {}): Promise<{ items: PromptTemplate[]; total: number }> {
    const { category, limit = 50, offset = 0, ownerId } = options

    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      whereClause = `owner_id = $${paramIndex}`
      params.push(ownerId)
      paramIndex++
    }

    if (category) {
      whereClause += whereClause ? ` AND category = $${paramIndex}` : `category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (whereClause) {
      whereClause = 'WHERE ' + whereClause
    }

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM prompt_templates ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<PromptTemplateRow>(
      `SELECT * FROM prompt_templates ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      items: rows.map(rowToPromptTemplate),
      total,
    }
  }

  async create(data: CreatePromptTemplate, ownerId?: string): Promise<PromptTemplate> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const variables = data.variables ? JSON.stringify(data.variables) : null
    const isBuiltin = data.is_builtin === true

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO prompt_templates (id, name, description, content, category, variables, is_builtin, created_at, updated_at, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, data.name, data.description ?? null, data.content, data.category ?? null, variables, isBuiltin, now, now, ownerId ?? null]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO prompt_templates (id, name, description, content, category, variables, is_builtin, created_at, updated_at, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.description ?? null, data.content, data.category ?? null, variables, isBuiltin ? 1 : 0, now, now, ownerId ?? null]
      )
    }

    return (await this.getById(id))!
  }

  async update(id: string, data: UpdatePromptTemplate, ownerId?: string): Promise<PromptTemplate | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex}`)
      values.push(data.name)
      paramIndex++
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex}`)
      values.push(data.description)
      paramIndex++
    }
    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex}`)
      values.push(data.content)
      paramIndex++
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramIndex}`)
      values.push(data.category)
      paramIndex++
    }
    if (data.variables !== undefined) {
      fields.push(`variables = $${paramIndex}`)
      values.push(JSON.stringify(data.variables))
      paramIndex++
    }

    if (fields.length === 0) return existing

    fields.push(`updated_at = $${paramIndex}`)
    values.push(toLocalISODateString())
    paramIndex++
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId
      ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}`
      : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE prompt_templates SET ${fields.join(', ')} ${whereClause}`,
      values
    )
    return this.getById(id, ownerId)
  }
}
