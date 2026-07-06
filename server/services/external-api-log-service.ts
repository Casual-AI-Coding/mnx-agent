import type { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import type {
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
} from '../database/types.js'

export class ExternalApiLogService {
  constructor(private readonly repo: ExternalApiLogRepository) {}

  async queryLogs(filter: ExternalApiLogQuery): Promise<{ logs: ExternalApiLog[]; total: number }> {
    return this.repo.queryLogs(filter)
  }

  async getById(id: string): Promise<ExternalApiLog | null> {
    return this.repo.getById(id)
  }

  async getStats(userId?: string): Promise<ExternalApiLogStats> {
    return this.repo.getStats(userId)
  }

  async getUniqueOperations(userId?: string): Promise<string[]> {
    return this.repo.getUniqueOperations(userId)
  }

  async getUniqueServiceProviders(userId?: string): Promise<string[]> {
    return this.repo.getUniqueServiceProviders(userId)
  }
}
