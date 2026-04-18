/**
 * External API Log Repository
 */

import { DatabaseConnection } from '../database/connection.js'
import type {
  ExternalApiLog,
  ExternalApiLogRow,
  CreateExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'
import { toLocalISODateString } from '../lib/date-utils.js'

function rowToExternalApiLog(row: ExternalApiLogRow): ExternalApiLog {
  const requestParams = row.request_params
    ? (typeof row.request_params === 'string' ? JSON.parse(row.request_params) : row.request_params)
    : null
  return {
    ...row,
    status: row.status as 'success' | 'failed',
    request_params: requestParams,
  }
}

export class ExternalApiLogRepository extends BaseRepository<ExternalApiLog, CreateExternalApiLog> {
  protected readonly tableName = 'external_api_logs'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): ExternalApiLog {
    return rowToExternalApiLog(row as ExternalApiLogRow)
  }

  async create(data: CreateExternalApiLog): Promise<ExternalApiLog> {
    const now = toLocalISODateString()
    const result = await this.conn.query<{ id: number }>(
      `INSERT INTO external_api_logs (
        service_provider, api_endpoint, operation, request_params, request_body, response_body,
        status, error_message, duration_ms, user_id, trace_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        data.service_provider,
        data.api_endpoint,
        data.operation,
        data.request_params ? JSON.stringify(data.request_params) : null,
        data.request_body ?? null,
        data.response_body ?? null,
        data.status,
        data.error_message ?? null,
        data.duration_ms ?? null,
        data.user_id ?? null,
        data.trace_id ?? null,
        now,
      ]
    )
    const id = result[0]?.id
    if (!id) {
      throw new Error('Failed to create external API log')
    }
    return (await this.getById(String(id)))!
  }

  async getById(id: string): Promise<ExternalApiLog | null> {
    const rows = await this.conn.query<ExternalApiLogRow>(
      'SELECT * FROM external_api_logs WHERE id = $1',
      [parseInt(id, 10)]
    )
    return rows[0] ? rowToExternalApiLog(rows[0]) : null
  }

  async queryLogs(query: ExternalApiLogQuery): Promise<{ logs: ExternalApiLog[]; total: number }> {
    const {
      service_provider,
      status,
      operation,
      user_id,
      start_date,
      end_date,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (service_provider) {
      conditions.push(`service_provider = $${paramIndex}`)
      params.push(service_provider)
      paramIndex++
    }
    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }
    if (operation) {
      conditions.push(`operation = $${paramIndex}`)
      params.push(operation)
      paramIndex++
    }
    if (user_id) {
      conditions.push(`user_id = $${paramIndex}`)
      params.push(user_id)
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
      `SELECT COUNT(*) as count FROM external_api_logs ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    const orderBy = sort_by === 'duration_ms' ? 'duration_ms' : 'created_at'
    const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    params.push(limit, offset)
    const rows = await this.conn.query<ExternalApiLogRow>(
      `SELECT * FROM external_api_logs ${whereClause} ORDER BY ${orderBy} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      logs: rows.map(rowToExternalApiLog),
      total,
    }
  }

  async getStats(userId?: string): Promise<ExternalApiLogStats> {
    const ownerFilter = userId ? 'WHERE user_id = $1' : ''
    const params = userId ? [userId] : []

    const totalRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM external_api_logs ${ownerFilter}`,
      params
    )
    const total_logs = parseInt(totalRows[0]?.count ?? '0', 10)

    const providerRows = await this.conn.query<{ service_provider: string; count: string }>(
      `SELECT service_provider, COUNT(*) as count FROM external_api_logs ${ownerFilter} GROUP BY service_provider`,
      params
    )
    const by_service_provider: Record<string, number> = {}
    providerRows.forEach(row => {
      by_service_provider[row.service_provider] = parseInt(row.count, 10)
    })

    const statusRows = await this.conn.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM external_api_logs ${ownerFilter} GROUP BY status`,
      params
    )
    const by_status: Record<string, number> = { success: 0, failed: 0 }
    statusRows.forEach(row => {
      by_status[row.status] = parseInt(row.count, 10)
    })

    const operationRows = await this.conn.query<{ operation: string; count: string }>(
      `SELECT operation, COUNT(*) as count FROM external_api_logs ${ownerFilter} GROUP BY operation`,
      params
    )
    const by_operation: Record<string, number> = {}
    operationRows.forEach(row => {
      by_operation[row.operation] = parseInt(row.count, 10)
    })

    const avgDurationRows = await this.conn.query<{ avg_duration: string }>(
      `SELECT COALESCE(AVG(duration_ms), 0) as avg_duration FROM external_api_logs WHERE duration_ms IS NOT NULL ${userId ? 'AND user_id = $1' : ''}`,
      params
    )
    const avg_duration = parseFloat(avgDurationRows[0]?.avg_duration ?? '0')

    return {
      total_logs,
      by_service_provider,
      by_status,
      by_operation,
      avg_duration_ms: Math.round(avg_duration),
    }
  }

  async getUniqueOperations(userId?: string): Promise<string[]> {
    const ownerFilter = userId ? 'WHERE user_id = $1' : ''
    const params = userId ? [userId] : []

    const rows = await this.conn.query<{ operation: string }>(
      `SELECT DISTINCT operation FROM external_api_logs WHERE operation IS NOT NULL ${userId ? 'AND user_id = $1' : ''} ORDER BY operation`,
      params
    )
    return rows.map(row => row.operation).filter(Boolean)
  }

  async getUniqueServiceProviders(userId?: string): Promise<string[]> {
    const ownerFilter = userId ? 'WHERE user_id = $1' : ''
    const params = userId ? [userId] : []

    const rows = await this.conn.query<{ service_provider: string }>(
      `SELECT DISTINCT service_provider FROM external_api_logs WHERE service_provider IS NOT NULL ${userId ? 'AND user_id = $1' : ''} ORDER BY service_provider`,
      params
    )
    return rows.map(row => row.service_provider).filter(Boolean)
  }
}