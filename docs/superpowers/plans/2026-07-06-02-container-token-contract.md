# 容器 Token 契约统一实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本次用户明确禁止 sub agent，因此所有步骤在当前 session 内按顺序执行。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `server/service-registration.ts` 中的真实 `TOKENS` 成为容器类型解析的单一契约来源，消除 `server/container.types.ts` 与运行时注册表脱节的问题。

**Architecture:** 本阶段不重写 DI 容器运行时，只在类型层建立 `ContainerTokenMap` 与 `resolve(container, token)` 的一致契约。`TOKENS` 继续由服务注册模块导出，`container.types.ts` 只描述 token 到服务类型的映射，避免重复维护字符串 token。

**Tech Stack:** Express、TypeScript strict、Vitest、现有轻量 DI Container。

---

## 方案边界

### 本阶段必须做

- 用测试锁定 `resolve(container, TOKENS.DATABASE)`、`resolve(container, TOKENS.TASK_EXECUTOR)`、`resolve(container, TOKENS.EVENT_BUS)` 等真实 token 的类型化解析能力。
- 将 `server/container.types.ts` 从遗留 repository token 映射改为真实服务 token 映射。
- 保持 `server/container.ts` 运行时行为不变：注册、singleton、scope、missing dependency 语义不变。
- 保持 `server/service-registration.ts` 的 token 字符串与服务注册顺序不变。

### 本阶段明确不做

- 不把 `Container` 本身改成泛型容器；避免影响全仓库 29 个调用点。
- 不重写 `registerServices()` 的创建逻辑；当前只统一类型契约。
- 不清理既有容器实现中的历史类型断言；本阶段新增代码不引入新的类型逃逸。
- 不迁移 cron/domain service 的构造参数或接口边界。

---

## 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Token 来源 | 复用 `TOKENS` 常量 | 运行时注册已以该对象为准，类型层引用它可减少重复字符串。 |
| 类型映射 | `ContainerTokenMap` | 以 token 字符串字面量为 key，表达 `resolve()` 的返回类型。 |
| 容器运行时 | 保持非泛型 `Container` | 现有测试覆盖稳定，泛型化容器会扩大影响面。 |
| 测试形态 | 编译契约 + 运行时回归 | 类型债务需要通过 TypeScript 编译证明，运行时仍用既有容器测试证明行为不变。 |

---

## 场景契约

### 场景 1：真实 token 可类型化解析

- Given：容器注册了真实 token 对应的服务实例。
- When：调用 `resolve(container, TOKENS.DATABASE)`、`resolve(container, TOKENS.TASK_EXECUTOR)`、`resolve(container, TOKENS.EVENT_BUS)`。
- Then：返回值在编译期分别拥有 `DatabaseService`、`TaskExecutor`、`IEventBus` 类型。
- 验证文件：`server/__tests__/container-types.test.ts` 与 `npm run build`。

### 场景 2：旧弱类型 repository token 不再伪装为容器契约

- Given：真实注册表没有注册 `cronJobRepository`、`taskRepository` 这类遗留 token。
- When：维护者查看 `ContainerTokenMap`。
- Then：类型映射只包含 `TOKENS` 中真实注册的 token，减少误用入口。
- 验证文件：`server/container.types.ts`。

### 场景 3：容器运行时行为保持稳定

- Given：现有 `Container` 注册普通值、factory、singleton 和 scoped singleton。
- When：运行现有容器测试。
- Then：全部行为保持通过。
- 验证文件：`server/__tests__/container.test.ts`。

---

## 文件结构

- Create: `server/__tests__/container-types.test.ts`
  - 只验证类型化 helper 能解析真实 token，并用轻量 fixture 证明运行时仍走 `Container.resolve()`。
- Modify: `server/container.types.ts`
  - 删除遗留 repository port 映射，导入真实服务类型，定义 `ContainerTokenMap`、`ContainerToken`、`resolve()`。
- Modify: `server/service-registration.ts`
  - 仅在 getter 层可选切换到类型化 `resolve()`；若引发循环依赖风险，则保持现状不改。

---

## Task 1: 容器 token 类型契约 RED 测试

**Files:**
- Create: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { createContainer } from '../container.js'
import { resolve } from '../container.types.js'
import { TOKENS } from '../service-registration.js'
import { ConcurrencyManager } from '../services/concurrency-manager.js'
import { RetryManager } from '../services/retry-manager.js'
import type { IConcurrencyManager } from '../services/interfaces/concurrency-manager.interface.js'
import type { IEventBus } from '../services/interfaces/event-bus.interface.js'
import type { IRetryManager } from '../services/interfaces/retry-manager.interface.js'
import { createMockEventBus } from './helpers/mock-event-bus.js'

