# Workflow System Redesign - Master Plan

> 本文档为工作流系统重构的总方案，协调各子方案的实施。

## 1. 背景与目标

### 1.1 当前问题

1. **概念混淆**：流程编辑器中有 Trigger 节点，定时任务管理中也有 cron，概念重复
2. **节点类型过多**：11 种节点类型（text-generation、image-generation 等），新增功能需要修改代码
3. **无法复用流程**：每个定时任务独立存储 workflow_json，同一业务逻辑无法复用
4. **缺少权限管理**：任何用户都可以使用任何节点，无精细化权限控制
5. **无法共享流程**：流程无法授权给其他用户使用

### 1.2 目标

1. **统一 Action 节点**：所有服务调用统一为 `action` 类型，通过 service + method 指定
2. **流程与任务分离**：流程模板专注业务逻辑，定时任务负责触发和关联
3. **权限前置**：配置阶段控制权限，执行阶段无需检查
4. **流程可复用**：一个流程模板可被多个定时任务使用
5. **流程可共享**：Super 用户可授权流程给其他用户

---

## 2. 架构设计

### 2.1 核心架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Workflow Editor              │  Cron Job Manager                   │
│  - Node Palette (动态加载)     │  - Create Job                       │
│  - Canvas (DAG 编辑)          │  - Select Workflow                  │
│  - Config Panel               │  - Set Cron Expression              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Backend                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Routes:                                                             │
│  - /api/workflows/*           (流程管理)                              │
│  - /api/workflows/available-actions (可用节点列表)                    │
│  - /api/cron/jobs/*           (定时任务管理)                          │
│  - /api/admin/workflows/*     (流程授权)                              │
│  - /api/admin/service-nodes/* (节点权限管理)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Services:                                                           │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ ServiceNode     │   │ WorkflowEngine  │   │ CronScheduler   │   │
│  │ Registry        │   │                 │   │                 │   │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   │
│           │                     │                     │             │
│           │    ┌────────────────┴─────────────────────┘             │
│           │    │                                                       │
│           ▼    ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  Registered Services                         │    │
│  │  - minimaxClient (MiniMax API)                              │    │
│  │  - db (DatabaseService)                                     │    │
│  │  - capacityChecker (CapacityChecker)                        │    │
│  │  - mediaStorage (MediaStorage)                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL):                                              │
│  - workflow_templates       (流程模板)                               │
│  - cron_jobs                (定时任务)                               │
│  - service_node_permissions (节点权限)                               │
│  - workflow_permissions     (流程授权)                               │
│  - execution_logs           (执行日志)                               │
│  - execution_log_details    (节点详情)                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户操作                       系统处理                        数据变更
────────────────────────────────────────────────────────────────────────

创建流程:
  拖拽节点 → 保存流程
           → 验证节点权限 (service_node_permissions)
           → 创建记录                   workflow_templates +

创建定时任务:
  选择流程 → 设置 cron → 创建任务
           → 验证流程权限 (workflow_permissions)
           → 调度任务                   cron_jobs +
                                        scheduler.register()

执行任务:
  cron 触发 → 执行流程
           → 创建执行日志               execution_logs +
           → 执行节点                   execution_log_details +
           → 更新任务统计               cron_jobs updated
```

---

## 3. 子方案清单

| 编号 | 子方案 | 说明 |
|------|--------|------|
| SP-1 | [数据库重构](./sub-plans/01-database-redesign.md) | 表结构重设计、数据迁移 |
| SP-2 | [Service Node Registry](./sub-plans/02-service-node-registry.md) | 服务注册与调用机制 |
| SP-3 | [权限管理系统](./sub-plans/03-permission-management.md) | 节点权限、流程授权 |
| SP-4 | [WorkflowEngine 改造](./sub-plans/04-workflow-engine-refactor.md) | 统一 action 节点、模板解析 |
| SP-5 | [前端重构](./sub-plans/05-frontend-refactor.md) | 节点组件、配置面板、权限 UI |
| SP-6 | [CronScheduler 适配](./sub-plans/06-cron-scheduler-adaptation.md) | 适配新的数据模型 |

---

## 4. 实施顺序

### Phase 1: 数据层 (Day 1)

```
SP-1: 数据库重构
  ├── 删除旧表
  ├── 创建新表
  ├── 初始化 service_node_permissions 数据
  └── 更新 TypeScript 类型定义
```

### Phase 2: 核心服务 (Day 1-2)

```
SP-2: Service Node Registry
  ├── 实现 ServiceNodeRegistry 类
  ├── 启动时注册服务实例
  └── 提供调用接口

SP-4: WorkflowEngine 改造
  ├── 删除旧的节点类型处理
  ├── 实现 executeActionNode (统一处理)
  ├── 集成 ServiceNodeRegistry
  └── 更新模板解析逻辑
```

### Phase 3: 权限系统 (Day 2)

```
SP-3: 权限管理系统
  ├── 实现节点权限 API
  ├── 实现流程授权 API
  ├── 在流程创建时验证权限
  └── 在任务创建时验证权限
```

### Phase 4: 调度器 (Day 2)

```
SP-6: CronScheduler 适配
  ├── 适配新的 cron_jobs 表结构
  ├── 从 workflow_id 加载流程
  └── 传递 execution_log_id 给 WorkflowEngine
```

### Phase 5: 前端 (Day 2-3)

```
SP-5: 前端重构
  ├── 删除 trigger 节点类型
  ├── 统一 ActionNode 组件
  ├── 实现动态 Node Palette
  ├── 实现权限管理 UI
  └── 适配新的 API
```

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除现有数据 | 现有流程丢失 | 当前未投入使用，直接删除 |
| 前端改造量大 | 工期延长 | 分阶段实施，优先核心功能 |
| 权限逻辑复杂 | Bug 多 | 充分测试，写单元测试 |

---

## 6. 验收标准

### 功能验收

- [ ] 用户可以根据角色看到不同的可用节点
- [ ] 用户可以创建流程并保存
- [ ] Super 用户可以管理节点权限
- [ ] Super 用户可以授权流程给其他用户
- [ ] 用户可以创建定时任务并关联流程
- [ ] 定时任务可以按计划执行
- [ ] 执行日志记录完整

### 技术验收

- [ ] 所有测试通过
- [ ] TypeScript 无类型错误
- [ ] 数据库表结构符合设计
- [ ] API 响应格式一致

---

## 7. 参考资料

- [核心概念与模型](../specs/workflow-core-concepts.md)
- [现有代码分析](../../AGENTS.md)