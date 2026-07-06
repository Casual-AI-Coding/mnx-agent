import { describe, expect, it, vi } from 'vitest'
import { createDatabaseServiceNodes, registerServiceNodeCatalog } from '../service-node-catalog.js'
import type {
  CapacityServiceNodes,
  DatabaseServiceNodes,
  MediaStorageServiceNodes,
  MiniMaxServiceNodes,
  QueueServiceNodes,
  UtilityServiceNodes,
} from '../service-node-catalog.js'
import { ServiceNodeRegistry, type ServiceConfig } from '../service-node-registry.js'
import type { ServiceNodePermissionService } from '../service-node-permission-service.js'

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

const catalogMethod = vi.fn

describe('registerServiceNodeCatalog', () => {
  it('registers the workflow service node catalog with stable service names and key methods', async () => {
    const { registry, registered } = createRegistryStub()
    const minimaxClient = {
      chatCompletion: catalogMethod(),
      imageGeneration: catalogMethod(),
      videoGeneration: catalogMethod(),
      textToAudioSync: catalogMethod(),
      textToAudioAsync: catalogMethod(),
      musicGeneration: catalogMethod(),
      lyricsGeneration: catalogMethod(),
      textToAudioAsyncStatus: catalogMethod(),
      videoGenerationStatus: catalogMethod(),
      videoAgentGenerate: catalogMethod(),
      videoAgentStatus: catalogMethod(),
      fileList: catalogMethod(),
      fileUpload: catalogMethod(),
      fileRetrieve: catalogMethod(),
      fileDelete: catalogMethod(),
      voiceList: catalogMethod(),
      voiceDelete: catalogMethod(),
      voiceClone: catalogMethod(),
      voiceDesign: catalogMethod(),
      getBalance: catalogMethod(),
      getCodingPlanRemains: catalogMethod(),
    } satisfies MiniMaxServiceNodes
    const dbService = {
      getPendingTasks: catalogMethod(),
      createMediaRecord: catalogMethod(),
      updateTask: catalogMethod(),
      getTaskById: catalogMethod(),
      getAllCronJobs: catalogMethod(),
      getCronJobById: catalogMethod(),
      createCronJob: catalogMethod(),
      updateCronJob: catalogMethod(),
      deleteCronJob: catalogMethod(),
      toggleCronJobActive: catalogMethod(),
      getActiveCronJobs: catalogMethod(),
      getAllTasks: catalogMethod(),
      createTask: catalogMethod(),
      markTaskRunning: catalogMethod(),
      markTaskCompleted: catalogMethod(),
      markTaskFailed: catalogMethod(),
      getQueueStats: catalogMethod(),
      getAllExecutionLogs: catalogMethod(),
      createExecutionLog: catalogMethod(),
      updateExecutionLog: catalogMethod(),
      getMediaRecords: catalogMethod(),
      getMediaRecordById: catalogMethod(),
      updateMediaRecord: catalogMethod(),
    } satisfies DatabaseServiceNodes
    const capacityChecker = {
      getRemainingCapacity: catalogMethod(),
      hasCapacity: catalogMethod(),
      getSafeExecutionLimit: catalogMethod(),
      checkBalance: catalogMethod(),
      refreshAllCapacity: catalogMethod(),
      canExecuteTask: catalogMethod(),
      waitForCapacity: catalogMethod(),
    } satisfies CapacityServiceNodes
    const queueProcessor = {
      processImageQueueWithCapacity: catalogMethod(),
      processQueue: catalogMethod(),
      getQueueStats: catalogMethod(),
      retryFailedTasks: catalogMethod(),
    } satisfies QueueServiceNodes
    const mediaStorage = {
      saveMediaFile: catalogMethod(),
      saveFromUrl: catalogMethod(),
      deleteMediaFile: catalogMethod(),
      readMediaFile: catalogMethod(),
    } satisfies MediaStorageServiceNodes
    const utils = {
      toCSV: catalogMethod(),
      generateMediaToken: catalogMethod(),
      verifyMediaToken: catalogMethod(),
    } satisfies UtilityServiceNodes

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

  it('creates db service nodes by forwarding to domain services', async () => {
    const mediaRecord = { id: 'media-1' }
    const task = { id: 'task-1' }
    const job = { id: 'job-1' }
    const log = { id: 'log-1' }
    const jobService = {
      getAll: vi.fn<(ownerId?: string) => Promise<unknown>>().mockResolvedValue([job]),
      getById: vi.fn<(id: string, ownerId?: string) => Promise<unknown>>().mockResolvedValue(job),
      create: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(job),
      update: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(job),
      delete: vi.fn<(id: string, ownerId?: string) => Promise<void>>().mockResolvedValue(undefined),
      toggle: vi.fn<(id: string, ownerId?: string) => Promise<unknown>>().mockResolvedValue(job),
      getActive: vi.fn<() => Promise<unknown>>().mockResolvedValue([job]),
    }
    const taskService = {
      getPendingByJobId: vi.fn<(jobId: string, limit: number, ownerId?: string) => Promise<unknown>>().mockResolvedValue([task]),
      update: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(task),
      getById: vi.fn<(id: string, ownerId?: string) => Promise<unknown>>().mockResolvedValue(task),
      getAll: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue({ tasks: [task], total: 1 }),
      create: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(task),
      markRunning: vi.fn<(id: string) => Promise<unknown>>().mockResolvedValue(task),
      markCompleted: vi.fn<(id: string, result?: string, ownerId?: string) => Promise<unknown>>().mockResolvedValue(task),
      markFailed: vi.fn<(id: string, error: string, ownerId?: string) => Promise<unknown>>().mockResolvedValue(task),
      getQueueStats: vi.fn<(jobId?: string) => Promise<unknown>>().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }),
    }
    const logService = {
      getAll: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue([log]),
      create: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(log),
      update: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(log),
    }
    const mediaService = {
      create: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(mediaRecord),
      getAll: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue({ records: [mediaRecord], total: 1 }),
      getById: vi.fn<(id: string, ownerId?: string, includePublic?: boolean) => Promise<unknown>>().mockResolvedValue(mediaRecord),
      update: vi.fn<(...args: readonly unknown[]) => Promise<unknown>>().mockResolvedValue(mediaRecord),
    }

    const dbService = createDatabaseServiceNodes({ jobService, taskService, logService, mediaService })

    await expect(dbService.createMediaRecord({ filename: 'image.png', type: 'image', source: 'workflow', filepath: '/tmp/image.png' }, 'owner-1')).resolves.toBe(mediaRecord)
    await expect(dbService.getTaskById('task-1', 'owner-1')).resolves.toBe(task)
    await expect(dbService.getAllCronJobs('owner-1')).resolves.toEqual([job])
    await expect(dbService.getAllExecutionLogs('job-1', 5, 'owner-1')).resolves.toEqual([log])

    expect(mediaService.create).toHaveBeenCalledWith({ filename: 'image.png', type: 'image', source: 'workflow', filepath: '/tmp/image.png' }, 'owner-1')
    expect(taskService.getById).toHaveBeenCalledWith('task-1', 'owner-1')
    expect(jobService.getAll).toHaveBeenCalledWith('owner-1')
    expect(logService.getAll).toHaveBeenCalledWith({ jobId: 'job-1', limit: 5, ownerId: 'owner-1' })
  })

  it('registers callable db service nodes on the real service registry', async () => {
    const mediaRecord = { id: 'media-1' }
    const job = { id: 'job-1' }
    const permissionService = {
      upsert: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      getAll: vi.fn<() => Promise<[]>>().mockResolvedValue([]),
      get: vi.fn<() => Promise<null>>().mockResolvedValue(null),
      update: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }
    const dbService = createDatabaseServiceNodes({
      jobService: {
        getAll: vi.fn<(ownerId?: string) => Promise<unknown>>().mockResolvedValue([job]),
        getById: vi.fn<() => Promise<unknown>>().mockResolvedValue(job),
        create: vi.fn<() => Promise<unknown>>().mockResolvedValue(job),
        update: vi.fn<() => Promise<unknown>>().mockResolvedValue(job),
        delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
        toggle: vi.fn<() => Promise<unknown>>().mockResolvedValue(job),
        getActive: vi.fn<() => Promise<unknown>>().mockResolvedValue([job]),
      },
      taskService: {
        getPendingByJobId: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
        update: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'task-1' }),
        getById: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'task-1' }),
        getAll: vi.fn<() => Promise<unknown>>().mockResolvedValue({ tasks: [], total: 0 }),
        create: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'task-1' }),
        markRunning: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'task-1' }),
        markCompleted: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'task-1' }),
        markFailed: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'task-1' }),
        getQueueStats: vi.fn<() => Promise<unknown>>().mockResolvedValue({ pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }),
      },
      logService: {
        getAll: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
        create: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'log-1' }),
        update: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'log-1' }),
      },
      mediaService: {
        create: vi.fn<() => Promise<unknown>>().mockResolvedValue(mediaRecord),
        getAll: vi.fn<() => Promise<unknown>>().mockResolvedValue({ records: [mediaRecord], total: 1 }),
        getById: vi.fn<() => Promise<unknown>>().mockResolvedValue(mediaRecord),
        update: vi.fn<() => Promise<unknown>>().mockResolvedValue(mediaRecord),
      },
    })
    const { registered, registry } = createRegistryStub()

    await registerServiceNodeCatalog(registry, {
      minimaxClient: {
        chatCompletion: catalogMethod(),
        imageGeneration: catalogMethod(),
        videoGeneration: catalogMethod(),
        textToAudioSync: catalogMethod(),
        textToAudioAsync: catalogMethod(),
        musicGeneration: catalogMethod(),
        lyricsGeneration: catalogMethod(),
        textToAudioAsyncStatus: catalogMethod(),
        videoGenerationStatus: catalogMethod(),
        videoAgentGenerate: catalogMethod(),
        videoAgentStatus: catalogMethod(),
        fileList: catalogMethod(),
        fileUpload: catalogMethod(),
        fileRetrieve: catalogMethod(),
        fileDelete: catalogMethod(),
        voiceList: catalogMethod(),
        voiceDelete: catalogMethod(),
        voiceClone: catalogMethod(),
        voiceDesign: catalogMethod(),
        getBalance: catalogMethod(),
        getCodingPlanRemains: catalogMethod(),
      },
      dbService,
      capacityChecker: {
        getRemainingCapacity: catalogMethod(),
        hasCapacity: catalogMethod(),
        getSafeExecutionLimit: catalogMethod(),
        checkBalance: catalogMethod(),
        refreshAllCapacity: catalogMethod(),
        canExecuteTask: catalogMethod(),
        waitForCapacity: catalogMethod(),
      },
      queueProcessor: {
        processImageQueueWithCapacity: catalogMethod(),
        processQueue: catalogMethod(),
        getQueueStats: catalogMethod(),
        retryFailedTasks: catalogMethod(),
      },
      mediaStorage: {
        saveMediaFile: catalogMethod(),
        saveFromUrl: catalogMethod(),
        deleteMediaFile: catalogMethod(),
        readMediaFile: catalogMethod(),
      },
      utils: {
        toCSV: catalogMethod(),
        generateMediaToken: catalogMethod(),
        verifyMediaToken: catalogMethod(),
      },
    })

    const realRegistry = new ServiceNodeRegistry(permissionService as unknown as ServiceNodePermissionService)
    const dbConfig = registered.find(config => config.serviceName === 'db')
    expect(dbConfig).toBeDefined()
    await realRegistry.register(dbConfig as ServiceConfig)

    await expect(realRegistry.call('db', 'createMediaRecord', [{ filename: 'image.png', type: 'image', source: 'workflow', filepath: '/tmp/image.png' }, 'owner-1'])).resolves.toBe(mediaRecord)
    await expect(realRegistry.call('db', 'getAllCronJobs', ['owner-1'])).resolves.toEqual([job])
  })
})
