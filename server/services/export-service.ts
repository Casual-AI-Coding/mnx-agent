import { DatabaseService, getDatabase } from '../database/service'
import { ExecutionLog } from '../database/types'
import { MediaRecord } from '../database/types'
import { ExportFormat } from '../validation/export-schemas'

export interface ExportOptions {
  format: ExportFormat
  startDate?: string
  endDate?: string
  type?: string
  page?: number
  limit?: number
}

export interface ExportResult {
  data: Record<string, unknown>[] | string
  contentType: string
  filename: string
  count: number
}

export class ExportService {
  private db: DatabaseService

  constructor(db?: DatabaseService) {
    this.db = db ?? getDatabase()
  }

  async exportExecutionLogs(options: ExportOptions): Promise<ExportResult> {
    const { format, startDate, endDate, page = 1, limit = 1000 } = options
    const offset = (page - 1) * limit

    const result = this.db.getExecutionLogsPaginated({
      limit,
      offset,
      startDate,
      endDate,
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
    const { format, type, page = 1, limit = 1000 } = options
    const offset = (page - 1) * limit

    const result = this.db.getMediaRecords({
      type: type,
      limit: limit * page,
      offset: 0,
      includeDeleted: false
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
    if (logs.length === 0) {
      return 'id,job_id,trigger_type,status,started_at,completed_at,duration_ms,tasks_executed,tasks_succeeded,tasks_failed,error_summary\n'
    }

    const headers = Object.keys(logs[0])
    const csvRows = [headers.join(',')]

    for (const log of logs) {
      const values = headers.map(header => {
        const value = log[header]
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  }

  private mediaRecordsToCSV(records: Record<string, unknown>[]): string {
    if (records.length === 0) {
      return 'id,filename,original_name,filepath,type,mime_type,size_bytes,source,task_id,metadata,created_at,updated_at\n'
    }

    const headers = Object.keys(records[0])
    const csvRows = [headers.join(',')]

    for (const record of records) {
      const values = headers.map(header => {
        const value = record[header]
        if (value === null || value === undefined) return ''
        if (header === 'metadata' && typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  }
}

let exportServiceInstance: ExportService | null = null

export function getExportService(db?: DatabaseService): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService(db)
  }
  return exportServiceInstance
}

export function resetExportService(): void {
  exportServiceInstance = null
}