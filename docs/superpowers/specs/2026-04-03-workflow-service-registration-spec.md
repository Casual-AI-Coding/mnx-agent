# Workflow Engine 服务注册补充方案

> 生成日期: 2026-04-03
> 目标: 完善 ServiceNodeRegistry 注册，确保 workflow action 节点可调用系统核心能力

## 一、现状分析

### 已注册服务（共 16 个方法）

| 服务名 | 已注册方法 | 类别 |
|--------|------------|------|
| minimaxClient | chatCompletion, imageGeneration, videoGeneration, textToAudioSync, textToAudioAsync, musicGeneration | MiniMax API |
| db | getPendingTasks, createMediaRecord, updateTask, getTaskById | Database |
| capacityChecker | getRemainingCapacity, hasCapacity, getSafeExecutionLimit | Capacity |
| mediaStorage | saveMediaFile, saveFromUrl | Media Storage |
| queueProcessor | processImageQueueWithCapacity | Queue Processing |

### 未注册但有价值的 API 方法

经代码分析发现，系统有大量已实现但未注册到 ServiceNodeRegistry 的方法，导致 workflow action 节点无法调用这些能力。

---

## 二、需补充注册的方法清单

### 2.1 MiniMaxClient 补充（14 个方法）

**优先级：高**

| 方法名 | 用途 | API Endpoint | 注册理由 |
|--------|------|--------------|----------|
| chatCompletionStream | 流式文本对话 | POST /v1/text/chatcompletion_v2 | 实时输出场景 |
| textToAudioAsyncStatus | 查询异步语音状态 | GET /v1/t2a_async_v2 | workflow 需轮询异步任务 |
| videoGenerationStatus | 查询视频生成状态 | GET /v1/query/video_generation | workflow 需轮询异步任务 |
| videoAgentGenerate | 视频 Agent 生成 | POST /v1/video_template_generation | 视频模板能力 |
| videoAgentStatus | 视频 Agent 状态查询 | GET /v1/query/video_template_generation | 配合 videoAgentGenerate |
| fileList | 文件列表 | GET /v1/files/list | 文件管理 |
| fileUpload | 文件上传 | POST /v1/files/upload | 文件管理 |
| fileRetrieve | 文件检索 | GET /v1/files/retrieve | 文件管理 |
| fileDelete | 文件删除 | POST /v1/files/delete | 文件管理 |
| voiceList | 音色列表 | POST /v1/get_voice | 音色管理 |
| voiceDelete | 音色删除 | POST /v1/delete_voice | 音色管理 |
| voiceClone | 声音克隆 | POST /v1/voice_clone | 核心语音能力 |
| voiceDesign | 音色设计 | POST /v1/voice_design | 核心语音能力 |
| getBalance | 账户余额 | GET /v1/user/balance | 容量管理基础 |
| getCodingPlanRemains | 编程计划余量 | GET /v1/api/openplatform/coding_plan/remains | 容量管理基础 |

### 2.2 DatabaseService 补充（精选 20 个高频方法）

**优先级：高**

从 81 个未注册方法中精选 workflow 常用操作：

#### Cron Jobs 管理（8 个）
| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| getAllCronJobs | 获取所有定时任务 | 任务查询 |
| getCronJobById | 按ID获取任务 | 任务查询 |
| createCronJob | 创建定时任务 | 任务创建（workflow 可能需要动态创建任务） |
| updateCronJob | 更新定时任务 | 任务更新 |
| deleteCronJob | 删除定时任务 | 任务删除 |
| toggleCronJobActive | 启用/禁用任务 | 任务控制 |
| getActiveCronJobs | 获取活跃任务 | 状态查询 |
| updateCronJobLastRun | 更新最后运行时间 | 统计更新 |

#### Task Queue 任务队列（6 个）
| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| getAllTasks | 获取所有任务(分页) | 任务列表 |
| createTask | 创建任务 | 任务创建 |
| markTaskRunning | 标记任务运行中 | 状态管理 |
| markTaskCompleted | 标记任务完成 | 状态管理 |
| markTaskFailed | 标记任务失败 | 状态管理 |
| getQueueStats | 获取队列统计 | 监控统计 |

#### Execution Logs 执行日志（3 个）
| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| getAllExecutionLogs | 获取所有执行日志 | 日志查询 |
| createExecutionLog | 创建执行日志 | 日志记录 |
| updateExecutionLog | 更新执行日志 | 日志更新 |

#### Media Records 媒体记录（3 个）
| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| getMediaRecords | 获取媒体记录列表 | 媒体查询 |
| getMediaRecordById | 按ID获取媒体记录 | 媒体查询 |
| updateMediaRecord | 更新媒体记录 | 媒体管理 |

### 2.3 CapacityChecker 补充（4 个方法）

**优先级：高**

| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| checkBalance | 获取账户余额并缓存 | 容量管理核心 |
| refreshAllCapacity | 刷新所有容量数据 | 容量刷新 |
| canExecuteTask | 检查能否执行任务 | 任务执行前检查 |
| waitForCapacity | 等待容量恢复 | 容量不足时等待 |

