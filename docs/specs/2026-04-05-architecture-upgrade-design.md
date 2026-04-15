# 架构升级设计方案

> 版本: 1.0.0  
> 日期: 2026-04-05  
> 状态: 设计阶段

## 1. 问题诊断

### 1.1 当前架构问题概览

经过全面的架构审计，识别出以下核心问题：

| 问题类型 | 严重程度 | 影响范围 |
|---------|---------|---------|
| God Object (DatabaseService 862行) | 🔴 严重 | 后端所有路由 |
| 单例模式滥用 | 🔴 严重 | 服务层全局状态 |
| 千行大文件 | 🟠 高 | MediaManagement.tsx (1188行), WorkflowBuilder.tsx (1139行) |
| 代码重复 | 🟠 高 | JsonViewer完全重复, API调用模式重复5次 |
| SOLID违规 | 🟠 高 | 20+处违规 |
| 硬编码常量 | 🟡 中 | 20+个魔法数字散落各处 |
| 依赖耦合 | 🟡 中 | 路由直接调用数据库 |

### 1.2 SOLID违规详情

#### SRP (单一职责) 违规

| 文件 | 行数 | 问题 |
|-----|------|-----|
| `server/database/service-async.ts` | 862 | 80+方法，混合所有领域逻辑 |
| `server/services/cron-scheduler.ts` | 463 | 调度+执行+通知+错过处理 |
| `src/stores/cronJobs.ts` | 385 | 状态+API+WebSocket+转换 |
| `server/services/queue-processor.ts` | 496 | 队列+执行+重试+死信+容量检查 |

#### OCP (开放封闭) 违规

| 文件 | 行号 | 问题 |
|-----|------|-----|
| `server/services/workflow/node-executor.ts` | 50-103 | switch语句路由节点类型 |
| `server/lib/media-storage.ts` | 56-63 | switch映射媒体类型 |
| `src/stores/cronJobs.ts` | 319-372 | switch处理WebSocket事件 |

#### DIP (依赖倒置) 违规

| 文件 | 行号 | 问题 |
|-----|------|-----|
| `server/routes/cron/jobs.ts` | 5, 27 | 直接调用 `getDatabase()` |
| `server/routes/cron/jobs.ts` | 36, 122, 142... | 每次请求新建 `WorkflowEngine` |

### 1.3 代码重复详情

| 重复类型 | 重复次数 | 位置 |
|---------|---------|-----|
| JsonViewer组件 | 2份完全相同 | `src/components/shared/`, `src/components/cron/management/` |
| API调用模式 | 5份 | `src/lib/api/text.ts`, `voice.ts`, `image.ts`, `video.ts`, `music.ts` |
| 权限检查逻辑 | 3份 | `server/routes/workflows.ts` (110-143, 176-211, 236-265) |
| 错误处理catch块 | 40+ | 所有Zustand stores |
| Zod分页schema | 10+ | 所有validation文件 |

### 1.4 大文件清单

**后端 (>400行):**
- `server/database/service-async.ts` - 862行 ⚠️
- `server/database/migrations-async.ts` - 542行
- `server/services/queue-processor.ts` - 496行
- `server/services/cron-scheduler.ts` - 463行
- `server/repositories/task-repository.ts` - 443行
- `server/repositories/log-repository.ts` - 440行

**前端 (>600行):**
- `src/pages/MediaManagement.tsx` - 1188行 ⚠️
- `src/pages/WorkflowBuilder.tsx` - 1139行 ⚠️
- `src/data/workflow-templates.ts` - 980行
- `src/pages/VoiceAsync.tsx` - 974行
- `src/pages/VoiceSync.tsx` - 721行
- `src/pages/ImageGeneration.tsx` - 645行

## 2. 架构升级目标

### 2.1 设计原则

1. **高内聚低耦合** - 模块边界清晰，依赖单向
2. **SOLID原则** - 消除所有已识别违规
3. **代码复用** - DRY原则，消除重复
4. **可测试性** - 依赖注入，接口抽象
5. **可扩展性** - 策略模式，注册表模式

### 2.2 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages (精简，<300行)                                           │
│    └── 调用 Hooks (业务逻辑)                                     │
│           └── 调用 API Client (封装请求)                         │
├─────────────────────────────────────────────────────────────────┤
│  Stores (Zustand Slices)                                        │
│    └── 纯状态管理，无API调用                                      │
├─────────────────────────────────────────────────────────────────┤
│  Shared Components (无重复)                                      │
│    └── JsonViewer (单例)                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Backend (Express)                       │
├─────────────────────────────────────────────────────────────────┤
│  Routes (薄层，<100行)                                           │
│    └── 调用 Services (业务逻辑)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Services (领域服务，<300行)                                     │
│    ├── JobService                                               │
│    ├── TaskService                                              │
│    ├── WorkflowService                                          │
│    └── NotificationService                                      │
├─────────────────────────────────────────────────────────────────┤
│  Repositories (数据访问，<200行)                                 │
│    ├── JobRepository implements IJobRepository                  │
│    ├── TaskRepository implements ITaskRepository                │
│    └── LogRepository implements ILogRepository                  │
├─────────────────────────────────────────────────────────────────┤
│  DI Container (InversifyJS)                                     │
│    └── 管理服务生命周期                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 3. 重构策略

