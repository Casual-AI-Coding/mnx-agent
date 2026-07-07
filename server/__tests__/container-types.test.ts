import { describe, expect, it } from 'vitest'
import { createContainer } from '../container.js'
import { resolve } from '../container.types.js'
import type { DatabaseConnection } from '../database/connection.js'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import { MediaRepository } from '../repositories/media-repository.js'
import { TOKENS } from '../service-registration.js'
import { ConcurrencyManager } from '../services/concurrency-manager.js'
import { RetryManager } from '../services/retry-manager.js'
import { UserService } from '../services/user-service.js'
import type { IConcurrencyManager } from '../services/interfaces/concurrency-manager.interface.js'
import type { IEventBus } from '../services/interfaces/event-bus.interface.js'
import type { IRetryManager } from '../services/interfaces/retry-manager.interface.js'
import { SettingsService } from '../services/settings-service.js'
import { BackupService } from '../services/backup-service.js'
import { createMockEventBus } from './helpers/mock-event-bus.js'

const fakeConnection: DatabaseConnection = {
  async query() {
    return []
  },
  async execute() {
    return { changes: 0 }
  },
  async transaction(fn) {
    return fn(fakeConnection)
  },
  async close() {},
  isPostgres() {
    return false
  },
}

describe('container typed tokens', () => {
  it('resolves real service-registration tokens with their service types', () => {
    const container = createContainer()
    const concurrencyManager = new ConcurrencyManager()
    const retryManager = new RetryManager()
    const eventBus = createMockEventBus()
    const settingsService = new SettingsService(fakeConnection)
    const externalApiLogRepository = new ExternalApiLogRepository(fakeConnection)
    const mediaRepository = new MediaRepository(fakeConnection)
    const userService = new UserService(fakeConnection)
    const backupService = new BackupService()

    container.register(TOKENS.CONCURRENCY_MANAGER, concurrencyManager)
    container.register(TOKENS.RETRY_MANAGER, retryManager)
    container.register(TOKENS.EVENT_BUS, eventBus)
    container.register(TOKENS.SETTINGS_SERVICE, settingsService)
    container.register(TOKENS.EXTERNAL_API_LOG_REPOSITORY, externalApiLogRepository)
    container.register(TOKENS.MEDIA_REPOSITORY, mediaRepository)
    container.register(TOKENS.USER_SERVICE, userService)
    container.register(TOKENS.BACKUP_SERVICE, backupService)

    const resolvedConcurrencyManager: IConcurrencyManager = resolve(container, TOKENS.CONCURRENCY_MANAGER)
    const resolvedRetryManager: IRetryManager = resolve(container, TOKENS.RETRY_MANAGER)
    const resolvedEventBus: IEventBus = resolve(container, TOKENS.EVENT_BUS)
    const resolvedSettingsService: SettingsService = resolve(container, TOKENS.SETTINGS_SERVICE)
    const resolvedExternalApiLogRepository: ExternalApiLogRepository = resolve(container, TOKENS.EXTERNAL_API_LOG_REPOSITORY)
    const resolvedMediaRepository: MediaRepository = resolve(container, TOKENS.MEDIA_REPOSITORY)
    const resolvedUserService: UserService = resolve(container, TOKENS.USER_SERVICE)
    const resolvedBackupService: BackupService = resolve(container, TOKENS.BACKUP_SERVICE)

    expect(resolvedConcurrencyManager).toBe(concurrencyManager)
    expect(resolvedRetryManager).toBe(retryManager)
    expect(resolvedEventBus).toBe(eventBus)
    expect(resolvedSettingsService).toBe(settingsService)
    expect(resolvedExternalApiLogRepository).toBe(externalApiLogRepository)
    expect(resolvedMediaRepository).toBe(mediaRepository)
    expect(resolvedUserService).toBe(userService)
    expect(resolvedBackupService).toBe(backupService)
  })
})
