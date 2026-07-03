import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  PromptTemplate,
  PromptTemplateRow,
  PromptTemplateVersion,
  PromptTemplateVersionDiff,
  PromptTemplateVersionRow,
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

function rowToPromptTemplateVersion(row: PromptTemplateVersionRow): PromptTemplateVersion {
  const variables = row.variables ? (typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables) : []
  return {
    ...row,
    category: row.category as TemplateCategory | null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
    variables,
  }
}

function diffField(
  field: PromptTemplateVersionDiff['field'],
  from: PromptTemplateVersionDiff['from'],
  to: PromptTemplateVersionDiff['to']
): PromptTemplateVersionDiff | null {
  if (JSON.stringify(from) === JSON.stringify(to)) return null
  return { field, from, to }
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

  async getLatestVersionNumber(templateId: string, ownerId: string): Promise<number> {
    const rows = await this.conn.query<{ max: number | null }>(
      `SELECT MAX(ptv.version_number) as max
       FROM prompt_template_versions ptv
       INNER JOIN prompt_templates pt ON pt.id = ptv.template_id
       WHERE ptv.template_id = $1 AND pt.owner_id = $2`,
      [templateId, ownerId]
    )
    return rows[0]?.max ?? 0
  }

  async getVersionById(id: string, templateId: string, ownerId: string): Promise<PromptTemplateVersion | null> {
    const rows = await this.conn.query<PromptTemplateVersionRow>(
      `SELECT ptv.*
       FROM prompt_template_versions ptv
       INNER JOIN prompt_templates pt ON pt.id = ptv.template_id
       WHERE ptv.id = $1 AND ptv.template_id = $2 AND pt.owner_id = $3`,
      [id, templateId, ownerId]
    )
    return rows[0] ? rowToPromptTemplateVersion(rows[0]) : null
  }

  async getVersionsByTemplate(templateId: string, ownerId: string): Promise<PromptTemplateVersion[]> {
    const rows = await this.conn.query<PromptTemplateVersionRow>(
      `SELECT ptv.*
       FROM prompt_template_versions ptv
       INNER JOIN prompt_templates pt ON pt.id = ptv.template_id
       WHERE ptv.template_id = $1 AND pt.owner_id = $2
       ORDER BY ptv.version_number DESC`,
      [templateId, ownerId]
    )
    return rows.map(rowToPromptTemplateVersion)
  }

  async createVersion(templateId: string, ownerId: string, changeSummary?: string | null): Promise<PromptTemplateVersion> {
    const nextVersion = await this.getLatestVersionNumber(templateId, ownerId) + 1
    const template = await this.getById(templateId, ownerId)
    if (!template) throw new Error(`Prompt template ${templateId} not found`)

    const id = `ptv_${uuidv4().replace(/-/g, '')}`
    const now = toLocalISODateString()
    const variables = JSON.stringify(template.variables)

    await this.conn.execute(
      `UPDATE prompt_template_versions SET is_active = false WHERE template_id = $1 AND owner_id = $2`,
      [templateId, ownerId]
    )
    await this.conn.execute(
      `INSERT INTO prompt_template_versions (
        id, template_id, version_number, name, description, content, category,
        variables, change_summary, created_by, owner_id, created_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        templateId,
        nextVersion,
        template.name,
        template.description,
        template.content,
        template.category,
        variables,
        changeSummary ?? null,
        ownerId,
        ownerId,
        now,
        true,
      ]
    )

    const version = await this.getVersionById(id, templateId, ownerId)
    if (!version) throw new Error(`Prompt template version ${id} not found after create`)
    return version
  }

  async compareVersions(
    templateId: string,
    fromVersion: number,
    toVersion: number,
    ownerId: string
  ): Promise<PromptTemplateVersionDiff[]> {
    const rows = await this.conn.query<PromptTemplateVersionRow>(
      `SELECT ptv.*
       FROM prompt_template_versions ptv
       INNER JOIN prompt_templates pt ON pt.id = ptv.template_id
       WHERE ptv.template_id = $1
         AND pt.owner_id = $2
         AND ptv.version_number IN ($3, $4)
       ORDER BY ptv.version_number ASC`,
      [templateId, ownerId, fromVersion, toVersion]
    )
    const versions = rows.map(rowToPromptTemplateVersion)
    const from = versions.find((version) => version.version_number === fromVersion)
    const to = versions.find((version) => version.version_number === toVersion)
    if (!from || !to) return []

    return [
      diffField('name', from.name, to.name),
      diffField('description', from.description, to.description),
      diffField('content', from.content, to.content),
      diffField('category', from.category, to.category),
      diffField('variables', from.variables, to.variables),
    ].filter((diff): diff is PromptTemplateVersionDiff => diff !== null)
  }

  async updateFromVersion(templateId: string, versionId: string, ownerId: string): Promise<PromptTemplate | null> {
    const version = await this.getVersionById(versionId, templateId, ownerId)
    if (!version) return null

    const variables = JSON.stringify(version.variables)
    await this.conn.execute(
      `UPDATE prompt_templates SET name = $1, description = $2, content = $3, category = $4, variables = $5, updated_at = $6
       WHERE id = $7 AND owner_id = $8`,
      [version.name, version.description, version.content, version.category, variables, toLocalISODateString(), templateId, ownerId]
    )
    await this.conn.execute(
      'UPDATE prompt_template_versions SET is_active = false WHERE template_id = $1 AND owner_id = $2',
      [templateId, ownerId]
    )
    await this.conn.execute(
      'UPDATE prompt_template_versions SET is_active = true WHERE id = $1 AND template_id = $2 AND owner_id = $3',
      [versionId, templateId, ownerId]
    )

    return this.getById(templateId, ownerId)
  }
}
