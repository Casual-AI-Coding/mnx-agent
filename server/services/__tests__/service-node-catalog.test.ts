import { describe, expect, it, vi } from 'vitest'
import { registerServiceNodeCatalog } from '../service-node-catalog.js'
import type { ServiceConfig, ServiceNodeRegistry } from '../service-node-registry.js'

type RegistryStub = Pick<ServiceNodeRegistry, 'register'>

function createRegistryStub(): { registry: RegistryStub; registered: ServiceConfig[] } {
  const registered: ServiceConfig[] = []

  return {
    registered,
    registry: {
      register: vi.fn(async (config: ServiceConfig) => {
        registered.push(config)
      }),
    },
  }
}

describe('registerServiceNodeCatalog', () => {
  it('registers the workflow service node catalog with stable service names and key methods', async () => {
    const { registry, registered } = createRegistryStub()
    const minimaxClient = { chatCompletion: vi.fn(), imageGeneration: vi.fn(), getBalance: vi.fn() }
    const dbService = { getPendingTasks: vi.fn(), createMediaRecord: vi.fn(), updateTask: vi.fn(), createCronJob: vi.fn() }
    const capacityChecker = { getRemainingCapacity: vi.fn(), canExecuteTask: vi.fn() }
    const queueProcessor = { processQueue: vi.fn(), retryFailedTasks: vi.fn() }
    const mediaStorage = { saveMediaFile: vi.fn(), saveFromUrl: vi.fn(), deleteMediaFile: vi.fn(), readMediaFile: vi.fn() }
    const utils = { toCSV: vi.fn(), generateMediaToken: vi.fn(), verifyMediaToken: vi.fn() }

    await registerServiceNodeCatalog(registry, {
      minimaxClient,
      dbService,
      capacityChecker,
      queueProcessor,
      mediaStorage,
      utils,
    })

    expect(registry.register).toHaveBeenCalledTimes(6)
    expect(registered.map(config => config.serviceName)).toEqual([
      'minimaxClient',
      'db',
      'capacityChecker',
      'mediaStorage',
      'queueProcessor',
      'utils',
    ])
    expect(registered[0].methods.map(method => method.name)).toContain('chatCompletion')
    expect(registered[1].methods.map(method => method.name)).toContain('createCronJob')
    expect(registered[3].instance).toBe(mediaStorage)
    expect(registered[5].methods.map(method => method.name)).toEqual(['toCSV', 'generateMediaToken', 'verifyMediaToken'])
  })
})
