# 架构升级实施计划

> 版本: 1.0.0  
> 日期: 2026-04-05  
> 设计文档: [specs/2026-04-05-architecture-upgrade-design.md](./specs/2026-04-05-architecture-upgrade-design.md)

## 执行概述

本计划采用**渐进式重构**策略，确保每个阶段都可独立验证和回滚。使用git worktree隔离开发，每完成一个阶段提交一次。

## Wave 1: 基础设施准备 (并行)

### Task 1.1: 创建配置常量模块

**目标:** 消除硬编码魔法数字

**文件变更:**
```
server/config/
├── timeouts.ts      # 新建
├── rate-limits.ts   # 新建
└── limits.ts        # 新建
```

**实现:**
1. 从以下文件提取常量:
   - `server/services/task-executor.ts` (lines 29-30)
   - `server/services/cron-scheduler.ts` (line 55)
   - `server/services/queue-processor.ts` (line 44, 68)
   - `server/services/websocket-service.ts` (lines 140-142)
   - `server/services/capacity-checker.ts` (lines 24-31)
   - `server/lib/media-token.ts` (line 11)
   - `server/services/notification-service.ts` (lines 12-13)

2. 更新导入引用

**验证:** `npm run build` 无错误

---

### Task 1.2: 创建共享验证Schema

**目标:** 消除Zod schema重复

**文件变更:**
```
server/validation/
└── common.ts        # 新建
```

**实现:**
```typescript
// server/validation/common.ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const idParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
})

export const taskStatusEnum = z.enum([
  'pending', 'running', 'completed', 'failed', 'cancelled'
])

export const mediaTypeEnum = z.enum(['audio', 'image', 'video', 'music'])
```

**验证:** 更新现有schema文件引用新common模块

---

### Task 1.3: 消除JsonViewer重复

**目标:** 删除完全相同的重复组件

**文件变更:**
```
删除: src/components/cron/management/JsonViewer.tsx
更新: src/components/cron/management/index.tsx (导入路径)
```

**实现:**
1. 确认两个文件完全相同
2. 删除 `src/components/cron/management/JsonViewer.tsx`
3. 更新所有导入使用 `@/components/shared/JsonViewer`

**验证:** 前端构建通过

---

## Wave 2: 后端服务层拆分 (串行)

### Task 2.1: 定义领域服务接口

**目标:** 建立服务边界

**文件变更:**
```
server/services/domain/
├── interfaces.ts     # 新建 - 定义所有服务接口
└── index.ts          # 新建 - 导出
```

**实现:**
```typescript
// server/services/domain/interfaces.ts
export interface IJobService {
  getAll(ownerId?: string): Promise<CronJob[]>
  getById(id: string, ownerId?: string): Promise<CronJob | null>
  create(data: CreateCronJob, ownerId?: string): Promise<CronJob>
  update(id: string, data: UpdateCronJob, ownerId?: string): Promise<CronJob>
  delete(id: string, ownerId?: string): Promise<void>
  // ... 其他方法
}

export interface ITaskService {
  create(data: CreateTaskQueueItem): Promise<TaskQueueItem>
  update(id: string, data: UpdateTaskQueueItem): Promise<TaskQueueItem>
  getNextPending(): Promise<TaskQueueItem | null>
  // ...
}

export interface ILogService {
  // ...
}

export interface IMediaService {
  // ...
}

export interface IWorkflowService {
  // ...
}

export interface INotificationService {
  // ...
}
```

---

### Task 2.2: 提取JobService

**目标:** 从DatabaseService提取Cron任务相关方法

**文件变更:**
```
server/services/domain/
└── job.service.ts    # 新建
```

**提取方法 (从 service-async.ts):**
- `getAllCronJobs` → `JobService.getAll`
- `getCronJobById` → `JobService.getById`
- `createCronJob` → `JobService.create`
- `updateCronJob` → `JobService.update`
- `deleteCronJob` → `JobService.delete`
- `toggleCronJob` → `JobService.toggle`
- `getAllCronJobsWithTag` → `JobService.getByTag`
- `addJobTag` → `JobService.addTag`
- `removeJobTag` → `JobService.removeTag`
- `addJobDependency` → `JobService.addDependency`
- `removeJobDependency` → `JobService.removeDependency`

**验证:** 单元测试通过

---

### Task 2.3: 提取TaskService

**目标:** 从DatabaseService提取任务队列相关方法

**文件变更:**
```
server/services/domain/
└── task.service.ts   # 新建
```

**提取方法:**
- `createTask` → `TaskService.create`
- `updateTask` → `TaskService.update`
- `getTaskById` → `TaskService.getById`
- `getPendingTasks` → `TaskService.getPending`
- `getTasksByStatus` → `TaskService.getByStatus`
- `moveToDeadLetter` → `TaskService.moveToDeadLetter`
- `retryDeadLetter` → `TaskService.retryDeadLetter`

---

### Task 2.4: 提取LogService

**目标:** 从DatabaseService提取执行日志相关方法

**文件变更:**
```
server/services/domain/
└── log.service.ts    # 新建
```

