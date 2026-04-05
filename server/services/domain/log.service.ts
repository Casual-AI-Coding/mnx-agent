import type { DatabaseService } from '../../database/service-async.js'
import type {
  ExecutionLog,
  ExecutionLogDetail,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  UpdateExecutionLog,
} from '../../database/types.js'
import type { ILogService, LogFilter, LogStats } from './interfaces.js'

export class LogService implements ILogService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(filter: LogFilter): Promise<ExecutionLog[]> {
    const limit = filter.limit ?? 100
    return this.db.getAllExecutionLogs(filter.jobId, limit, filter.ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<ExecutionLog | null> {
    return this.db.getExecutionLogById(id, ownerId)
  }

  async create(data: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    return this.db.createExecutionLog(data, ownerId)
  }

  async update(id: string, data: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    const result = await this.db.updateExecutionLog(id, data, ownerId)
    if (!result) {
      throw new Error(`ExecutionLog not found: ${id}`)
    }
    return result
  }

  async createDetail(data: CreateExecutionLogDetail): Promise<ExecutionLogDetail> {
    const id = await this.db.createExecutionLogDetail(data)
    const details = await this.db.getExecutionLogDetailsByLogId(data.log_id)
    const detail = details.find(d => d.id === id)
    if (!detail) {
      throw new Error(`ExecutionLogDetail not found after creation: ${id}`)
    }
    return detail
  }

  async getDetails(logId: string): Promise<ExecutionLogDetail[]> {
    return this.db.getExecutionLogDetailsByLogId(logId)
  }

  async getStats(ownerId?: string): Promise<LogStats> {
    return this.db.getExecutionStatsOverview(ownerId)
  }
}