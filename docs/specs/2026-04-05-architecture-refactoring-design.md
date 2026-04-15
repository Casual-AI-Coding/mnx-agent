# MiniMax AI Toolset 架构重构设计方案

> 版本: 1.0.0
> 日期: 2026-04-05
> 作者: P8架构师

## 一、现状分析总结

### 1.1 核心问题清单

| 类别 | 问题 | 严重程度 | 位置 |
|------|------|----------|------|
| **后端千行文件** | service-async.ts 2668行 | 🔴 P0 | server/database/ |
| **后端千行文件** | workflow-engine.ts 1229行 | 🔴 P0 | server/services/ |
| **后端千行文件** | routes/cron.ts 929行 | 🔴 P0 | server/routes/ |
| **前端千行文件** | WorkflowBuilder.tsx 2080行 | 🔴 P0 | src/pages/ |
| **前端千行文件** | CronManagement.tsx 1314行 | 🔴 P0 | src/pages/ |
| **服务定位器反模式** | getXxxService() 单例 | 🔴 P0 | server/services/ |
| **类型重复定义** | 前后端各自定义相同类型 | 🔴 P0 | types.ts vs src/types/ |
| **Store职责过重** | API+WebSocket+状态混在一起 | 🟡 P1 | src/stores/ |
| **API客户端不统一** | fetch vs axios 混用 | 🟡 P1 | src/lib/api/ |
| **重复错误处理** | timeout/backoff/log 三处重复 | 🟡 P1 | server/services/ |
| **硬编码配置** | URL/端口/Magic Numbers | 🟡 P1 | 多处 |

### 1.2 架构现状图

```
当前架构问题：
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Pages (30个, 多个千行文件)                                  │
│  Stores (职责混乱: API+WebSocket+State)                     │
│  API (fetch/axios混用, 无统一错误处理)                       │
│  Types (与后端重复定义)                                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ 无共享类型层
┌───────────────────────────▼─────────────────────────────────┐
│                     Backend (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  Routes (21个平铺, 未按领域分组)                             │
│  Services (服务定位器反模式, 循环依赖)                       │
│  Database (2668行单体, 无Repository抽象)                     │
│  Types (1009行, 无共享)                                     │
└─────────────────────────────────────────────────────────────┘
```

## 二、重构目标架构

### 2.1 目标架构图

```
重构后架构：
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Pages (拆分为小组件)                                        │
│  Components/                                                │
│    ├── domain/ (业务组件)                                   │
│    ├── shared/ (通用组件)                                   │
│    └── ui/ (基础UI)                                        │
│  Hooks/                                                     │
│    ├── useApi (统一API调用)                                 │
│    ├── useWebSocket (WebSocket订阅)                         │
│    └── useDataQuery (React Query替代Store数据层)            │
│  Stores/ (仅UI状态)                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  packages/shared-types                       │
├─────────────────────────────────────────────────────────────┤
│  entities/ (实体类型)                                       │
│  api/ (API契约类型)                                         │
│  validation/ (Zod schemas, 前后端共享)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Backend (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  Routes/                                                    │
│    ├── cron/ (jobs.ts, queue.ts, webhooks.ts)              │
│    ├── workflows/                                           │
│    └── media/                                               │
│  Controllers/ (新增, 处理请求响应)                          │
│  Services/ (业务逻辑, DI注入)                               │
│  Repositories/ (新增, 数据访问抽象)                         │
│    ├── JobRepository                                        │
│    ├── TaskRepository                                       │
│    └── LogRepository                                        │
│  DI Container (新增, 替代服务定位器)                        │
│  Infrastructure/                                            │
│    ├── logger/                                              │
│    ├── timeout/                                             │
│    └── backoff/                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 设计模式应用

| 模式 | 应用场景 | 实现方式 |
|------|----------|----------|
| **Repository Pattern** | 数据访问层抽象 | JobRepository, TaskRepository, LogRepository |
| **Strategy Pattern** | 节点执行器 | ActionNodeExecutor, ConditionNodeExecutor... |
| **Factory Pattern** | 服务实例化 | DI Container + ServiceFactory |
| **Template Method** | 通用CRUD操作 | BaseRepository<T> |
| **Observer Pattern** | 事件发布 | EventEmitter 统一事件中心 |
| **Decorator Pattern** | 超时/重试装饰 | withTimeout(), withRetry() |

## 三、重构阶段规划

### Phase 0: 基础设施建设 (基础设施)

**目标**: 创建共享类型包、统一基础设施抽象

**任务**:
| ID | 任务 | 输入 | 输出 | 验证标准 |
|----|------|------|------|----------|
| P0-1 | 创建 shared-types 包 | - | packages/shared-types/ | tsconfig可引用 |
| P0-2 | 提取共享实体类型 | server/database/types.ts | packages/shared-types/entities/ | 前后端可导入 |
| P0-3 | 提取Zod验证Schema | server/validation/*.ts | packages/shared-types/validation/ | 后端routes可导入 |
| P0-4 | 统一超时抽象 | 三处重复代码 | server/infrastructure/timeout.ts | 单一withTimeout函数 |
| P0-5 | 统一Backoff策略 | 三处重复代码 | server/infrastructure/backoff.ts | 单一BackoffCalculator类 |

**Commit节点**: `feat(infra): add shared-types package and unify timeout/backoff`

### Phase 1: 后端架构重构 (高优先级)

**目标**: 拆分千行文件、引入Repository模式、移除服务定位器

**任务**:
| ID | 任务 | 输入 | 输出 | 验证标准 |
|----|------|------|------|----------|
| P1-1 | 拆分 DatabaseService | service-async.ts | repositories/*.ts | 每个Repository <300行 |
| P1-2 | 创建 DI Container | getXxxService() | server/container.ts | 所有服务通过container获取 |
| P1-3 | 拆分 workflow-engine.ts | workflow-engine.ts | workflow/*.ts | 每个文件 <300行 |
| P1-4 | 拆分 routes/cron.ts | cron.ts | routes/cron/*.ts | vitest test通过 |
| P1-5 | 提取节点执行器Strategy | WorkflowEngine节点逻辑 | executors/*.ts | 每个Executor独立类 |
| P1-6 | 统一事件发布 | WebSocket/Webhook重复 | server/infrastructure/events.ts | 单一EventEmitter |

**Commit节点**: `feat(server): refactor architecture with Repository pattern and DI`

### Phase 2: 前端架构重构 (高优先级)

**目标**: 拆分千行组件、统一API层、引入React Query

**任务**:
| ID | 任务 | 输入 | 输出 | 验证标准 |
|----|------|------|------|----------|
| P2-1 | 统一API客户端 | fetch/axios混用 | src/lib/api/client.ts | 单一client,统一错误处理 |
| P2-2 | 拆分 WorkflowBuilder.tsx | WorkflowBuilder.tsx | components/workflow/*.tsx | 每个组件 <300行 |
| P2-3 | 拆分 CronManagement.tsx | CronManagement.tsx | components/cron/*.tsx | 四个Tab独立组件 |
| P2-4 | 提取共享UI组件 | 页面内重复组件 | components/shared/*.tsx | StatusBadge等提取 |
| P2-5 | 引入 React Query | Store数据获取逻辑 | hooks/useDataQuery.ts | Stores仅保留UI状态 |
| P2-6 | 使用shared-types | src/types/*.ts | 从shared-types导入 | 移除重复类型定义 |

**Commit节点**: `feat(frontend): refactor architecture with unified API and React Query`

### Phase 3: 细节优化 (中优先级)

**目标**: 配置外置、日志统一、优化剩余问题

**任务**:
| ID | 任务 | 输入 | 输出 | 验证标准 |
|----|------|------|------|----------|
| P3-1 | 配置外置 | 硬编码常量 | server/config/*.ts | 所有配置从config读取 |
| P3-2 | 统一日志 | console.error | server/infrastructure/logger.ts | 所有服务使用logger |
| P3-3 | 修复Read-Modify-Write | updateCronJobRunStats | 使用SQL原子更新 | 无竞态条件 |
| P3-4 | 优化Select.tsx | Select.tsx 600行 | ui/Select + ui/SelectSearch | 每个文件 <200行 |
| P3-5 | 事务边界 | executeJobTick | withTransaction包装 | 失败时自动回滚 |

**Commit节点**: `refactor: optimize config, logging, and transaction handling`

## 四、依赖关系图

```
Phase 0 (可全部并行):
  P0-1 ─┬─ P0-2 ─┬─ P0-3
        │        │
        ├─ P0-4 ─┤
        │        │
        └─ P0-5 ─┘