describe('container typed tokens', () => {
  it('resolves real service-registration tokens with their service types', () => {
    const container = createContainer()
    const concurrencyManager = new ConcurrencyManager()
    const retryManager = new RetryManager()
    const eventBus = createMockEventBus()

    container.register(TOKENS.CONCURRENCY_MANAGER, concurrencyManager)
    container.register(TOKENS.RETRY_MANAGER, retryManager)
    container.register(TOKENS.EVENT_BUS, eventBus)

    const resolvedConcurrencyManager: IConcurrencyManager = resolve(container, TOKENS.CONCURRENCY_MANAGER)
    const resolvedRetryManager: IRetryManager = resolve(container, TOKENS.RETRY_MANAGER)
    const resolvedEventBus: IEventBus = resolve(container, TOKENS.EVENT_BUS)

    expect(resolvedConcurrencyManager).toBe(concurrencyManager)
    expect(resolvedRetryManager).toBe(retryManager)
    expect(resolvedEventBus).toBe(eventBus)
  })
})
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm run test:server -- server/__tests__/container-types.test.ts`

Expected: FAIL，原因是当前 `resolve()` 的 token 类型仍来自旧 `ContainerTokens`，不接受 `TOKENS.CONCURRENCY_MANAGER`、`TOKENS.RETRY_MANAGER`、`TOKENS.EVENT_BUS`，并把返回值视为 `unknown`。

---

## Task 2: 统一容器 token 类型映射

**Files:**
- Modify: `server/container.types.ts`
- Test: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 写最小实现**

在 `server/container.types.ts` 中导入 `TOKENS` 与真实服务类型，定义：

```typescript
export interface ContainerTokenMap {
  readonly [TOKENS.DATABASE]: DatabaseService
  readonly [TOKENS.MINIMAX_CLIENT]: MiniMaxClient
  readonly [TOKENS.TASK_EXECUTOR]: TaskExecutor
  readonly [TOKENS.CAPACITY_CHECKER]: CapacityChecker
  readonly [TOKENS.QUEUE_PROCESSOR]: QueueProcessor
  readonly [TOKENS.WORKFLOW_ENGINE]: WorkflowEngine
  readonly [TOKENS.CRON_SCHEDULER]: CronScheduler
  readonly [TOKENS.SERVICE_NODE_REGISTRY]: ServiceNodeRegistry
  readonly [TOKENS.WEBSOCKET_SERVICE]: WebSocketService
  readonly [TOKENS.NOTIFICATION_SERVICE]: NotificationService
  readonly [TOKENS.EXECUTION_STATE_MANAGER]: ExecutionStateManager
  readonly [TOKENS.WORKFLOW_SERVICE]: WorkflowService
  readonly [TOKENS.EVENT_BUS]: IEventBus
  readonly [TOKENS.CONCURRENCY_MANAGER]: IConcurrencyManager
  readonly [TOKENS.MISFIRE_HANDLER]: IMisfireHandler
  readonly [TOKENS.RETRY_MANAGER]: IRetryManager
  readonly [TOKENS.DLQ_AUTO_RETRY_SCHEDULER]: IDLQAutoRetryScheduler
  readonly [TOKENS.JOB_SERVICE]: JobService
  readonly [TOKENS.TASK_SERVICE]: TaskService
  readonly [TOKENS.LOG_SERVICE]: LogService
  readonly [TOKENS.MEDIA_SERVICE]: MediaService
  readonly [TOKENS.WEBHOOK_SERVICE]: WebhookService
  readonly [TOKENS.CAPACITY_SERVICE]: CapacityService
  readonly [TOKENS.MATERIAL_SERVICE]: MaterialService
  readonly [TOKENS.EXPORT_SERVICE]: ExportService
}

export type ContainerToken = keyof ContainerTokenMap

export function resolve<TToken extends ContainerToken>(container: Container, token: TToken): ContainerTokenMap[TToken] {
  return container.resolve<ContainerTokenMap[TToken]>(token)
}
```

- [ ] **Step 2: 运行聚焦测试确认 GREEN**

Run: `npm run test:server -- server/__tests__/container-types.test.ts server/__tests__/container.test.ts`

Expected: PASS。

- [ ] **Step 3: 运行 diagnostics**

Run: `lsp_diagnostics server/container.types.ts` 与 `lsp_diagnostics server/__tests__/container-types.test.ts`

Expected: 无新增错误。

---

## Task 3: 编译与行为验证

**Files:**
- Verify: `server/container.types.ts`
- Verify: `server/service-registration.ts`
- Verify: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 运行后端相关测试**

Run: `npm run test:server -- server/__tests__/container-types.test.ts server/__tests__/container.test.ts server/services/__tests__/misfire-handler.test.ts`

Expected: PASS。

- [ ] **Step 2: 运行构建验证类型面**

Run: `npm run build`

Expected: PASS，证明真实 token 类型映射没有引入循环导入或编译错误。

- [ ] **Step 3: 代码自审**

检查：新增代码无 `any`、无 `@ts-ignore`、无 `@ts-expect-error`、无非空断言；`container.types.ts` 只描述真实 token，不包含未注册 repository token。

---

## Task 4: 原子提交

**Files:**
- Commit: `docs/superpowers/plans/2026-07-06-02-container-token-contract.md`
- Commit: `server/container.types.ts`
- Commit: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 按 git-master 检测仓库提交风格**

Run: `GIT_MASTER=1 git status`、`GIT_MASTER=1 git diff --stat`、`GIT_MASTER=1 git log -30 --oneline`。

Expected: 识别为语义化中文提交风格。

- [ ] **Step 2: 分组提交**

计划提交：

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-06-02-container-token-contract.md
GIT_MASTER=1 git commit -m "docs(architecture): 规划容器 token 契约统一" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"

GIT_MASTER=1 git add server/container.types.ts server/__tests__/container-types.test.ts
GIT_MASTER=1 git commit -m "refactor(server): 统一容器 token 类型契约" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

Expected: 两个提交分别表达计划与实现，可独立审阅。

---

## 自审结果

- 规格覆盖：计划覆盖 token 类型脱节、真实 token 解析、运行时行为回归、编译验证与提交。
- 占位符扫描：无 `TBD`、无待补充段落、无未定义任务。
- 类型一致性：`ContainerTokenMap` 以 `TOKENS` 字符串字面量为 key，`resolve()` 返回 `ContainerTokenMap[TToken]`。
- 范围控制：不重写容器运行时、不扩大到服务构造重构、不触碰 HTTP/WebSocket 行为。
