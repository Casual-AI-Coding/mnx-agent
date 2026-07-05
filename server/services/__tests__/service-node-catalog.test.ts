import { describe, expect, it, vi } from 'vitest'
import { registerServiceNodeCatalog } from '../service-node-catalog.js'
import type {
  CapacityServiceNodes,
  DatabaseServiceNodes,
  MediaStorageServiceNodes,
  MiniMaxServiceNodes,
  QueueServiceNodes,
  UtilityServiceNodes,
} from '../service-node-catalog.js'
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
})
