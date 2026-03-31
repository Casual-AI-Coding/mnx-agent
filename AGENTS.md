# AGENTS.md - MiniMax AI Toolset

> 本文档为 AI 助手提供项目上下文，帮助理解架构、编码规范和开发流程。

## 项目概述

MiniMax AI API 工具集，提供文本、语音、图像、音乐、视频生成能力，并内置 cron 定时任务调度系统。

**技术栈：**
- 后端: Express + TypeScript + better-sqlite3 + node-cron + WebSocket
- 前端: React 18 + TypeScript + Tailwind CSS + Zustand + React Router

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages                    │  Stores (Zustand)                │
│  - TextGeneration         │  - app (全局状态)                 │
│  - VoiceSync/Async        │  - cronJobs, taskQueue          │
│  - ImageGeneration        │  - executionLogs, capacity      │
│  - VideoGeneration        │  - workflow                      │
│  - MediaManagement        │                                  │
│  - CronManagement         │                                  │
│  - WorkflowBuilder        │                                  │
├─────────────────────────────────────────────────────────────┤
│  API Layer (src/lib/api/)                                    │
│  - client.ts (axios instance with interceptors)              │
│  - text.ts, voice.ts, image.ts, video.ts, music.ts          │
│  - cron.ts, media.ts                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                     Backend (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  Routes (server/routes/)                                     │
│  - text, voice, image, music, video, video-agent            │
│  - voice-mgmt, files, usage, capacity                        │
│  - cron (jobs, queue, logs, webhooks, templates)            │
│  - media (CRUD, upload, download)                            │
├─────────────────────────────────────────────────────────────┤
│  Services (server/services/)                                 │
│  - CronScheduler: node-cron 定时调度                          │
│  - WorkflowEngine: DAG 工作流执行                              │
│  - TaskExecutor: MiniMax API 调用                             │
│  - QueueProcessor: 队列处理 + 重试                             │
│  - CapacityChecker: API 配额检查                              │
│  - WebSocketService: 实时推送                                 │
│  - NotificationService: Webhook 通知                          │
├─────────────────────────────────────────────────────────────┤
│  Database (server/database/)                                 │
│  - schema.ts: 表结构定义                                       │
│  - migrations.ts: 迁移脚本                                     │
│  - service.ts: CRUD 方法                                      │
│  - types.ts: TypeScript 类型                                  │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                               │
│  - MiniMaxClient (server/lib/minimax.ts)                     │
│  - 国内/国际区域切换                                            │
│  - Mock 客户端 (无 API Key 时)                                  │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. CronScheduler (`server/services/cron-scheduler.ts`)

```typescript
class CronScheduler {
  scheduleJob(job: CronJob): void      // 调度任务
  unscheduleJob(jobId: string): void   // 取消调度
  stopAll(): void                       // 停止所有
}
```

**并发控制：** 默认最多 5 个任务同时运行

### 2. WorkflowEngine (`server/services/workflow-engine.ts`)

```typescript
class WorkflowEngine {
  executeWorkflow(workflow: Workflow): Promise<ExecutionResult>
  topologicalSort(nodes: Node[], edges: Edge[]): Node[]
  resolveTemplate(template: string, context: Context): unknown
}
```

**节点类型：**
- `action` - API 调用 (text/voice/image/music/video)
- `condition` - 条件判断
- `transform` - 数据转换
- `loop` - 循环执行
- `queue` - 队列处理

### 3. TaskExecutor (`server/services/task-executor.ts`)

```typescript
class TaskExecutor {
  executeSync(task: Task): Promise<Result>   // 同步执行
  executeAsync(task: Task): Promise<Result>  // 异步轮询
}
```

**超时配置：**
- 同步任务: 5 分钟
- 异步任务: 10 分钟

### 4. QueueProcessor (`server/services/queue-processor.ts`)

```typescript
class QueueProcessor {
  processQueue(): Promise<void>
  calculateBackoffDelay(retryCount: number): number
  moveToDeadLetter(task: Task): void
}
```

**重试策略：** 指数退避 (1s → 2s → 4s → ...)，最大 5 分钟

## 编码规范

### TypeScript

```typescript
// 严格模式
strict: true

// 路径别名
"@/*": ["./src/*"]

// 命名约定
interface MediaRecord {}    // 接口: PascalCase
type MediaType = 'audio'    // 类型: PascalCase
function getMediaById() {}  // 函数: camelCase
const MEDIA_ROOT = './data' // 常量: SCREAMING_SNAKE_CASE
```

### 错误处理

```typescript
// API 响应格式
{ success: true, data: {...} }
{ success: false, error: "错误信息" }

// 错误码映射 (server/lib/minimax.ts)
1002 → 429 Rate Limit
1008 → 402 Payment Required

// 使用 asyncHandler 包装路由
router.get('/', asyncHandler(async (req, res) => {
  // 自动捕获异常
}))
```

### 验证 (Zod)

```typescript
// server/validation/*.ts
import { z } from 'zod'

export const listMediaQuerySchema = z.object({
  type: z.enum(['audio', 'image', 'video', 'music']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// 路由中使用
router.get('/', validateQuery(listMediaQuerySchema), handler)
```

### React 组件

```typescript
// 使用 CVA (class-variance-authority) 处理变体
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "bg-primary",
      outline: "border border-input",
    },
  },
})

// 使用 cn() 合并类名
import { cn } from '@/lib/utils'
<div className={cn("base", condition && "conditional")} />
```

### 状态管理 (Zustand)

```typescript
// src/stores/*.ts
interface AppState {
  apiKey: string
  region: 'domestic' | 'international'
  setApiKey: (key: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      region: 'domestic',
      setApiKey: (key) => set({ apiKey: key }),
    }),
    { name: 'app-store' }
  )
)
```

## 数据库

### 表结构

| 表名 | 用途 |
|------|------|
| `cron_jobs` | 定时任务定义 |
| `task_queue` | 任务队列 |
| `execution_logs` | 执行日志 |
| `execution_log_details` | 详细执行记录 |
| `job_tags` | 任务标签 |
| `job_dependencies` | 任务依赖 |
| `webhook_configs` | Webhook 配置 |
| `webhook_deliveries` | Webhook 投递记录 |
| `dead_letter_queue` | 死信队列 |
| `capacity_tracking` | API 容量追踪 |
| `workflow_templates` | 工作流模板 |
| `media_records` | 媒体文件记录 |

### 迁移

```typescript
// server/database/migrations.ts
const MIGRATIONS: Migration[] = [
  { id: 1, name: 'migration_001_initial_schema', sql: SCHEMA_SQL },
  { id: 2, name: 'migration_002_add_indexes', sql: '...' },
  // ...
]

// 自动执行未运行的迁移
runMigrations(db)
```

## API 端点

### 媒体管理 (`/api/media`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 列表 (分页、筛选) |
| GET | `/:id` | 获取单条 |
| POST | `/` | 创建记录 |
| POST | `/upload` | 上传文件 |
| POST | `/upload-from-url` | 从 URL 上传 |
| GET | `/:id/download` | 下载文件 |
| PUT | `/:id` | 更新 |
| DELETE | `/:id` | 软删除 |

### Cron 管理 (`/api/cron`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET/POST | `/jobs` | 任务列表/创建 |
| PATCH | `/jobs/:id` | 更新任务 |
| DELETE | `/jobs/:id` | 删除任务 |
| POST | `/jobs/:id/toggle` | 启用/禁用 |
| POST | `/jobs/:id/run` | 手动执行 |
| GET/POST | `/queue` | 队列管理 |
| GET | `/logs` | 执行日志 |
| GET/POST | `/webhooks` | Webhook 管理 |

## 文件存储

媒体文件保存在 `data/media/` 目录，使用日期分片：

```
data/media/
└── 2026/
    └── 03/
        └── 31/
            ├── 550e8400-e29b-41d4-a716-446655440000.png
            └── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.mp3
```

## 测试

```bash
# 运行所有测试
vitest run

# 运行特定文件
vitest run server/services/workflow-engine.test.ts

# 测试覆盖率
vitest run --coverage
```

**测试文件位置：**
- 后端: `server/**/*.test.ts`
- 前端: `src/**/*.test.{ts,tsx}`

## 开发流程

1. **创建功能分支** (使用 worktree)
   ```bash
   git worktree add .worktrees/feature-name -b feature/name
   cd .worktrees/feature-name
   ```

2. **TDD 开发**
   - 先写测试
   - 实现功能
   - 确保测试通过

3. **提交规范**
   ```
   feat(scope): 简短描述
   fix(scope): 简短描述
   refactor(scope): 简短描述
   test(scope): 简短描述
   ```

4. **合并前检查**
   - `npm run build` 通过
   - `vitest run` 通过
   - TypeScript 无错误

## 常见问题

### Q: 媒体文件未显示？

检查数据库是否有 `media_records` 表：
```bash
sqlite3 data/minimax.db ".tables"
```

如果没有，运行迁移：重启服务器会自动执行。

### Q: API 返回 "请求次数过多"？

内部服务 (`/api/media`, `/api/files`, `/api/cron`) 已跳过限流。
外部 MiniMax API 有限流，等待 15 分钟后重试。

### Q: 图片上传 CORS 错误？

使用 `/api/media/upload-from-url` 端点，后端代理下载。

### Q: 测试失败？

检查 mock 是否正确：
```typescript
jest.mock('@/lib/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() }
}))
```