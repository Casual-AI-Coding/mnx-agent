import { describe, expect, it } from 'vitest'
import { createContainer } from '../container.js'
import { resolve } from '../container.types.js'
import { TOKENS } from '../service-registration.js'
import { ConcurrencyManager } from '../services/concurrency-manager.js'
import { RetryManager } from '../services/retry-manager.js'
import type { IConcurrencyManager } from '../services/interfaces/concurrency-manager.interface.js'
import type { IEventBus } from '../services/interfaces/event-bus.interface.js'
import type { IRetryManager } from '../services/interfaces/retry-manager.interface.js'
import { createMockEventBus } from './helpers/mock-event-bus.js'

describe('container typed tokens', () => {
  it('resolves real service-registration tokens with their service types', () => {
    const container = createContainer()
    const concurrencyManager = new ConcurrencyManager()
    const retryManager = new RetryManager()
    const eventBus = createMockEventBus()

    container.register(TOKENS.CONCURRENCY_MANAGER, concurrencyManager)
    container.register(TOKENS.RETRY_MANAGER, retryManager)
    container.register(TOKENS.EVENT_BUS, eventBus)

    const resolvedConcurrencyManager: IConcurrencyManager = resolve(container, TOKENS.CONCURRENCY_MANAGER)
    const resolvedRetryManager: IRetryManager = resolve(container, TOKENS.RETRY_MANAGER)
    const resolvedEventBus: IEventBus = resolve(container, TOKENS.EVENT_BUS)

    expect(resolvedConcurrencyManager).toBe(concurrencyManager)
    expect(resolvedRetryManager).toBe(retryManager)
    expect(resolvedEventBus).toBe(eventBus)
  })
})