### 2.4 QueueProcessor 补充（3 个方法）

**优先级：中**

| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| processQueue | 通用队列处理 | 核心队列能力 |
| getQueueStats | 获取队列统计 | 监控统计 |
| retryFailedTasks | 重试失败任务 | 任务恢复 |

### 2.5 mediaStorage 补充（2 个方法）

**优先级：中**

| 方法名 | 用途 | 注册理由 |
|--------|------|----------|
| deleteMediaFile | 删除媒体文件 | 媒体管理完整 CRUD |
| readMediaFile | 读取媒体文件 | 媒体读取 |

### 2.6 独立工具函数（3 个）

**优先级：中**

| 函数名 | 文件位置 | 用途 | 注册理由 |
|--------|----------|------|----------|
| toCSV | server/lib/csv-utils.ts | 数据导出为 CSV | workflow 常需要导出功能 |
| generateMediaToken | server/lib/media-token.ts | 生成媒体访问令牌 | 媒体权限控制 |
| verifyMediaToken | server/lib/media-token.ts | 验证媒体令牌 | 媒体权限验证 |

---

## 三、注册实施方案

### 3.1 修改 server/index.ts

在 `initializeServices()` 函数中补充注册：

```typescript
// === 现有注册保持不变 ===

// === 新增注册 ===

// MiniMaxClient 补充
serviceRegistry.register({
  serviceName: 'minimaxClient',
  instance: minimaxClient,
  methods: [
    // 现有 6 个
    { name: 'chatCompletion', displayName: 'Text Generation', category: 'MiniMax API' },
    { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
    { name: 'videoGeneration', displayName: 'Video Generation', category: 'MiniMax API' },
    { name: 'textToAudioSync', displayName: 'Voice Sync', category: 'MiniMax API' },
    { name: 'textToAudioAsync', displayName: 'Voice Async', category: 'MiniMax API' },
    { name: 'musicGeneration', displayName: 'Music Generation', category: 'MiniMax API' },
    // 新增 14 个
    { name: 'chatCompletionStream', displayName: 'Text Generation (Stream)', category: 'MiniMax API' },
    { name: 'textToAudioAsyncStatus', displayName: 'Voice Async Status', category: 'MiniMax API' },
    { name: 'videoGenerationStatus', displayName: 'Video Generation Status', category: 'MiniMax API' },
    { name: 'videoAgentGenerate', displayName: 'Video Agent Generate', category: 'MiniMax API' },
    { name: 'videoAgentStatus', displayName: 'Video Agent Status', category: 'MiniMax API' },
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

// DatabaseService 补充（合并注册）
serviceRegistry.register({
  serviceName: 'db',
  instance: dbService,
  methods: [
    // 现有 4 个
    { name: 'getPendingTasks', displayName: 'Get Pending Tasks', category: 'Database Task' },
    { name: 'createMediaRecord', displayName: 'Create Media Record', category: 'Database Media' },
    { name: 'updateTask', displayName: 'Update Task', category: 'Database Task' },
    { name: 'getTaskById', displayName: 'Get Task By ID', category: 'Database Task' },
    // Cron Jobs 新增 8 个
    { name: 'getAllCronJobs', displayName: 'Get All Cron Jobs', category: 'Database Cron' },
    { name: 'getCronJobById', displayName: 'Get Cron Job By ID', category: 'Database Cron' },
    { name: 'createCronJob', displayName: 'Create Cron Job', category: 'Database Cron' },
    { name: 'updateCronJob', displayName: 'Update Cron Job', category: 'Database Cron' },
    { name: 'deleteCronJob', displayName: 'Delete Cron Job', category: 'Database Cron' },
    { name: 'toggleCronJobActive', displayName: 'Toggle Cron Job Active', category: 'Database Cron' },
    { name: 'getActiveCronJobs', displayName: 'Get Active Cron Jobs', category: 'Database Cron' },
    { name: 'updateCronJobLastRun', displayName: 'Update Cron Job Last Run', category: 'Database Cron' },
    // Task Queue 新增 6 个
    { name: 'getAllTasks', displayName: 'Get All Tasks', category: 'Database Task' },
    { name: 'createTask', displayName: 'Create Task', category: 'Database Task' },
    { name: 'markTaskRunning', displayName: 'Mark Task Running', category: 'Database Task' },
    { name: 'markTaskCompleted', displayName: 'Mark Task Completed', category: 'Database Task' },
    { name: 'markTaskFailed', displayName: 'Mark Task Failed', category: 'Database Task' },
    { name: 'getQueueStats', displayName: 'Get Queue Stats', category: 'Database Task' },
    // Execution Logs 新增 3 个
    { name: 'getAllExecutionLogs', displayName: 'Get All Execution Logs', category: 'Database Log' },
    { name: 'createExecutionLog', displayName: 'Create Execution Log', category: 'Database Log' },
    { name: 'updateExecutionLog', displayName: 'Update Execution Log', category: 'Database Log' },
    // Media Records 新增 3 个
    { name: 'getMediaRecords', displayName: 'Get Media Records', category: 'Database Media' },
    { name: 'getMediaRecordById', displayName: 'Get Media Record By ID', category: 'Database Media' },
    { name: 'updateMediaRecord', displayName: 'Update Media Record', category: 'Database Media' },
  ],
})

// CapacityChecker 补充
serviceRegistry.register({
  serviceName: 'capacityChecker',
  instance: capacityChecker,
  methods: [
    // 现有 3 个
    { name: 'getRemainingCapacity', displayName: 'Get Remaining Capacity', category: 'Capacity' },
    { name: 'hasCapacity', displayName: 'Check Has Capacity', category: 'Capacity' },
    { name: 'getSafeExecutionLimit', displayName: 'Get Safe Execution Limit', category: 'Capacity' },
    // 新增 4 个
    { name: 'checkBalance', displayName: 'Check Balance', category: 'Capacity' },
    { name: 'refreshAllCapacity', displayName: 'Refresh All Capacity', category: 'Capacity' },
    { name: 'canExecuteTask', displayName: 'Can Execute Task', category: 'Capacity' },
    { name: 'waitForCapacity', displayName: 'Wait For Capacity', category: 'Capacity' },
  ],
})

// QueueProcessor 补充
serviceRegistry.register({
  serviceName: 'queueProcessor',
  instance: queueProcessor,
  methods: [
    // 现有 1 个
    { name: 'processImageQueueWithCapacity', displayName: 'Process Image Queue', category: 'Queue Processing' },
    // 新增 3 个
    { name: 'processQueue', displayName: 'Process Queue', category: 'Queue Processing' },
    { name: 'getQueueStats', displayName: 'Get Queue Stats', category: 'Queue Processing' },
    { name: 'retryFailedTasks', displayName: 'Retry Failed Tasks', category: 'Queue Processing' },
  ],
})

// mediaStorage 补充
serviceRegistry.register({
  serviceName: 'mediaStorage',
  instance: { saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile },
  methods: [
    // 现有 2 个
    { name: 'saveMediaFile', displayName: 'Save Media File', category: 'Media Storage' },
    { name: 'saveFromUrl', displayName: 'Save From URL', category: 'Media Storage' },
    // 新增 2 个
    { name: 'deleteMediaFile', displayName: 'Delete Media File', category: 'Media Storage' },
    { name: 'readMediaFile', displayName: 'Read Media File', category: 'Media Storage' },
  ],
})

// 新增：工具函数服务
import { toCSV } from './lib/csv-utils.js'
import { generateMediaToken, verifyMediaToken } from './lib/media-token.js'

serviceRegistry.register({
  serviceName: 'utils',
  instance: { toCSV, generateMediaToken, verifyMediaToken },
  methods: [
    { name: 'toCSV', displayName: 'Convert to CSV', category: 'Utils' },
    { name: 'generateMediaToken', displayName: 'Generate Media Token', category: 'Utils' },
    { name: 'verifyMediaToken', displayName: 'Verify Media Token', category: 'Utils' },
  ],
})
```

