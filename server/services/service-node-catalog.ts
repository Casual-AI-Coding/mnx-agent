import type { ServiceNodeRegistry } from './service-node-registry.js'

type CatalogCallable = (...args: never[]) => unknown

export interface MiniMaxServiceNodes {
  readonly chatCompletion: CatalogCallable
  readonly imageGeneration: CatalogCallable
  readonly videoGeneration: CatalogCallable
  readonly textToAudioSync: CatalogCallable
  readonly textToAudioAsync: CatalogCallable
  readonly musicGeneration: CatalogCallable
  readonly lyricsGeneration: CatalogCallable
  readonly textToAudioAsyncStatus: CatalogCallable
  readonly videoGenerationStatus: CatalogCallable
  readonly videoAgentGenerate: CatalogCallable
  readonly videoAgentStatus: CatalogCallable
  readonly fileList: CatalogCallable
  readonly fileUpload: CatalogCallable
  readonly fileRetrieve: CatalogCallable
  readonly fileDelete: CatalogCallable
  readonly voiceList: CatalogCallable
  readonly voiceDelete: CatalogCallable
  readonly voiceClone: CatalogCallable
  readonly voiceDesign: CatalogCallable
  readonly getBalance: CatalogCallable
  readonly getCodingPlanRemains: CatalogCallable
}

export interface DatabaseServiceNodes {
  readonly getPendingTasks: CatalogCallable
  readonly createMediaRecord: CatalogCallable
  readonly updateTask: CatalogCallable
  readonly getTaskById: CatalogCallable
  readonly getAllCronJobs: CatalogCallable
  readonly getCronJobById: CatalogCallable
  readonly createCronJob: CatalogCallable
  readonly updateCronJob: CatalogCallable
  readonly deleteCronJob: CatalogCallable
  readonly toggleCronJobActive: CatalogCallable
  readonly getActiveCronJobs: CatalogCallable
  readonly getAllTasks: CatalogCallable
  readonly createTask: CatalogCallable
  readonly markTaskRunning: CatalogCallable
  readonly markTaskCompleted: CatalogCallable
  readonly markTaskFailed: CatalogCallable
  readonly getQueueStats: CatalogCallable
  readonly getAllExecutionLogs: CatalogCallable
  readonly createExecutionLog: CatalogCallable
  readonly updateExecutionLog: CatalogCallable
  readonly getMediaRecords: CatalogCallable
  readonly getMediaRecordById: CatalogCallable
  readonly updateMediaRecord: CatalogCallable
}

export interface CapacityServiceNodes {
  readonly getRemainingCapacity: CatalogCallable
  readonly hasCapacity: CatalogCallable
  readonly getSafeExecutionLimit: CatalogCallable
  readonly checkBalance: CatalogCallable
  readonly refreshAllCapacity: CatalogCallable
  readonly canExecuteTask: CatalogCallable
  readonly waitForCapacity: CatalogCallable
}

export interface QueueServiceNodes {
  readonly processImageQueueWithCapacity: CatalogCallable
  readonly processQueue: CatalogCallable
  readonly getQueueStats: CatalogCallable
  readonly retryFailedTasks: CatalogCallable
}

export interface MediaStorageServiceNodes {
  readonly saveMediaFile: CatalogCallable
  readonly saveFromUrl: CatalogCallable
  readonly deleteMediaFile: CatalogCallable
  readonly readMediaFile: CatalogCallable
}

export interface UtilityServiceNodes {
  readonly toCSV: CatalogCallable
  readonly generateMediaToken: CatalogCallable
  readonly verifyMediaToken: CatalogCallable
}

export interface ServiceNodeCatalogDependencies {
  readonly minimaxClient: MiniMaxServiceNodes
  readonly dbService: DatabaseServiceNodes
  readonly capacityChecker: CapacityServiceNodes
  readonly queueProcessor: QueueServiceNodes
  readonly mediaStorage: MediaStorageServiceNodes
  readonly utils: UtilityServiceNodes
}