**提取方法:**
- `getAllExecutionLogs` → `LogService.getAll`
- `getExecutionLogById` → `LogService.getById`
- `createExecutionLog` → `LogService.create`
- `createExecutionLogDetail` → `LogService.createDetail`
- `getExecutionLogDetails` → `LogService.getDetails`

---

### Task 2.5: 提取MediaService

**目标:** 从DatabaseService提取媒体记录相关方法

**文件变更:**
```
server/services/domain/
└── media.service.ts  # 新建
```

**提取方法:**
- `getMediaRecords` → `MediaService.getAll`
- `getMediaById` → `MediaService.getById`
- `createMediaRecord` → `MediaService.create`
- `updateMediaRecord` → `MediaService.update`
- `deleteMediaRecord` → `MediaService.delete`

---

### Task 2.6: 提取WorkflowService

**目标:** 从DatabaseService提取工作流相关方法

**文件变更:**
```
server/services/domain/
└── workflow.service.ts # 新建
```

---

### Task 2.7: 更新路由使用新服务

**目标:** 路由调用新服务而非DatabaseService

**文件变更:**
```
server/routes/cron/jobs.ts      # 更新导入
server/routes/cron/queue.ts     # 更新导入
server/routes/cron/logs.ts      # 更新导入
server/routes/media.ts          # 更新导入
server/routes/workflows.ts      # 更新导入
```

**验证:** `npm run test:server` 全部通过

---

## Wave 3: SOLID违规修复 (并行)

### Task 3.1: 修复NodeExecutor OCP违规

**目标:** 用策略模式替换switch语句

**文件变更:**
```
server/services/workflow/
├── node-executor.ts           # 重构
├── node-executor-registry.ts  # 新建
└── executors/
    ├── index.ts               # 更新导出
    └── ...                    # 现有executor保持
```

**实现:**
```typescript
// server/services/workflow/node-executor-registry.ts
import type { WorkflowNode, NodeExecutorDeps, NodeResult } from './types'

export interface NodeExecutorStrategy {
  type: string
  execute(node: WorkflowNode, deps: NodeExecutorDeps): Promise<NodeResult>
}

class NodeExecutorRegistry {
  private executors = new Map<string, NodeExecutorStrategy>()
  
  register(executor: NodeExecutorStrategy) {
    this.executors.set(executor.type, executor)
  }
  
  async execute(node: WorkflowNode, deps: NodeExecutorDeps): Promise<NodeResult> {
    const executor = this.executors.get(node.type)
    if (!executor) throw new Error(`Unknown node type: ${node.type}`)
    return executor.execute(node, deps)
  }
}

// 创建全局注册表实例
export const nodeExecutorRegistry = new NodeExecutorRegistry()

// 自动注册所有executors
import { actionExecutor } from './executors/action-executor'
import { conditionExecutor } from './executors/condition-executor'
// ... 其他executors

nodeExecutorRegistry.register(actionExecutor)
nodeExecutorRegistry.register(conditionExecutor)
// ...
```

**验证:** 工作流测试通过

---

### Task 3.2: 修复MediaStorage OCP违规

**目标:** 用配置映射替换switch语句

**文件变更:**
```
server/lib/media-storage.ts    # 重构
```

**实现:**
```typescript
// 替换switch为配置对象
const DEFAULT_EXTENSIONS: Record<MediaType, string> = {
  audio: '.wav',
  image: '.png',
  video: '.mp4',
  music: '.mp3',
}

function getDefaultExtension(type: MediaType): string {
  return DEFAULT_EXTENSIONS[type] ?? '.bin'
}
```

---

### Task 3.3: 提取WorkflowPermissionChecker

**目标:** 消除workflows.ts中3处重复的权限检查逻辑

**文件变更:**
```
server/middleware/
└── workflow-permissions.ts    # 新建
server/routes/workflows.ts     # 更新使用
```

**实现:**
```typescript
// server/middleware/workflow-permissions.ts
import { Request, Response, NextFunction } from 'express'
import { getDatabase } from '../database/service-async.js'
import { ROLE_HIERARCHY } from './auth.js'

export async function checkWorkflowPermissions(
  req: Request,
  actionNodes: any[],
  userRole: string
): Promise<{ allowed: boolean; deniedNode?: string }> {
  const db = await getDatabase()
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0
  
  for (const node of actionNodes) {
    const config = node.data?.config || {}
    const { service, method } = config
    const permission = await db.getServiceNodePermission(service, method)
    
    if (!permission || !permission.is_enabled) {
      return { allowed: false, deniedNode: `${service}.${method}` }
    }
    
    const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
    if (nodeLevel > userLevel) {
      return { allowed: false, deniedNode: `${service}.${method}` }
    }
  }
  
  return { allowed: true }
}
```

---

### Task 3.4: 修复CronJobsStore WebSocket OCP违规

**目标:** 用事件注册表替换switch语句

**文件变更:**
```
src/stores/cronJobs.ts         # 重构
src/stores/utils/
└── event-handler-registry.ts  # 新建
```

---

## Wave 4: 前端大文件拆分 (串行)

### Task 4.1: 拆分MediaManagement.tsx

