import type {
  AuditLog,
  AuditLogQuery,
  AuditStats,
  CreateAuditLog,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  ExecutionLog,
  ExecutionLogDetail,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
  RunStats,
  UpdateExecutionLog,
} from '../types.js'
import type { ExternalApiLogRepository, LogRepository, UserRepository } from '../../repositories/index.js'

export class LogService {
  constructor(
    private readonly logRepo: LogRepository,
    private readonly userRepo: UserRepository,
    private readonly externalApiLogRepo: ExternalApiLogRepository,
  ) {}

  async getAllExecutionLogs(jobId?: string, limit: number = 100, ownerId?: string): Promise<ExecutionLog[]> {
    return this.logRepo.getAll(jobId, limit, ownerId)
  }

  async getExecutionLogsPaginated(options: {
    limit: number
    offset: number
    startDate?: string
    endDate?: string
    ownerId?: string
  }): Promise<{ logs: ExecutionLog[]; total: number }> {
    return this.logRepo.getPaginated(options)
  }

  async getExecutionLogById(id: string, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.getById(id, ownerId)
  }

  async createExecutionLog(log: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    return this.logRepo.create(log, ownerId)
  }

  async updateExecutionLog(id: string, updates: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.update(id, updates, ownerId)
  }

  async completeExecutionLog(id: string, stats: RunStats, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.complete(id, stats, ownerId)
  }

  async getRecentExecutionLogs(limit: number = 20, ownerId?: string): Promise<ExecutionLog[]> {
    return this.logRepo.getRecent(limit, ownerId)
  }

  async createExecutionLogDetail(data: CreateExecutionLogDetail): Promise<string> {
    return this.logRepo.createDetail(data)
  }

  async updateExecutionLogDetail(
    id: string,
    data: {
      output_result?: string
      error_message?: string
      completed_at?: string
      duration_ms?: number
    }
  ): Promise<void> {
    return this.logRepo.updateDetail(id, data)
  }

  async getExecutionLogDetailsByLogId(logId: string): Promise<ExecutionLogDetail[]> {
    return this.logRepo.getDetailsByLogId(logId)
  }

  async getExecutionStatsOverview(ownerId?: string): Promise<{
    totalExecutions: number
    successRate: number
    avgDuration: number
    errorCount: number
  }> {
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

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    return this.userRepo.getAuditLogById(id)
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
