import type {
  AuditLog,
  AuditLogQuery,
  AuditStats,
  ExecutionLog,
  ExecutionLogDetail,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  CreateAuditLog,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
  UpdateExecutionLog,
} from '../../database/types.js'
import type { ExternalApiLogRepository } from '../../repositories/external-api-log.repository.js'
import type { LogRepository } from '../../repositories/log-repository.js'
import type { UserRepository } from '../../repositories/user-repository.js'
import type { ILogService, LogFilter, LogStats } from './interfaces/index.js'

export class LogService implements ILogService {
  constructor(
    private readonly logRepo: LogRepository,
    private readonly userRepo: UserRepository,
    private readonly externalApiLogRepo: ExternalApiLogRepository
  ) {}

  async getAll(filter: LogFilter): Promise<ExecutionLog[]> {
    const limit = filter.limit ?? 100
    return this.logRepo.getAll(filter.jobId, limit, filter.ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.getById(id, ownerId)
  }

  async create(data: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    return this.logRepo.create(data, ownerId)
  }

  async update(id: string, data: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    const result = await this.logRepo.update(id, data, ownerId)
    if (!result) {
      throw new Error(`ExecutionLog not found: ${id}`)
    }
    return result
  }

  async createDetail(data: CreateExecutionLogDetail): Promise<ExecutionLogDetail> {
    const id = await this.logRepo.createDetail(data)
    const details = await this.logRepo.getDetailsByLogId(data.log_id)
    const detail = details.find(d => d.id === id)
    if (!detail) {
      throw new Error(`ExecutionLogDetail not found after creation: ${id}`)
    }
    return detail
  }

  async updateDetail(
    id: string,
    data: {
      output_result?: string
      error_message?: string
      completed_at?: string
      duration_ms?: number
    }
  ): Promise<void> {
    await this.logRepo.updateDetail(id, data)
  }

  async getDetails(logId: string): Promise<ExecutionLogDetail[]> {
    return this.logRepo.getDetailsByLogId(logId)
  }

  async getStats(ownerId?: string): Promise<LogStats> {
    return this.getExecutionStatsOverview(ownerId)
  }

  async getExecutionStatsOverview(ownerId?: string): Promise<LogStats> {
    return this.logRepo.getStatsOverview(ownerId)
  }

  async getExecutionStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<{ date: string; total: number; success: number; failed: number }[]> {
    return this.logRepo.getStatsTrend(period, ownerId)
  }

  async getExecutionStatsDistribution(ownerId?: string): Promise<{ type: string; count: number }[]> {
    return this.logRepo.getStatsDistribution(ownerId)
  }

  async getExecutionStatsErrors(limit: number = 10, ownerId?: string): Promise<{ errorSummary: string; count: number }[]> {
    return this.logRepo.getStatsErrors(limit, ownerId)
  }

  async createAuditLog(data: CreateAuditLog): Promise<AuditLog> {
    return this.userRepo.createAuditLog(data)
  }

  async getAuditLogById(id: string, ownerId?: string): Promise<AuditLog | null> {
    return this.userRepo.getAuditLogById(id, ownerId)
  }

  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    return this.userRepo.getAuditLogs(query)
  }

  async getAuditStats(userId?: string): Promise<AuditStats> {
    return this.userRepo.getAuditStats(userId)
  }

  async getUniqueRequestPaths(userId?: string): Promise<string[]> {
    return this.userRepo.getUniqueRequestPaths(userId)
  }

  async getUniqueAuditUsers(userId?: string): Promise<{ id: string; username: string }[]> {
    return this.userRepo.getUniqueAuditUsers(userId)
  }

  async getExternalApiLogById(id: number): Promise<ExternalApiLog | null> {
    return this.externalApiLogRepo.getById(String(id))
  }

  async getExternalApiLogs(query: ExternalApiLogQuery): Promise<{ logs: ExternalApiLog[]; total: number }> {
    return this.externalApiLogRepo.queryLogs(query)
  }

  async getExternalApiLogStats(userId?: string): Promise<ExternalApiLogStats> {
    return this.externalApiLogRepo.getStats(userId)
  }

  async getUniqueExternalApiOperations(userId?: string): Promise<string[]> {
    return this.externalApiLogRepo.getUniqueOperations(userId)
  }

  async getUniqueExternalApiProviders(): Promise<string[]> {
    return this.externalApiLogRepo.getUniqueServiceProviders()
  }
}