### 3.1 后端重构

#### Phase 3.1: 拆分 DatabaseService God Object

**当前问题:** `DatabaseService` 862行，80+方法，违反SRP

**解决方案:** 按领域拆分为独立服务

```
DatabaseService (862行)
├── 提取 → JobService (Cron任务生命周期)
├── 提取 → TaskService (任务队列操作)  
├── 提取 → LogService (执行日志)
├── 提取 → MediaService (媒体记录管理)
├── 提取 → WorkflowService (工作流模板)
├── 提取 → NotificationService (Webhook投递)
├── 提取 → CapacityService (容量追踪)
└── 提取 → AuditService (审计日志)
```

**实现步骤:**
1. 创建 `server/services/domain/` 目录
2. 定义领域接口 (`IJobService`, `ITaskService`...)
3. 从 `DatabaseService` 提取方法到新服务
4. 更新路由使用新服务
5. 保留 `DatabaseService` 作为过渡期的Facade

#### Phase 3.2: 引入依赖注入容器

**工具选择:** InversifyJS 8.x (ESM原生支持)

**实现步骤:**
1. 安装 `inversify` 和 `reflect-metadata`
2. 创建 `server/container/` 目录
3. 定义服务标识符 (`TYPES`)
4. 配置绑定模块
5. 在入口点初始化容器

```typescript
// server/container/types.ts
export const TYPES = {
  // Repositories
  JobRepository: Symbol.for('JobRepository'),
  TaskRepository: Symbol.for('TaskRepository'),
  
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

#### Phase 3.3: 修复SOLID违规

| 违规类型 | 文件 | 解决方案 |
|---------|-----|---------|
| OCP | `node-executor.ts` | 策略模式 + 注册表 |
| OCP | `media-storage.ts` | 配置映射表 |
| SRP | `cron-scheduler.ts` | 提取 MisfireHandler, NotificationTrigger |
| SRP | `queue-processor.ts` | 提取 ImageQueueStrategy |
| DIP | 路由层 | 服务层抽象 |

### 3.2 前端重构

#### Phase 5.1: 拆分大页面组件

**MediaManagement.tsx (1188行 → ~250行):**

```
MediaManagement.tsx (主页面，组合逻辑)
├── 提取 → hooks/useMediaList.ts (列表逻辑)
├── 提取 → hooks/useMediaFilters.ts (筛选逻辑)
├── 提取 → hooks/useMediaActions.ts (操作逻辑)
├── 提取 → components/MediaGrid.tsx (网格视图)
├── 提取 → components/MediaList.tsx (列表视图)
├── 提取 → components/MediaFilters.tsx (筛选器)
└── 提取 → components/MediaPreview.tsx (预览)
```

**WorkflowBuilder.tsx (1139行 → ~200行):**
```
WorkflowBuilder.tsx (主页面)
├── 提取 → hooks/useWorkflowEditor.ts
├── 提取 → components/Canvas.tsx
├── 提取 → components/NodePanel.tsx
├── 提取 → components/ConfigPanel.tsx
└── 提取 → components/Toolbar.tsx
```

#### Phase 5.2: 消除代码重复

| 重复项 | 解决方案 |
|-------|---------|
| JsonViewer组件 | 删除 `cron/management/JsonViewer.tsx`，统一使用 `shared/JsonViewer.tsx` |
| API调用模式 | 创建 `lib/api/base-client.ts` 封装通用逻辑 |
| 权限检查逻辑 | 创建 `middleware/check-workflow-permissions.ts` |
| 错误处理 | 创建 `stores/utils/create-store-with-error-handling.ts` |
| Zod分页schema | 创建 `validation/common.ts` 导出共享schema |

#### Phase 5.3: Zustand Store优化

**当前问题:** Store混合状态管理、API调用、WebSocket订阅

**解决方案:** 分层架构

```typescript
// 纯状态层 (store)
const useCronJobsStore = create<CronJobsState>((set) => ({
  jobs: [],
  loading: false,
  error: null,
  setJobs: (jobs) => set({ jobs }),
  setLoading: (loading) => set({ loading }),
}))

// 业务逻辑层 (hooks)
export function useCronJobs() {
  const { jobs, loading, setJobs, setLoading } = useCronJobsStore()
  
  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await cronApi.list()
      setJobs(response.data)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return { jobs, loading, fetchJobs }
}