export async function registerServiceNodeCatalog(
  registry: Pick<ServiceNodeRegistry, 'register'>,
  dependencies: ServiceNodeCatalogDependencies,
): Promise<void> {
  await registry.register({
    serviceName: 'minimaxClient',
    instance: dependencies.minimaxClient,
    methods: [
      { name: 'chatCompletion', displayName: 'Text Generation', category: 'MiniMax API' },
      { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
      { name: 'videoGeneration', displayName: 'Video Generation', category: 'MiniMax API' },
      { name: 'textToAudioSync', displayName: 'Voice Sync', category: 'MiniMax API' },
      { name: 'textToAudioAsync', displayName: 'Voice Async', category: 'MiniMax API' },
      { name: 'musicGeneration', displayName: 'Music Generation', category: 'MiniMax API' },
      { name: 'lyricsGeneration', displayName: 'Lyrics Generation', category: 'MiniMax API' },
      { name: 'textToAudioAsyncStatus', displayName: 'Voice Async Status', category: 'MiniMax API' },
      { name: 'videoGenerationStatus', displayName: 'Video Generation Status', category: 'MiniMax API' },
      { name: 'videoAgentGenerate', displayName: 'Video Agent Generate', category: 'MiniMax Video' },
      { name: 'videoAgentStatus', displayName: 'Video Agent Status', category: 'MiniMax Video' },
      { name: 'fileList', displayName: 'File List', category: 'MiniMax File' },
      { name: 'fileUpload', displayName: 'File Upload', category: 'MiniMax File' },
      { name: 'fileRetrieve', displayName: 'File Retrieve', category: 'MiniMax File' },
      { name: 'fileDelete', displayName: 'File Delete', category: 'MiniMax File' },
      { name: 'voiceList', displayName: 'Voice List', category: 'MiniMax Voice' },
      { name: 'voiceDelete', displayName: 'Voice Delete', category: 'MiniMax Voice' },
      { name: 'voiceClone', displayName: 'Voice Clone', category: 'MiniMax Voice' },
      { name: 'voiceDesign', displayName: 'Voice Design', category: 'MiniMax Voice' },
      { name: 'getBalance', displayName: 'Get Balance', category: 'MiniMax Account' },
      { name: 'getCodingPlanRemains', displayName: 'Get Coding Plan Remains', category: 'MiniMax Account' },
    ],
  })

  await registry.register({
    serviceName: 'db',
    instance: dependencies.dbService,
    methods: [
      { name: 'getPendingTasks', displayName: 'Get Pending Tasks', category: 'Database Task' },
      { name: 'createMediaRecord', displayName: 'Create Media Record', category: 'Database Media' },
      { name: 'updateTask', displayName: 'Update Task', category: 'Database Task' },
      { name: 'getTaskById', displayName: 'Get Task By ID', category: 'Database Task' },
      { name: 'getAllCronJobs', displayName: 'Get All Cron Jobs', category: 'Database Cron' },
      { name: 'getCronJobById', displayName: 'Get Cron Job By ID', category: 'Database Cron' },
      { name: 'createCronJob', displayName: 'Create Cron Job', category: 'Database Cron' },
      { name: 'updateCronJob', displayName: 'Update Cron Job', category: 'Database Cron' },
      { name: 'deleteCronJob', displayName: 'Delete Cron Job', category: 'Database Cron' },
      { name: 'toggleCronJobActive', displayName: 'Toggle Cron Job Active', category: 'Database Cron' },
      { name: 'getActiveCronJobs', displayName: 'Get Active Cron Jobs', category: 'Database Cron' },
      { name: 'getAllTasks', displayName: 'Get All Tasks', category: 'Database Task' },
      { name: 'createTask', displayName: 'Create Task', category: 'Database Task' },
      { name: 'markTaskRunning', displayName: 'Mark Task Running', category: 'Database Task' },
      { name: 'markTaskCompleted', displayName: 'Mark Task Completed', category: 'Database Task' },
      { name: 'markTaskFailed', displayName: 'Mark Task Failed', category: 'Database Task' },
      { name: 'getQueueStats', displayName: 'Get Queue Stats', category: 'Database Task' },
      { name: 'getAllExecutionLogs', displayName: 'Get All Execution Logs', category: 'Database Log' },
      { name: 'createExecutionLog', displayName: 'Create Execution Log', category: 'Database Log' },
      { name: 'updateExecutionLog', displayName: 'Update Execution Log', category: 'Database Log' },
      { name: 'getMediaRecords', displayName: 'Get Media Records', category: 'Database Media' },
      { name: 'getMediaRecordById', displayName: 'Get Media Record By ID', category: 'Database Media' },
      { name: 'updateMediaRecord', displayName: 'Update Media Record', category: 'Database Media' },
    ],
  })

  await registry.register({
    serviceName: 'capacityChecker',
    instance: dependencies.capacityChecker,
    methods: [
      { name: 'getRemainingCapacity', displayName: 'Get Remaining Capacity', category: 'Capacity' },
      { name: 'hasCapacity', displayName: 'Check Has Capacity', category: 'Capacity' },
      { name: 'getSafeExecutionLimit', displayName: 'Get Safe Execution Limit', category: 'Capacity' },
      { name: 'checkBalance', displayName: 'Check Balance', category: 'Capacity' },
      { name: 'refreshAllCapacity', displayName: 'Refresh All Capacity', category: 'Capacity' },
      { name: 'canExecuteTask', displayName: 'Can Execute Task', category: 'Capacity' },
      { name: 'waitForCapacity', displayName: 'Wait For Capacity', category: 'Capacity' },
    ],
  })

  await registry.register({
    serviceName: 'mediaStorage',
    instance: dependencies.mediaStorage,
    methods: [
      { name: 'saveMediaFile', displayName: 'Save Media File', category: 'Media Storage' },
      { name: 'saveFromUrl', displayName: 'Save From URL', category: 'Media Storage' },
      { name: 'deleteMediaFile', displayName: 'Delete Media File', category: 'Media Storage' },
      { name: 'readMediaFile', displayName: 'Read Media File', category: 'Media Storage' },
    ],
  })

  await registry.register({
    serviceName: 'queueProcessor',
    instance: dependencies.queueProcessor,
    methods: [
      { name: 'processImageQueueWithCapacity', displayName: 'Process Image Queue', category: 'Queue Processing' },
      { name: 'processQueue', displayName: 'Process Queue', category: 'Queue Processing' },
      { name: 'getQueueStats', displayName: 'Get Queue Stats', category: 'Queue Processing' },
      { name: 'retryFailedTasks', displayName: 'Retry Failed Tasks', category: 'Queue Processing' },
    ],
  })

  await registry.register({
    serviceName: 'utils',
    instance: dependencies.utils,
    methods: [
      { name: 'toCSV', displayName: 'Convert to CSV', category: 'Utils' },
      { name: 'generateMediaToken', displayName: 'Generate Media Token', category: 'Utils' },
      { name: 'verifyMediaToken', displayName: 'Verify Media Token', category: 'Utils' },
    ],
  })
}
