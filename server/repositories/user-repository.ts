import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  AuditLog,
  AuditLogRow,
  CreateAuditLog,
  AuditLogQuery,
  AuditStats,
  ServiceNodePermission,
  ServiceNodePermissionRow,
  CreateServiceNodePermission,
} from '../database/types.js'
import { AuditAction } from '../database/types.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    ...row,
    action: row.action as AuditAction,
  }
}

function rowToServiceNodePermission(row: ServiceNodePermissionRow): ServiceNodePermission {
  return {
    ...row,
    is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : row.is_enabled === 1,
  }
}

export class UserRepository {
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  protected isPostgres(): boolean {
    return this.conn.isPostgres()
  }

  async createAuditLog(data: CreateAuditLog): Promise<AuditLog> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, ip_address, user_agent, request_method, request_path, request_body, response_status, error_message, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, data.action, data.resource_type, data.resource_id ?? null, data.user_id ?? null, data.ip_address ?? null, data.user_agent ?? null, data.request_method ?? null, data.request_path ?? null, data.request_body ?? null, data.response_status ?? null, data.error_message ?? null, data.duration_ms ?? null, now]
    )
    return (await this.getAuditLogById(id))!
  }

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    const rows = await this.conn.query<AuditLogRow>('SELECT * FROM audit_logs WHERE id = $1', [id])
    return rows[0] ? rowToAuditLog(rows[0]) : null
  }

  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    const { action, resource_type, resource_id, user_id, response_status, start_date, end_date, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (action) {
      conditions.push(`action = $${paramIndex}`)
      params.push(action)
      paramIndex++
    }
    if (resource_type) {
      conditions.push(`resource_type = $${paramIndex}`)
      params.push(resource_type)
      paramIndex++
    }
    if (resource_id) {
      conditions.push(`resource_id = $${paramIndex}`)
      params.push(resource_id)
      paramIndex++
    }
    if (user_id) {
      conditions.push(`user_id = $${paramIndex}`)
      params.push(user_id)
      paramIndex++
    }
    if (response_status !== undefined) {
      conditions.push(`response_status = $${paramIndex}`)
      params.push(response_status)
      paramIndex++
    }
    if (start_date) {
      conditions.push(`created_at >= $${paramIndex}`)
      params.push(start_date)
      paramIndex++
    }
    if (end_date) {
      conditions.push(`created_at <= $${paramIndex}`)
      params.push(end_date)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<AuditLogRow>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      logs: rows.map(rowToAuditLog),
      total,
    }
  }

  async getAuditStats(userId?: string): Promise<AuditStats> {
    const ownerFilter = userId ? 'WHERE user_id = $1' : ''
    const params = userId ? [userId] : []

    const totalRows = await this.conn.query<{ count: string }>(`SELECT COUNT(*) as count FROM audit_logs ${ownerFilter}`, params)
    const total_logs = parseInt(totalRows[0]?.count ?? '0', 10)

    const actionRows = await this.conn.query<{ action: string; count: string }>(
      `SELECT action, COUNT(*) as count FROM audit_logs ${ownerFilter} GROUP BY action`,
      params
    )
    const by_action: Record<string, number> = { create: 0, update: 0, delete: 0, execute: 0 }
    actionRows.forEach(row => { by_action[row.action] = parseInt(row.count, 10) })

    const resourceRows = await this.conn.query<{ resource_type: string; count: string }>(
      `SELECT resource_type, COUNT(*) as count FROM audit_logs ${ownerFilter} GROUP BY resource_type`,
      params
    )
    const by_resource_type: Record<string, number> = {}
    resourceRows.forEach(row => { by_resource_type[row.resource_type] = parseInt(row.count, 10) })

    const statusRows = await this.conn.query<{ response_status: string; count: string }>(
      `SELECT response_status, COUNT(*) as count FROM audit_logs WHERE response_status IS NOT NULL ${userId ? 'AND user_id = $1' : ''} GROUP BY response_status`,
      params
    )
    const by_response_status: Record<string, number> = {}
    statusRows.forEach(row => { by_response_status[row.response_status] = parseInt(row.count, 10) })

    const avgDurationRows = await this.conn.query<{ avg_duration: string }>(
      `SELECT COALESCE(AVG(duration_ms), 0) as avg_duration FROM audit_logs WHERE duration_ms IS NOT NULL ${userId ? 'AND user_id = $1' : ''}`,
      params
    )
    const avg_duration = parseFloat(avgDurationRows[0]?.avg_duration ?? '0')

    return {
      total_logs,
      by_action: by_action as Record<'create' | 'update' | 'delete' | 'execute', number>,
      by_resource_type,
      by_response_status,
      avg_duration_ms: Math.round(avg_duration),
    }
  }

  async getAllServiceNodePermissions(): Promise<ServiceNodePermission[]> {
    const rows = await this.conn.query<ServiceNodePermissionRow>(
      'SELECT * FROM service_node_permissions ORDER BY category, display_name'
    )
    return rows.map(row => ({
      id: row.id,
      service_name: row.service_name,
      method_name: row.method_name,
      display_name: row.display_name,
      category: row.category,
      min_role: row.min_role,
      is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : row.is_enabled === 1,
      created_at: row.created_at,
    }))
  }

  async getServiceNodePermission(serviceName: string, methodName: string): Promise<ServiceNodePermission | null> {
    const rows = await this.conn.query<ServiceNodePermissionRow>(
      'SELECT * FROM service_node_permissions WHERE service_name = $1 AND method_name = $2',
      [serviceName, methodName]
    )
    if (!rows[0]) return null
    const row = rows[0]
    return {
      id: row.id,
      service_name: row.service_name,
      method_name: row.method_name,
      display_name: row.display_name,
      category: row.category,
      min_role: row.min_role,
      is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : row.is_enabled === 1,
      created_at: row.created_at,
    }
  }

  async updateServiceNodePermission(
    id: string,
    data: { min_role?: string; is_enabled?: boolean }
  ): Promise<void> {
    const updates: string[] = []
    const values: (string | number | boolean)[] = []
    let paramIndex = 1

    if (data.min_role !== undefined) {
      updates.push(`min_role = $${paramIndex}`)
      values.push(data.min_role)
      paramIndex++
    }
    if (data.is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex}`)
      values.push(this.isPostgres() ? data.is_enabled : data.is_enabled ? 1 : 0)
      paramIndex++
    }

    if (updates.length === 0) return

    values.push(id)
    await this.conn.execute(
      `UPDATE service_node_permissions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  async upsertServiceNodePermission(data: CreateServiceNodePermission): Promise<void> {
    const id = uuidv4()
    const now = toISODate()
    const minRole = data.min_role || 'pro'
    const isEnabled = data.is_enabled !== undefined ? data.is_enabled : true

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO service_node_permissions (id, service_name, method_name, display_name, category, min_role, is_enabled, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (service_name, method_name)
         DO UPDATE SET display_name = EXCLUDED.display_name, category = EXCLUDED.category, min_role = EXCLUDED.min_role, is_enabled = EXCLUDED.is_enabled`,
        [id, data.service_name, data.method_name, data.display_name, data.category, minRole, isEnabled, now]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO service_node_permissions (id, service_name, method_name, display_name, category, min_role, is_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(service_name, method_name) DO UPDATE SET display_name = excluded.display_name, category = excluded.category, min_role = excluded.min_role, is_enabled = excluded.is_enabled`,
        [id, data.service_name, data.method_name, data.display_name, data.category, minRole, isEnabled ? 1 : 0, now]
      )
    }
  }

  async deleteServiceNodePermission(id: string): Promise<void> {
    await this.conn.execute(
      `DELETE FROM service_node_permissions WHERE id = $1`,
      [id]
    )
  }

  async batchUpsertServiceNodePermissions(
    nodes: Array<CreateServiceNodePermission>
  ): Promise<void> {
    for (const node of nodes) {
      await this.upsertServiceNodePermission(node)
    }
  }
}
