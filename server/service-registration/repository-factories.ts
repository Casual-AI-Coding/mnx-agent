import type { DatabaseConnection } from '../database/connection.js'
import type { DatabaseService } from '../database/service-async.js'
import { AnnouncementRepository } from '../repositories/announcement-repository.js'
import { CapacityRepository } from '../repositories/capacity-repository.js'
import { DeadLetterRepository } from '../repositories/deadletter-repository.js'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import { JobRepository } from '../repositories/job-repository.js'
import { LogRepository } from '../repositories/log-repository.js'
import { MaterialItemRepository } from '../repositories/material-item-repository.js'
import { MaterialRepository } from '../repositories/material-repository.js'
import { MediaRepository } from '../repositories/media-repository.js'
import { PromptRepository } from '../repositories/prompt-repository.js'
import { PromptTemplateRepository } from '../repositories/prompt-template-repository.js'
import { SystemConfigRepository } from '../repositories/system-config-repository.js'
import { TaskRepository } from '../repositories/task-repository.js'
import { UserRepository } from '../repositories/user-repository.js'
import { WebhookRepository } from '../repositories/webhook-repository.js'
import { WorkflowRepository } from '../repositories/workflow-repository.js'

type RepositoryDatabase = Pick<DatabaseService, 'getConnection'>

function getConnection(database: RepositoryDatabase): DatabaseConnection {
  return database.getConnection()
}

export function createAnnouncementRepository(database: RepositoryDatabase): AnnouncementRepository {
  return new AnnouncementRepository(getConnection(database))
}

export function createWorkflowRepository(database: RepositoryDatabase): WorkflowRepository {
  return new WorkflowRepository(getConnection(database))
}

export function createJobRepository(database: RepositoryDatabase): JobRepository {
  return new JobRepository(getConnection(database))
}

export function createTaskRepositories(database: RepositoryDatabase): {
  taskRepository: TaskRepository
  deadLetterRepository: DeadLetterRepository
} {
  const conn = getConnection(database)
  return {
    taskRepository: new TaskRepository(conn),
    deadLetterRepository: new DeadLetterRepository(conn),
  }
}

export function createLogRepositories(database: RepositoryDatabase): {
  logRepository: LogRepository
  userRepository: UserRepository
} {
  const conn = getConnection(database)
  return {
    logRepository: new LogRepository(conn),
    userRepository: new UserRepository(conn),
  }
}

export function createMediaRepository(database: RepositoryDatabase): MediaRepository {
  return new MediaRepository(getConnection(database))
}

export function createWebhookRepository(database: RepositoryDatabase): WebhookRepository {
  return new WebhookRepository(getConnection(database))
}

export function createCapacityRepository(database: RepositoryDatabase): CapacityRepository {
  return new CapacityRepository(getConnection(database))
}

export function createMaterialRepositories(database: RepositoryDatabase): {
  materialRepository: MaterialRepository
  materialItemRepository: MaterialItemRepository
  promptRepository: PromptRepository
} {
  const conn = getConnection(database)
  return {
    materialRepository: new MaterialRepository(conn),
    materialItemRepository: new MaterialItemRepository(conn),
    promptRepository: new PromptRepository(conn),
  }
}

export function createExportRepositories(database: RepositoryDatabase): {
  logRepository: LogRepository
  mediaRepository: MediaRepository
} {
  const conn = getConnection(database)
  return {
    logRepository: new LogRepository(conn),
    mediaRepository: new MediaRepository(conn),
  }
}

export function createExternalApiLogRepository(database: RepositoryDatabase): ExternalApiLogRepository {
  return new ExternalApiLogRepository(getConnection(database))
}

export function createTemplateRepository(database: RepositoryDatabase): PromptTemplateRepository {
  return new PromptTemplateRepository(getConnection(database))
}

export function createSystemConfigRepository(database: RepositoryDatabase): SystemConfigRepository {
  return new SystemConfigRepository(getConnection(database))
}

export function createServiceNodePermissionRepositories(database: RepositoryDatabase): {
  userRepository: UserRepository
} {
  return { userRepository: new UserRepository(getConnection(database)) }
}

export function getDatabaseConnection(database: RepositoryDatabase): DatabaseConnection {
  return getConnection(database)
}