// WebSocket层 (独立hook)
export function useCronJobsWebSocket() {
  const setJobs = useCronJobsStore((s) => s.setJobs)
  // WebSocket逻辑
}
```

### 3.3 常量集中化

**创建配置模块:**

```typescript
// server/config/timeouts.ts
export const TIMEOUTS = {
  SYNC_TASK_MS: 5 * 60 * 1000,        // 5分钟
  ASYNC_TASK_MS: 10 * 60 * 1000,      // 10分钟
  WORKFLOW_NODE_MS: 5 * 60 * 1000,    // 5分钟
  DEFAULT_CRON_MS: 5 * 60 * 1000,     // 5分钟
  HEARTBEAT_INTERVAL_MS: 30000,       // 30秒
  HEARTBEAT_TIMEOUT_MS: 10000,        // 10秒
  WEBHOOK_TIMEOUT_MS: 10000,          // 10秒
} as const

// server/config/rate-limits.ts
export const RATE_LIMITS = {
  TEXT_RPM: 500,
  VOICE_SYNC_RPM: 60,
  VOICE_ASYNC_RPM: 60,
  IMAGE_RPM: 10,
  MUSIC_RPM: 10,
  VIDEO_RPM: 5,
  WEBHOOK_PER_MINUTE: 100,
} as const

// server/config/limits.ts
export const LIMITS = {
  MAX_WS_CONNECTIONS: 1000,
  MAX_RETRY_DELAY_MS: 5 * 60 * 1000,
  BCRYPT_ROUNDS: 12,
  MAX_BATCH_SIZE: 100,
} as const
```

## 4. 文件结构变更

### 4.1 后端新目录结构

```
server/
├── config/                    # 新增：配置常量
│   ├── timeouts.ts
│   ├── rate-limits.ts
│   └── limits.ts
├── container/                 # 新增：DI容器
│   ├── types.ts              # 服务标识符
│   ├── modules/              # 绑定模块
│   │   ├── repositories.ts
│   │   └── services.ts
│   └── index.ts              # 容器初始化
├── services/
│   ├── domain/               # 新增：领域服务
│   │   ├── job.service.ts
│   │   ├── task.service.ts
│   │   ├── log.service.ts
│   │   ├── media.service.ts
│   │   ├── workflow.service.ts
│   │   └── notification.service.ts
│   ├── strategies/           # 新增：策略模式实现
│   │   ├── node-executor-registry.ts
│   │   └── media-extension-registry.ts
│   ├── workflow/
│   ├── cron-scheduler.ts     # 精简后
│   └── queue-processor.ts    # 精简后
├── repositories/             # 已存在，保持
├── routes/                   # 薄层路由
├── middleware/
│   ├── workflow-permissions.ts  # 新增：权限检查中间件
│   └── ...
└── validation/
    ├── common.ts             # 新增：共享schema
    └── ...
```

### 4.2 前端新目录结构

```
src/
├── pages/
│   ├── MediaManagement/
│   │   ├── index.tsx         # 主页面
│   │   ├── hooks/
│   │   │   ├── useMediaList.ts
│   │   │   ├── useMediaFilters.ts
│   │   │   └── useMediaActions.ts
│   │   └── components/
│   │       ├── MediaGrid.tsx
│   │       ├── MediaList.tsx
│   │       └── MediaFilters.tsx
│   ├── WorkflowBuilder/
│   │   ├── index.tsx
│   │   ├── hooks/
│   │   └── components/
│   └── ...
├── stores/
│   ├── slices/               # Zustand切片
│   └── utils/
│       └── create-store-with-error-handling.ts  # 新增
├── lib/api/
│   ├── base-client.ts        # 新增：API基类
│   └── ...
├── components/
│   └── shared/
│       └── JsonViewer.tsx    # 唯一副本
└── config/                   # 新增：前端常量
    └── constants.ts
```

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|-----|---------|
| 重构期间服务中断 | 高 | 使用git worktree隔离，分阶段发布 |
| 测试覆盖不足 | 中 | 重构前先补充关键测试 |
| 依赖注入性能开销 | 低 | InversifyJS 8.x已优化，使用单例模式 |
| 学习曲线 | 中 | 编写详细文档和示例 |

## 6. 验收标准

### 6.1 代码质量指标

| 指标 | 当前 | 目标 |
|-----|-----|-----|
| 单文件最大行数 | 1188 | <400 |
| DatabaseService行数 | 862 | <200 (仅协调) |
| 代码重复率 | ~15% | <5% |
| SOLID违规数 | 20+ | 0 |
| 硬编码常量 | 20+ | 0 |

### 6.2 功能验证

- [ ] 所有现有测试通过
- [ ] 构建无错误
- [ ] API端点功能正常
- [ ] WebSocket连接正常
- [ ] 定时任务调度正常

## 7. 参考资料

- [InversifyJS 8.x 文档](https://inversify.io/)
- [SOLID原则实践指南](https://inversify.io/)
- [Zustand Slices模式](https://levelup.gitconnected.com/advanced-zustand-4-slices-pattern-scalable-store-architecture-b07301035eca)
- [Express TypeScript最佳实践](https://github.com/Liergab/Express-Typescript-Service-Repository-Pattern)