**目标:** 1188行 → ~250行

**文件变更:**
```
src/pages/MediaManagement/
├── index.tsx                  # 主页面 (~150行)
├── hooks/
│   ├── useMediaList.ts        # 列表逻辑
│   ├── useMediaFilters.ts     # 筛选逻辑
│   └── useMediaActions.ts     # 操作逻辑
├── components/
│   ├── MediaGrid.tsx          # 网格视图
│   ├── MediaList.tsx          # 列表视图
│   ├── MediaFilters.tsx       # 筛选器
│   ├── MediaPreview.tsx       # 预览
│   └── MediaCard.tsx          # 卡片
└── types.ts                   # 类型定义
```

**实现步骤:**
1. 创建目录结构
2. 提取types.ts
3. 提取hooks
4. 提取components
5. 重构index.tsx为组合层

**验证:** 页面功能正常

---

### Task 4.2: 拆分WorkflowBuilder.tsx

**目标:** 1139行 → ~200行

**文件变更:**
```
src/pages/WorkflowBuilder/
├── index.tsx                  # 主页面
├── hooks/
│   ├── useWorkflowEditor.ts
│   ├── useNodeSelection.ts
│   └── useCanvasState.ts
├── components/
│   ├── Canvas.tsx
│   ├── NodePanel.tsx
│   ├── ConfigPanel.tsx
│   ├── Toolbar.tsx
│   └── MiniMap.tsx
└── types.ts
```

---

### Task 4.3: 拆分VoiceAsync.tsx

**目标:** 974行 → ~200行

**文件变更:**
```
src/pages/VoiceAsync/
├── index.tsx
├── hooks/
│   └── useVoiceAsync.ts
├── components/
│   ├── VoiceForm.tsx
│   ├── VoiceResult.tsx
│   └── TaskStatus.tsx
└── types.ts
```

---

### Task 4.4: 创建API基类

**目标:** 消除API调用模式重复

**文件变更:**
```
src/lib/api/
└── base-client.ts             # 新建
```

**实现:**
```typescript
// src/lib/api/base-client.ts
export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  timeout?: number
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = { method: 'GET' }
): Promise<T> {
  const { getBaseUrl, getHeaders } = await import('./client')
  
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: options.method,
    headers: getHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      error.base_resp?.status_msg || 'Request failed',
      error.base_resp?.status_code
    )
  }
  
  return response.json()
}

// 使用示例
export const textApi = {
  generate: (request: TextRequest) => 
    apiRequest<TextResult>('/v1/text/generate', { 
      method: 'POST', 
      body: request 
    }),
}
```

---

## Wave 5: 依赖注入容器 (可选)

### Task 5.1: 安装和配置InversifyJS

**目标:** 建立DI容器

**文件变更:**
```
package.json                   # 添加 inversify 依赖
server/container/
├── types.ts                   # 服务标识符
├── modules/
│   ├── repositories.ts        # Repository绑定
│   └── services.ts            # Service绑定
└── index.ts                   # 容器初始化
```

**实现:**
```typescript
// server/container/types.ts
export const TYPES = {
  // Repositories
  JobRepository: Symbol.for('JobRepository'),
  TaskRepository: Symbol.for('TaskRepository'),
  LogRepository: Symbol.for('LogRepository'),
  
  // Services
  JobService: Symbol.for('JobService'),
  TaskService: Symbol.for('TaskService'),
  WorkflowEngine: Symbol.for('WorkflowEngine'),
  CronScheduler: Symbol.for('CronScheduler'),
  
  // Infrastructure
  Database: Symbol.for('Database'),
  Logger: Symbol.for('Logger'),
} as const
```

---

## Wave 6: 验证与清理

### Task 6.1: 运行全量测试

```bash
npm run test
npm run test:server
npm run build
```

### Task 6.2: 删除废弃代码

- 移除 `DatabaseService` 中已迁移的方法（保留过渡期兼容层）
- 清理未使用的导入

### Task 6.3: 更新文档

- 更新 AGENTS.md
- 更新 README.md

---

## 执行时间线

| Wave | 任务数 | 预计时间 | 依赖 |
|------|--------|---------|------|
| Wave 1 | 3 | 1小时 | 无 |
| Wave 2 | 7 | 4小时 | Wave 1 |
| Wave 3 | 4 | 2小时 | Wave 2 (部分并行) |
| Wave 4 | 4 | 3小时 | 无 (可并行) |
| Wave 5 | 1 | 2小时 | Wave 2 |
| Wave 6 | 3 | 1小时 | Wave 1-5 |

**总预计时间:** ~13小时

## 提交策略

每个Wave完成后创建一个提交:

```
git add .
git commit -m "refactor(architecture): wave 1 - infrastructure preparation

- Create config modules for timeouts, rate-limits, limits
- Create shared validation schemas
- Remove duplicate JsonViewer component

Refs: docs/specs/2026-04-05-architecture-upgrade-design.md"
```

## 回滚计划

每个Wave开始前创建备份分支:

```bash
git checkout -b backup/wave-N-$(date +%Y%m%d)
git checkout main
```