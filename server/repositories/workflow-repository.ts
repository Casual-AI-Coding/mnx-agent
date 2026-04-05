import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  WorkflowTemplate,
  WorkflowTemplateRow,
  WorkflowVersion,
  WorkflowVersionRow,
  CreateWorkflowVersion,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'

function rowToWorkflowTemplate(row: WorkflowTemplateRow): WorkflowTemplate {
  const nodes_json = typeof row.nodes_json === 'string'
    ? row.nodes_json
    : JSON.stringify(row.nodes_json)
  const edges_json = typeof row.edges_json === 'string'
    ? row.edges_json
    : JSON.stringify(row.edges_json)

  return {
    ...row,
    nodes_json,
    edges_json,
    is_public: typeof row.is_public === 'boolean' ? row.is_public : row.is_public === 1,
  }
}

function rowToWorkflowVersion(row: WorkflowVersionRow): WorkflowVersion {
  return {
    ...row,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
  }
}

export interface WorkflowListOptions {
  ownerId?: string
  isPublic?: boolean
  limit?: number
  offset?: number
}

export class WorkflowRepository extends BaseRepository<WorkflowTemplate> {
  protected readonly tableName = 'workflow_templates'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): WorkflowTemplate {
    return rowToWorkflowTemplate(row as WorkflowTemplateRow)
  }

  async getAllTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    if (ownerId) {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE owner_id = $1 ORDER BY created_at DESC',
        [ownerId]
      )
      return rows.map(rowToWorkflowTemplate)
    }
    const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates ORDER BY created_at DESC')
    return rows.map(rowToWorkflowTemplate)
  }

  async getTemplatesPaginated(options: WorkflowListOptions = {}): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    const { ownerId, isPublic, limit = 50, offset = 0 } = options

    const conditions: string[] = []
    const params: (string | number | boolean)[] = []
    let paramIndex = 1

    if (ownerId) {
      conditions.push(`owner_id = $${paramIndex}`)
      params.push(ownerId)
      paramIndex++
    }

    if (isPublic !== undefined) {
      conditions.push(`is_public = $${paramIndex}`)
      params.push(isPublic)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM workflow_templates ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<WorkflowTemplateRow>(
      `SELECT * FROM workflow_templates ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      templates: rows.map(rowToWorkflowTemplate),
      total,
    }
  }

  async getTemplateById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> {
    if (ownerId) {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE id = $1 AND (owner_id = $2 OR is_public = true)',
        [id, ownerId]
      )
      return rows[0] ? rowToWorkflowTemplate(rows[0]) : null
    }
    const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates WHERE id = $1', [id])
    return rows[0] ? rowToWorkflowTemplate(rows[0]) : null
  }

  async createTemplate(
    template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_public?: boolean },
    ownerId?: string
  ): Promise<WorkflowTemplate> {
    const id = uuidv4()
    const now = this.toISODate()
    const isTemplate = template.is_public !== false

    if (this.isPostgres()) {
      await this.conn.execute(
        'INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_public, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, isTemplate, ownerId ?? null]
      )
    } else {
      await this.conn.execute(
        'INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_public, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, isTemplate ? 1 : 0, ownerId ?? null]
      )
    }
    return (await this.getTemplateById(id))!
  }

  async updateTemplate(id: string, updates: Partial<WorkflowTemplate>, ownerId?: string): Promise<WorkflowTemplate | null> {
    const existing = await this.getTemplateById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`)
      values.push(updates.name)
      paramIndex++
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`)
      values.push(updates.description)
      paramIndex++
    }
    if (updates.nodes_json !== undefined) {
      fields.push(`nodes_json = $${paramIndex}`)
      values.push(updates.nodes_json)
      paramIndex++
    }
    if (updates.edges_json !== undefined) {
      fields.push(`edges_json = $${paramIndex}`)
      values.push(updates.edges_json)
      paramIndex++
    }
    if (updates.is_public !== undefined) {
      fields.push(`is_public = $${paramIndex}`)
      values.push(this.isPostgres() ? updates.is_public : updates.is_public ? 1 : 0)
      paramIndex++
    }

    if (fields.length === 0) return existing
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId
      ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}`
      : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE workflow_templates SET ${fields.join(', ')} ${whereClause}`,
      values
    )
    return this.getTemplateById(id, ownerId)
  }

  async deleteTemplate(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM workflow_templates WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM workflow_templates WHERE id = $1', [id])
    return result.changes > 0
  }

  async getPublicTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    if (ownerId) {
      if (this.isPostgres()) {
        const rows = await this.conn.query<WorkflowTemplateRow>(
          'SELECT * FROM workflow_templates WHERE is_public = true AND owner_id = $1 ORDER BY created_at DESC',
          [ownerId]
        )
        return rows.map(rowToWorkflowTemplate)
      } else {
        const rows = await this.conn.query<WorkflowTemplateRow>(
          'SELECT * FROM workflow_templates WHERE is_public = 1 AND owner_id = ? ORDER BY created_at DESC',
          [ownerId]
        )
        return rows.map(rowToWorkflowTemplate)
      }
    }
    if (this.isPostgres()) {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE is_public = true ORDER BY created_at DESC'
      )
      return rows.map(rowToWorkflowTemplate)
    } else {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE is_public = 1 ORDER BY created_at DESC'
      )
      return rows.map(rowToWorkflowTemplate)
    }
  }

  async createPermission(data: { workflow_id: string; user_id: string; granted_by?: string | null }): Promise<void> {
    const id = uuidv4()
    const now = this.toISODate()
    await this.conn.execute(
      `INSERT INTO workflow_permissions (id, workflow_id, user_id, granted_by, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, data.workflow_id, data.user_id, data.granted_by || null, now]
    )
  }

  async deletePermission(workflowId: string, userId: string): Promise<void> {
    await this.conn.execute(
      `DELETE FROM workflow_permissions WHERE workflow_id = $1 AND user_id = $2`,
      [workflowId, userId]
    )
  }

  async hasPermission(workflowId: string, userId: string): Promise<boolean> {
    const rows = await this.conn.query<{ id: string }>(
      `SELECT id FROM workflow_permissions WHERE workflow_id = $1 AND user_id = $2`,
      [workflowId, userId]
    )
    return rows.length > 0
  }

  async getPermissions(workflowId: string): Promise<Array<{
    id: string
    workflow_id: string
    user_id: string
    granted_by: string | null
    created_at: string
    username: string
    email: string | null
  }>> {
    const rows = await this.conn.query<{
      id: string
      workflow_id: string
      user_id: string
      granted_by: string | null
      created_at: string
      username: string
      email: string | null
    }>(
      `SELECT wp.*, u.username, u.email
       FROM workflow_permissions wp
       JOIN users u ON wp.user_id = u.id
       WHERE wp.workflow_id = $1`,
      [workflowId]
    )
    return rows
  }

  async getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]> {
    const rows = await this.conn.query<WorkflowTemplateRow>(
      `SELECT DISTINCT wt.*
       FROM workflow_templates wt
       LEFT JOIN workflow_permissions wp ON wt.id = wp.workflow_id
       WHERE wt.owner_id = $1
          OR wp.user_id = $1
          OR wt.is_public = true
       ORDER BY wt.created_at DESC`,
      [userId]
    )
    return rows.map(rowToWorkflowTemplate)
  }

  async createVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion> {
    const id = `ver_${uuidv4().replace(/-/g, '')}`
    const now = this.toISODate()

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO workflow_versions (
          id, template_id, version_number, name, description,
          nodes_json, edges_json, change_summary, created_by, created_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          data.template_id,
          data.version_number,
          data.name,
          data.description ?? null,
          data.nodes_json,
          data.edges_json,
          data.change_summary ?? null,
          data.created_by ?? null,
          now,
          data.is_active ?? true,
        ]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO workflow_versions (
          id, template_id, version_number, name, description,
          nodes_json, edges_json, change_summary, created_by, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.template_id,
          data.version_number,
          data.name,
          data.description ?? null,
          data.nodes_json,
          data.edges_json,
          data.change_summary ?? null,
          data.created_by ?? null,
          now,
          data.is_active ?? true ? 1 : 0,
        ]
      )
    }

    return (await this.getVersionById(id))!
  }

  async getVersionById(id: string): Promise<WorkflowVersion | undefined> {
    const rows = await this.conn.query<WorkflowVersionRow>(
      'SELECT * FROM workflow_versions WHERE id = ?',
      [id]
    )
    return rows[0] ? rowToWorkflowVersion(rows[0]) : undefined
  }

  async getVersionsByTemplate(templateId: string): Promise<WorkflowVersion[]> {
    const rows = await this.conn.query<WorkflowVersionRow>(
      'SELECT * FROM workflow_versions WHERE template_id = ? ORDER BY version_number DESC',
      [templateId]
    )
    return rows.map(rowToWorkflowVersion)
  }

  async getActiveVersion(templateId: string): Promise<WorkflowVersion | undefined> {
    let rows: WorkflowVersionRow[]
    if (this.isPostgres()) {
      rows = await this.conn.query<WorkflowVersionRow>(
        'SELECT * FROM workflow_versions WHERE template_id = $1 AND is_active = true ORDER BY version_number DESC LIMIT 1',
        [templateId]
      )
    } else {
      rows = await this.conn.query<WorkflowVersionRow>(
        'SELECT * FROM workflow_versions WHERE template_id = ? AND is_active = 1 ORDER BY version_number DESC LIMIT 1',
        [templateId]
      )
    }
    return rows[0] ? rowToWorkflowVersion(rows[0]) : undefined
  }

  async getLatestVersionNumber(templateId: string): Promise<number> {
    const rows = await this.conn.query<{ max: number | null }>(
      'SELECT MAX(version_number) as max FROM workflow_versions WHERE template_id = ?',
      [templateId]
    )
    return rows[0]?.max ?? 0
  }

  async activateVersion(versionId: string, templateId: string): Promise<void> {
    if (this.isPostgres()) {
      await this.conn.execute(
        'UPDATE workflow_versions SET is_active = false WHERE template_id = $1',
        [templateId]
      )
      await this.conn.execute(
        'UPDATE workflow_versions SET is_active = true WHERE id = $1',
        [versionId]
      )
    } else {
      await this.conn.execute(
        'UPDATE workflow_versions SET is_active = 0 WHERE template_id = ?',
        [templateId]
      )
      await this.conn.execute(
        'UPDATE workflow_versions SET is_active = 1 WHERE id = ?',
        [versionId]
      )
    }
  }

  async deleteVersion(id: string): Promise<void> {
    await this.conn.execute('DELETE FROM workflow_versions WHERE id = ?', [id])
  }

  async saveTemplateVersion(
    templateId: string,
    nodesJson: string,
    edgesJson: string,
    changeSummary: string | null,
    userId: string | null
  ): Promise<WorkflowVersion> {
    const template = await this.getTemplateById(templateId)
    if (!template) throw new Error(`Template ${templateId} not found`)

    const nextVersion = await this.getLatestVersionNumber(templateId) + 1

    return this.createVersion({
      template_id: templateId,
      version_number: nextVersion,
      name: template.name,
      description: template.description,
      nodes_json: nodesJson,
      edges_json: edgesJson,
      change_summary: changeSummary,
      created_by: userId,
      is_active: true,
    })
  }
}