Phase 1 (P1-1必须先完成):
  P1-1 ──┬── P1-2 ──┬── P1-6
         │          │
         ├── P1-3 ──┤
         │          │
         ├── P1-4   │
         │          │
         └─ P1-5 ───┘

Phase 2 (P2-1必须先完成):
  P2-1 ──┬── P2-2
         │
         ├── P2-3
         │
         ├── P2-4
         │
         ├── P2-5 ── P2-6
         │
         └─ P2-6 (依赖Phase 0)

Phase 3 (可全部并行):
  P3-1 ─┬─ P3-2 ─┬─ P3-5
        │        │
        ├─ P3-3 ─┤
        │        │
        └─ P3-4 ─┘
```

## 五、验证标准

### 5.1 阶段验收

| 阶段 | 验收标准 |
|------|----------|
| Phase 0 | `npm run build` 通过，shared-types可被前后端导入 |
| Phase 1 | `vitest run` 全部通过，无文件超过500行，无服务定位器调用 |
| Phase 2 | `npm run build` 通过，前端组件无超过300行，API统一 |
| Phase 3 | `vitest run` 全部通过，无硬编码，日志统一 |

### 5.2 质量指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 最大文件行数 | 2668行 | <500行 |
| 重复代码比例 | 估计30% | <5% |
| 服务定位器调用 | 5+ 处 | 0 |
| 类型重复定义 | 10+ 处 | 0 (共享类型包) |
| 测试覆盖率 | 未知 | >80% |

## 六、技术决策记录

### 6.1 为什么选择Repository模式

- **问题**: DatabaseService 2668行，包含所有实体CRUD
- **决策**: 按领域拆分 Repository (JobRepository, TaskRepository...)
- **替代方案**: 保持单体但分组方法 → 拒绝，仍违反SRP

### 6.2 为什么选择DI Container

- **问题**: getXxxService() 单例隐藏依赖，难以测试
- **决策**: 创建 DI Container，显式注入依赖
- **替代方案**: 保持服务定位器 → 拒绝，测试时无法mock

### 6.3 为什么选择React Query

- **问题**: Store职责过重，数据获取逻辑分散
- **决策**: React Query 处理数据获取，Store仅保留UI状态
- **替代方案**: 保持现状 → 拒绝，维护成本高

### 6.4 为什么创建shared-types包

- **问题**: 前后端类型重复定义，数据契约脆弱
- **决策**: 创建独立包，前后端共享类型和验证Schema
- **替代方案**: 保持分离 → 拒绝，API变更时两边需同步修改