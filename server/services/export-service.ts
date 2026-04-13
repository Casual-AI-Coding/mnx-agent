import type { DatabaseService } from '../database/service-async.js'
import { getDatabaseService } from '../service-registration.js'
import { ExecutionLog } from '../database/types'
import { MediaRecord } from '../database/types'
import { ExportFormat } from '../validation/export-schemas'
import { toCSV, EXECUTION_LOG_HEADERS, MEDIA_RECORD_HEADERS } from '../lib/csv-utils'

export interface ExportOptions {
  format: ExportFormat
  startDate?: string
  endDate?: string
  type?: string
  page?: number
  limit?: number
  ownerId?: string
}

export interface ExportResult {
  data: Record<string, unknown>[] | string
  contentType: string
  filename: string
  count: number
}

export class ExportService {
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
  }

  async exportExecutionLogs(options: ExportOptions): Promise<ExportResult> {
    const { format, startDate, endDate, page = 1, limit = 1000, ownerId } = options
    const offset = (page - 1) * limit

    const result = await this.db.getExecutionLogsPaginated({
      limit,
      offset,
      startDate,
      endDate,
      ownerId,
    })

    const exportData = result.logs.map(log => this.formatExecutionLog(log))

    if (format === 'csv') {
      return {
        data: this.executionLogsToCSV(exportData),
        contentType: 'text/csv',
        filename: `execution-logs-${Date.now()}.csv`,
        count: exportData.length
      }
    }

    return {
      data: JSON.stringify(exportData, null, 2),
      contentType: 'application/json',
      filename: `execution-logs-${Date.now()}.json`,
      count: exportData.length
    }
  }

  async exportMediaRecords(options: ExportOptions): Promise<ExportResult> {
    const { format, type, page = 1, limit = 1000, ownerId } = options
    const offset = (page - 1) * limit

    const result = await this.db.getMediaRecords({
      type: type,
      limit: limit * page,
      offset: 0,
      includeDeleted: false,
      visibilityOwnerId: ownerId,
    })

    const filteredRecords = result.records.slice(offset, offset + limit)
    const exportData = filteredRecords.map(record => this.formatMediaRecord(record))

    if (format === 'csv') {
      return {
        data: this.mediaRecordsToCSV(exportData),
        contentType: 'text/csv',
        filename: `media-records-${Date.now()}.csv`,
        count: exportData.length
      }
    }

    return {
      data: JSON.stringify(exportData, null, 2),
      contentType: 'application/json',
      filename: `media-records-${Date.now()}.json`,
      count: exportData.length
    }
  }

  private formatExecutionLog(log: ExecutionLog): Record<string, unknown> {
    return {
      id: log.id,
      job_id: log.job_id,
      trigger_type: log.trigger_type,
      status: log.status,
      started_at: log.started_at,
      completed_at: log.completed_at,
      duration_ms: log.duration_ms,
      tasks_executed: log.tasks_executed,
      tasks_succeeded: log.tasks_succeeded,
      tasks_failed: log.tasks_failed,
      error_summary: log.error_summary
    }
  }

  private formatMediaRecord(record: MediaRecord): Record<string, unknown> {
    return {
      id: record.id,
      filename: record.filename,
      original_name: record.original_name,
      filepath: record.filepath,
      type: record.type,
      mime_type: record.mime_type,
      size_bytes: record.size_bytes,
      source: record.source,
      task_id: record.task_id,
      metadata: record.metadata,
      created_at: record.created_at,
      updated_at: record.updated_at
    }
  }

  private executionLogsToCSV(logs: Record<string, unknown>[]): string {
    return toCSV(logs, { headers: EXECUTION_LOG_HEADERS })
  }

  private mediaRecordsToCSV(records: Record<string, unknown>[]): string {
    return toCSV(records, {
      headers: MEDIA_RECORD_HEADERS,
      formatters: {
        metadata: (value) => {
          const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
          return `"${str.replace(/"/g, '""')}"`
        },
      },
    })
  }
}

let exportServiceInstance: ExportService | null = null

export function getExportService(db?: DatabaseService): ExportService {
  if (!exportServiceInstance) {
    const database = db ?? getDatabaseService()
    exportServiceInstance = new ExportService(database)
  }
  return exportServiceInstance
}

export function resetExportService(): void {
  exportServiceInstance = null
}