### 3.2 补充导入

在 `server/index.ts` 顶部补充导入：

```typescript
import { deleteMediaFile, readMediaFile } from './lib/media-storage.js'
import { toCSV } from './lib/csv-utils.js'
import { generateMediaToken, verifyMediaToken } from './lib/media-token.js'
```

---

## 四、优先级排序

建议按以下顺序分批注册，避免一次性改动过大：

### 第一批：核心 API 能力（高优先级）
1. MiniMaxClient 异步任务状态查询方法（workflow 轮询必需）
2. MiniMaxClient 文件管理方法
3. MiniMaxClient 音色管理方法

### 第二批：数据库操作（高优先级）
1. Task Queue 状态管理方法
2. Cron Jobs 基础 CRUD 方法
3. Execution Logs 记录方法

### 第三批：容量与队列（中优先级）
1. CapacityChecker 补充方法
2. QueueProcessor 补充方法

### 第四批：辅助工具（低优先级）
1. mediaStorage 补充方法
2. 独立工具函数（toCSV, mediaToken）

---

## 五、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 注册方法过多导致 registry 过大 | 轻微性能影响 | 分批注册，定期清理无用方法 |
| 数据库方法参数复杂 | workflow 配置难度增加 | 编写详细示例文档 |
| MiniMax API 调用增加 | API 配额压力增加 | 结合 capacityChecker 前置检查 |

---

## 六、后续行动

1. **立即执行**：第一批核心 API 能力注册（MiniMax 异步状态查询）
2. **同步编写**：验证方案文档和示例 workflow 配置文档
3. **渐进验证**：从 A（最小验证）→ B（完整验证）→ C（端到端验证）
4. **持续监控**：注册后观察 workflow 执行日志，确认调用正确