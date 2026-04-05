# AGENTS.md - MiniMax AI Toolset

> 本文档为 AI 助手提供项目上下文，帮助理解架构、编码规范和开发流程。

## 设计与计划文档

项目使用 `docs/superpowers/` 存储设计和计划文档：

| 目录 | 用途 | 说明 |
|------|------|------|
| `specs/` | 规格文档 | 定义"是什么"，永不归档 |
| `plans/` | 实现计划 | 定义"怎么做"，完成后归档 |
| `archive/` | 归档 | 已有版本 plans 的归档 |

**命名规范**：
- `specs/`: `YYYY-MM-DD-主题-design.md` 或 `主题.md`
- `plans/`: `YYYY-MM-DD-主题.md`
- 子计划: `YYYY-MM-DD-NN-主题.md`（NN 为序号）

**何时创建/引用**：
- 开发新功能前 → 查阅 `specs/` 理解设计
- 制定实现方案时 → 在 `plans/` 创建计划
- 实施前 → 引用相关 specs/plans 作为依据

**引用路径格式**：
```
@docs/superpowers/specs/workflow-core-concepts.md
@docs/superpowers/plans/2026-04-03-workflow-system-redesign.md
```

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

## 认证系统

### 角色权限

| 角色 | 调试台 | 管理功能 | 查看他人数据 | 用户管理 | 邀请码管理 |
|------|--------|----------|-------------|----------|-----------|
| user | ✅ | ❌ | ❌ | ❌ | ❌ |
| pro | ✅ | ✅ | ❌ | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ | ❌ | ❌ |
| super | ✅ | ✅ | ✅ | ✅ | ✅ |

### 数据隔离

所有数据资源（cron jobs, media records, workflows, templates）都通过 `owner_id` 进行隔离：
- 普通用户（user/pro）只能访问自己创建的资源
- 管理员（admin/super）可以访问所有资源

### API 认证

所有 `/api/*` 路由需要 JWT Bearer token（`/api/auth` 除外）：

```typescript
// 请求头
Authorization: Bearer <access_token>

// 数据隔离中间件
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'

// 查询时过滤
const ownerId = buildOwnerFilter(req).params[0]
const jobs = await db.getAllCronJobs(ownerId)

// 创建时注入
const ownerId = getOwnerIdForInsert(req) ?? undefined
const job = await db.createCronJob(data, ownerId)
```

### 审计日志

审计日志自动记录所有 POST/PUT/PATCH/DELETE 操作：
- `user_id` 从 JWT token 自动提取
- 非管理员用户只能查看自己的审计日志

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

## 开发 CLI 工具

项目提供 `mnx-dev` CLI 工具，用于管理开发服务器：

```bash
# 启动开发服务器（后台运行）
node scripts/dev.js start

# 查看状态
node scripts/dev.js status

# 查看日志（实时）
node scripts/dev.js log

# 停止服务器
node scripts/dev.js stop

# 重启服务器
node scripts/dev.js restart
```

**与 `npm run dev:full` 的区别**：
- `dev:full`: 前台运行，Ctrl+C 停止
- `dev.js`: 后台运行，支持 start/stop/status/log 命令

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

## 发布流程

### 版本号规范
- **MAJOR.MINOR.PATCH** (如 v1.0.2)
- MAJOR: 不兼容的 API 变更
- MINOR: 向后兼容的功能新增
- PATCH: 向后兼容的问题修复

### 发布步骤

1. **更新 CHANGELOG.md**
   - 添加 `[版本号] - 日期` 标题
   - 按 `### Added`, `### Fixed`, `### Changed`, `### Performance` 组织
   - 引用相关 commit: `(#pr)`

2. **更新 package.json**
   ```bash
   npm version 1.0.2 --no-git-tag-version
   ```

3. **提交 Release**
   ```bash
   git add CHANGELOG.md package.json package-lock.json
   git commit -m "chore: release v1.0.2"
   git tag -a v1.0.2 -m "v1.0.2: 版本说明"
   git push && git push --tags
   ```

### 发布检查清单
- [ ] CHANGELOG.md 更新完整
- [ ] `npm run build` 通过
- [ ] `vitest run` 全部通过
- [ ] TypeScript 无错误
- [ ] push 后确认 tag 存在

## 常见问题

### Q: 媒体文件未显示？

检查数据库是否有 `media_records` 表：
```bash
psql -h localhost -U mnx_agent_server -d mnx_agent -c "\dt"
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