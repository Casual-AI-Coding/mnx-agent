# MiniMax AI Toolset 架构重构实施计划

> 日期: 2026-04-05
> 状态: 执行中

## Phase 0: 基础设施建设

### P0-1: 创建 shared-types 包
**状态**: `pending`
**输入**: 无
**输出**: packages/shared-types/
**验证**: tsconfig可引用，前后端可导入

**步骤**:
1. 创建 packages/shared-types 目录
2. 配置 package.json 和 tsconfig.json
3. 创建 index.ts 导出所有类型
4. 更新 root tsconfig.json 添加 references

### P0-2: 提取共享实体类型
**状态**: `pending`
**输入**: server/database/types.ts
**输出**: packages/shared-types/entities/
**验证**: 后端导入无报错

**步骤**:
1. 分析 server/database/types.ts 实体类型
2. 创建 entities/cron-job.ts, entities/task.ts 等
3. 移除 snake_case/camelCase 转换函数，保留原始类型
4. 后端先导入验证

### P0-3: 提取Zod验证Schema
**状态**: `pending`
**输入**: server/validation/*.ts
**输出**: packages/shared-types/validation/
**验证**: 后端routes可导入，前端可导入

### P0-4: 统一超时抽象
**状态**: `pending`
**输入**: CronScheduler/TaskExecutor/WorkflowEngine 超时代码
**输出**: server/infrastructure/timeout.ts
**验证**: 三处代码替换为统一函数

### P0-5: 统一Backoff策略
**状态**: `pending`
**输入**: QueueProcessor/TaskExecutor/WorkflowEngine 退避代码
**输出**: server/infrastructure/backoff.ts
**验证**: 三处代码替换为统一类

---

## Phase 1: 后端架构重构

### P1-1: 拆分 DatabaseService (最高优先级)
**状态**: `pending`
**输入**: server/database/service-async.ts (2668行)
**输出**: server/repositories/*.ts
**验证**: vitest run 通过，每个Repository <300行

**步骤**:
1. 创建 server/repositories/ 目录
2. 提取 JobRepository (cron_jobs相关方法)
3. 提取 TaskRepository (task_queue相关方法)
4. 提取 LogRepository (execution_logs相关方法)
5. 提取 MediaRepository (media_records相关方法)
6. 提取 WebhookRepository (webhook_configs相关方法)
7. 提取 WorkflowRepository (workflow_templates相关方法)
8. 创建 BaseRepository<T> 抽象类
9. 更新所有服务注入新的Repository

### P1-2: 创建 DI Container
**状态**: `pending`
**输入**: getXxxService() 函数
**输出**: server/container.ts
**验证**: 无服务定位器调用

**步骤**:
1. 创建 ServiceContainer 类
2. 注册所有服务实例
3. 替换 getCronScheduler() 为 container.cronScheduler
4. 替换 getNotificationService() 为 container.notificationService
5. 替换 getServiceNodeRegistry() 为 container.serviceNodeRegistry

### P1-3: 拆分 workflow-engine.ts
**状态**: `pending`
**输入**: server/services/workflow-engine.ts (1229行)
**输出**: server/services/workflow/*.ts
**验证**: vitest run 通过

**步骤**:
1. 创建 server/services/workflow/ 目录
2. 提取 WorkflowParser (JSON解析验证)
3. 提取 WorkflowTopologicalSorter (层构建)
4. 提取 WorkflowTemplateResolver (变量替换)
5. 提取 WorkflowState (执行状态管理)
6. 保留 WorkflowEngine 作为协调器

### P1-4: 拆分 routes/cron.ts
**状态**: `pending`
**输入**: server/routes/cron.ts (929行)
**输出**: server/routes/cron/*.ts
**验证**: vitest run 通过

**步骤**:
1. 创建 server/routes/cron/ 目录
2. 提取 jobs.ts (GET/POST/PATCH/DELETE jobs)
3. 提取 queue.ts (队列管理)
4. 提取 logs.ts (执行日志)
5. 提取 webhooks.ts (Webhook配置)
6. 创建 index.ts 合并所有路由

### P1-5: 提取节点执行器Strategy
**状态**: `pending`
**输入**: WorkflowEngine executeActionNode等方法
**输出**: server/services/workflow/executors/*.ts
**验证**: 每个Executor独立类

**步骤**:
1. 创建 server/services/workflow/executors/ 目录
2. 创建 INodeExecutor 接口
3. 实现 ActionExecutor
4. 实现 ConditionExecutor
5. 实现 LoopExecutor
6. 实现 TransformExecutor
7. 实现 QueueExecutor
8. 创建 ExecutorFactory

### P1-6: 统一事件发布
**状态**: `pending`
**输入**: WebSocket/Webhook分散代码
**输出**: server/infrastructure/events.ts
**验证**: 单一EventEmitter

---

## Phase 2: 前端架构重构

### P2-1: 统一API客户端
**状态**: `pending`
**输入**: src/lib/api/* (fetch/axios混用)
**输出**: src/lib/api/client.ts (统一)
**验证**: 所有API文件使用统一client

### P2-2: 拆分 WorkflowBuilder.tsx
**状态**: `pending`
**输入**: src/pages/WorkflowBuilder.tsx (2080行)
**输出**: src/components/workflow/*.tsx
**验证**: 每个组件 <300行

**步骤**:
1. 提取 WorkflowCanvas (ReactFlow部分)
2. 提取 WorkflowToolbar (顶部工具栏)
3. 提取 WorkflowConfigPanel (右侧配置)
4. 提取 WorkflowVersionPanel (版本管理)
5. 提取 WorkflowTestPanel (测试运行)
6. 提取 WorkflowNodePalette (节点选择)

### P2-3: 拆分 CronManagement.tsx
**状态**: `pending`
**输入**: src/pages/CronManagement.tsx (1314行)
**输出**: src/components/cron/*.tsx
**验证**: 四个Tab独立组件

**步骤**:
1. 提取 CronJobsTab
2. 提取 TaskQueueTab
3. 提取 ExecutionLogsTab
4. 提取 DeadLetterQueueTab
5. 创建 CronTabsContainer 组合

### P2-4: 提取共享UI组件
**状态**: `pending`
**输入**: 页面内重复组件
**输出**: src/components/shared/*.tsx
**验证**: StatusBadge, ServiceIcon等提取

### P2-5: 引入 React Query
**状态**: `pending`
**输入**: Store数据获取逻辑
**输出**: src/hooks/useDataQuery.ts
**验证**: Stores仅保留UI状态

### P2-6: 使用shared-types
**状态**: `pending`
**输入**: src/types/*.ts
**输出**: 从shared-types导入
**验证**: 移除重复类型定义

---

## Phase 3: 细节优化

### P3-1: 配置外置
**状态**: `pending`
**验证**: 无硬编码

### P3-2: 统一日志
**状态**: `pending`
**验证**: 无console.error

### P3-3: 修复Read-Modify-Write
**状态**: `pending`
**验证**: 使用SQL原子更新

### P3-4: 优化Select.tsx
**状态**: `pending`
**验证**: 拆分为 <200行

### P3-5: 事务边界
**状态**: `pending`
**验证**: withTransaction包装

---

## Commit节点规划

```
Phase 0 完成: feat(infra): add shared-types package and unify timeout/backoff
Phase 1 完成: feat(server): refactor architecture with Repository pattern and DI
Phase 2 完成: feat(frontend): refactor architecture with unified API and React Query
Phase 3 完成: refactor: optimize config, logging, and transaction handling
```

## 执行顺序

1. **Phase 0**: P0-1 → P0-2 → P0-3 (串行) | P0-4, P0-5 (可并行)
2. **Phase 1**: P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 (串行)
3. **Phase 2**: P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → P2-6 (串行)
4. **Phase 3**: P3-1, P3-2, P3-3, P3-4, P3-5 (可并行)