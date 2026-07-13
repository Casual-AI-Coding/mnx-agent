import { describe, expect, it, vi } from 'vitest'
import type { DatabaseConnection } from '../../database/connection.js'
import type { DatabaseService } from '../../database/service-async.js'
import { CapacityRepository } from '../../repositories/capacity-repository.js'
import { DeadLetterRepository } from '../../repositories/deadletter-repository.js'
import { ExternalApiLogRepository } from '../../repositories/external-api-log.repository.js'
import { JobRepository } from '../../repositories/job-repository.js'
import { LogRepository } from '../../repositories/log-repository.js'
import { MaterialItemRepository } from '../../repositories/material-item-repository.js'
import { MaterialRepository } from '../../repositories/material-repository.js'
import { MediaRepository } from '../../repositories/media-repository.js'
import { PromptRepository } from '../../repositories/prompt-repository.js'
import { PromptTemplateRepository } from '../../repositories/prompt-template-repository.js'
import { SystemConfigRepository } from '../../repositories/system-config-repository.js'
import { TaskRepository } from '../../repositories/task-repository.js'
import { UserRepository } from '../../repositories/user-repository.js'
import { WebhookRepository } from '../../repositories/webhook-repository.js'
import { WorkflowRepository } from '../../repositories/workflow-repository.js'
import {
  createCapacityRepository,
  createExternalApiLogRepository,
  createExportRepositories,
  createJobRepository,
  createLogRepositories,
  createMaterialRepositories,
  createMediaRepository,
  createServiceNodePermissionRepositories,
  getDatabaseConnection,
  createSystemConfigRepository,
  createTaskRepositories,
  createTemplateRepository,
  createWebhookRepository,
  createWorkflowRepository,
} from '../repository-factories.js'

type DatabaseFixtureService = Pick<DatabaseService, 'getConnection'>

function createDatabaseFixture(): { database: DatabaseFixtureService; connection: DatabaseConnection } {
  const connection: DatabaseConnection = {
    query: vi.fn(async () => []),
    execute: vi.fn(async () => ({ changes: 0 })),
    transaction: async <T>(fn: (conn: DatabaseConnection) => Promise<T>) => fn(connection),
    close: vi.fn(async () => undefined),
    isPostgres: vi.fn(() => true),
  }
  const database = {
    getConnection: vi.fn(() => connection),
  }
  return { database, connection }
}

describe('repository factories', () => {
  it('creates single repositories from the database connection', () => {
    const { database, connection } = createDatabaseFixture()

    expect(createWorkflowRepository(database)).toBeInstanceOf(WorkflowRepository)
    expect(createJobRepository(database)).toBeInstanceOf(JobRepository)
    expect(createMediaRepository(database)).toBeInstanceOf(MediaRepository)
    expect(createWebhookRepository(database)).toBeInstanceOf(WebhookRepository)
    expect(createCapacityRepository(database)).toBeInstanceOf(CapacityRepository)
    expect(createTemplateRepository(database)).toBeInstanceOf(PromptTemplateRepository)
    expect(createSystemConfigRepository(database)).toBeInstanceOf(SystemConfigRepository)
    expect(createExternalApiLogRepository(database)).toBeInstanceOf(ExternalApiLogRepository)
    expect(getDatabaseConnection(database)).toBe(connection)
    expect(database.getConnection).toHaveBeenCalledTimes(9)
  })

  it('creates grouped repositories for services with multiple repository dependencies', () => {
    const { database } = createDatabaseFixture()

    const taskRepositories = createTaskRepositories(database)
    expect(taskRepositories.taskRepository).toBeInstanceOf(TaskRepository)
    expect(taskRepositories.deadLetterRepository).toBeInstanceOf(DeadLetterRepository)

    const logRepositories = createLogRepositories(database)
    expect(logRepositories.logRepository).toBeInstanceOf(LogRepository)
    expect(logRepositories.userRepository).toBeInstanceOf(UserRepository)

    const materialRepositories = createMaterialRepositories(database)
    expect(materialRepositories.materialRepository).toBeInstanceOf(MaterialRepository)
    expect(materialRepositories.materialItemRepository).toBeInstanceOf(MaterialItemRepository)
    expect(materialRepositories.promptRepository).toBeInstanceOf(PromptRepository)

    const exportRepositories = createExportRepositories(database)
    expect(exportRepositories.logRepository).toBeInstanceOf(LogRepository)
    expect(exportRepositories.mediaRepository).toBeInstanceOf(MediaRepository)

    const serviceNodePermissionRepositories = createServiceNodePermissionRepositories(database)
    expect(serviceNodePermissionRepositories.userRepository).toBeInstanceOf(UserRepository)
    expect(database.getConnection).toHaveBeenCalledTimes(5)
  })
})
