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
import { BaseRepository } from './base-repository.js'

function rowToAuditLog(row: AuditLogRow, usernameMap: Map<string, string>): AuditLog {
  return {
    ...row,
    action: row.action as AuditAction,
    username: row.user_id ? usernameMap.get(row.user_id) ?? null : null,
  }
}

function rowToServiceNodePermission(row: ServiceNodePermissionRow): ServiceNodePermission {
  return {
    ...row,
    is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : row.is_enabled === 1,
  }
}

export class UserRepository extends BaseRepository<AuditLog, CreateAuditLog> {
  protected readonly tableName = 'audit_logs'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): AuditLog {
    return rowToAuditLog(row as AuditLogRow)
  }

  async createAuditLog(data: CreateAuditLog): Promise<AuditLog> {
    const id = uuidv4()
    const now = this.toISODate()
    await this.conn.execute(
      `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, ip_address, user_agent, request_method, request_path, request_body, response_status, error_message, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, data.action, data.resource_type, data.resource_id ?? null, data.user_id ?? null, data.ip_address ?? null, data.user_agent ?? null, data.request_method ?? null, data.request_path ?? null, data.request_body ?? null, data.response_status ?? null, data.error_message ?? null, data.duration_ms ?? null, now]
    )
    return (await this.getById(id))!
  }

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    return this.getById(id)
  }

  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    const { action, resource_type, resource_id, user_id, response_status, request_path, status_filter, start_date, end_date, page = 1, limit = 20, sort_by = 'created_at', sort_order = 'desc' } = query
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
    if (request_path) {
      conditions.push(`request_path LIKE $${paramIndex}`)
      params.push(`%${request_path}%`)
      paramIndex++
    }
    if (status_filter === 'success') {
      conditions.push(`response_status >= 200 AND response_status < 300`)
    } else if (status_filter === 'error') {
      conditions.push(`response_status >= 400`)
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

    const orderBy = sort_by === 'duration_ms' ? 'duration_ms' : 'created_at'
    const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    params.push(limit, offset)
    const rows = await this.conn.query<AuditLogRow>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY ${orderBy} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    // Batch query usernames
    const userIds = rows.map(r => r.user_id).filter(Boolean) as string[]
    const usernameMap = new Map<string, string>()
    if (userIds.length > 0) {
      const uniqueUserIds = [...new Set(userIds)]
      const userRows = await this.conn.query<{ id: string; username: string }>(
        `SELECT id, username FROM users WHERE id = ANY($1)`,
        [uniqueUserIds]
      )
      userRows.forEach(u => usernameMap.set(u.id, u.username))
    }

    return {
      logs: rows.map(row => rowToAuditLog(row, usernameMap)),
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

  async getUniqueRequestPaths(userId?: string): Promise<string[]> {
    const ownerFilter = userId ? 'WHERE user_id = $1' : ''
    const params = userId ? [userId] : []
    
    const rows = await this.conn.query<{ request_path: string }>(
      `SELECT DISTINCT request_path FROM audit_logs WHERE request_path IS NOT NULL AND request_path != '' ${userId ? 'AND user_id = $1' : ''} ORDER BY request_path`,
      params
    )
    return rows.map(row => row.request_path).filter(Boolean)
  }

  async getUniqueAuditUsers(userId?: string): Promise<{ id: string; username: string }[]> {
    const whereClause = userId
      ? 'WHERE user_id = $1 AND user_id IS NOT NULL'
      : 'WHERE user_id IS NOT NULL'
    const params = userId ? [userId] : []
    const rows = await this.conn.query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM audit_logs ${whereClause}`,
      params
    )
    const userIds = rows.map(r => r.user_id).filter(Boolean)
    if (userIds.length === 0) return []
    const userRows = await this.conn.query<{ id: string; username: string }>(
      `SELECT id, username FROM users WHERE id = ANY($1) ORDER BY username`,
      [userIds]
    )
    return userRows
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
    const now = this.toISODate()
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
