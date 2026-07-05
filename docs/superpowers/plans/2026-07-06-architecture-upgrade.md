# 架构升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本次用户明确禁止 sub agent，因此所有步骤在当前 session 内按顺序执行。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过两条低风险、可验证的架构切片，降低启动层耦合与前端模板 store 类型债务，为后续 DDD 分层重构建立可复用边界。

**Architecture:** 第一阶段不做全仓库大爆炸重写，而是先把 `server/index.ts` 中的服务节点目录抽到独立模块，让启动文件只负责编排生命周期；同时把 `createTemplateStore` 改成以 `id` 为领域契约的泛型工厂，消除 `any` 与运行时类型断言。后续更大的 Service/Repository 拆分必须基于这些 characterization tests 继续推进。

**Tech Stack:** Express、TypeScript strict、Vitest、React 18、Zustand、PostgreSQL、node-cron、WebSocket。

---

## 方案边界

### 本阶段必须做

- 从 `server/index.ts` 抽离 ServiceNodeRegistry 可暴露服务目录，保留原有 6 个服务名与方法元数据。
- 用测试锁定服务节点目录的注册顺序、关键方法名、默认权限同步行为。
- 收紧 `src/stores/template-store-factory.ts` 泛型，要求模板实体显式拥有 `id: string`。
- 移除该工厂内的 `any`、`eslint-disable-next-line @typescript-eslint/no-explicit-any` 和对模板 id 的类型断言。
- 更新 `src/stores/workflowTemplates.ts`，让 list/create/update 参数类型由 API 函数签名推导，不再手写参数断言。

### 本阶段明确不做

- 不重写 `DatabaseService` 的 façade/service locator 结构；该文件风险高，留到后续独立计划。
- 不迁移全仓库路由到 feature-first 目录；当前只处理启动层硬编码目录。
- 不清理测试文件里历史遗留的 `as any`；本阶段只处理生产代码和新增测试必要类型。
- 不改认证、CORS、WebSocket 行为；所有 HTTP 路由挂载行为保持不变。

---

## 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 项目结构 | 渐进式 feature-first | 现有仓库是混合结构，先在触达区域建立小边界，避免一次性搬迁造成回归。 |
| API client | 保持现有 typed axios wrapper | 本阶段目标是状态工厂类型安全，不扩大到请求拦截器重构。 |
| Auth 策略 | 保持 JWT + refresh 现状 | 不触碰登录态和全局拦截器，降低风险。 |
| 实时方式 | 保持 WebSocket 现状 | 本阶段不改变调度和通知通道。 |
| 错误处理 | 保持现有统一 errorHandler | 启动层抽离不改变请求错误响应。 |

---

## 场景契约

### 场景 1：服务节点目录保持兼容

- Given：启动初始化解析出 `minimaxClient`、`db`、`capacityChecker`、`queueProcessor`、媒体存储函数和工具函数。
- When：调用新的服务节点目录注册函数。
- Then：注册表收到 6 个服务配置，服务名与关键方法名与重构前一致。
- 验证文件：`server/services/__tests__/service-node-catalog.test.ts`。

### 场景 2：服务节点注册仍同步权限

- Given：`ServiceNodeRegistry.register()` 对每个方法写入权限表。
- When：目录模块调用 registry 注册服务。
- Then：现有 registry 测试继续通过，方法默认 `min_role` 仍为 `pro`。
- 验证文件：`server/services/__tests__/service-node-registry.test.ts`。

### 场景 3：模板 store 工厂保留行为

- Given：自定义模板 API 返回 `{ items: [...] }`。
- When：使用 `createTemplateStore` 执行 list/get/create/update/delete。
- Then：store 状态更新方式与现有测试一致。
- 验证文件：`src/stores/__tests__/templates.test.ts`。

### 场景 4：模板 store 工厂类型边界收紧

- Given：模板实体拥有 `id: string`，create/update/list 参数由调用方泛型提供。
- When：调用工作流模板 store。
- Then：无需 `any` 或参数类型断言即可编译通过。
- 验证文件：`src/stores/workflowTemplates.ts` 与 `src/stores/template-store-factory.ts` 的 diagnostics/build。

---

## 文件结构

- Create: `server/services/service-node-catalog.ts`
  - 只负责构建和注册工作流节点可调用服务目录。
  - 接收依赖对象，不从 DI 容器自行 resolve，避免隐藏依赖。
- Create: `server/services/__tests__/service-node-catalog.test.ts`
  - 锁定服务名、关键方法名、注册数量和媒体/工具适配对象。
- Modify: `server/index.ts`
  - 删除内联 serviceRegistry.register 大块硬编码，改为调用 `registerServiceNodeCatalog()`。
- Modify: `src/stores/template-store-factory.ts`
  - 增加 `IdentifiedTemplate` 与泛型参数，替换 `any` 和断言。
- Modify: `src/stores/workflowTemplates.ts`
  - 指定 `WorkflowTemplate`、list/create/update 输入类型，移除 list 参数断言。
- Modify: `src/stores/templates.ts`
  - 保持导出兼容；必要时为 `TemplateStoreState<PromptTemplate>` 补默认泛型。
- Modify: `src/stores/__tests__/templates.test.ts`
  - 为 factory 测试增加 typed list/create/update 参数，证明新泛型契约可用。

---

## Task 1: 服务节点目录 RED 测试

**Files:**
- Create: `server/services/__tests__/service-node-catalog.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it, vi } from 'vitest'
import { registerServiceNodeCatalog } from '../service-node-catalog.js'
import type { ServiceConfig, ServiceNodeRegistry } from '../service-node-registry.js'

type RegistryStub = Pick<ServiceNodeRegistry, 'register'>

function createRegistryStub(): { registry: RegistryStub; registered: ServiceConfig[] } {
  const registered: ServiceConfig[] = []
  return {
    registered,
    registry: {
      register: vi.fn(async (config: ServiceConfig) => {
        registered.push(config)
      }),
    },
  }
}

describe('registerServiceNodeCatalog', () => {
  it('registers the workflow service node catalog with stable service names and key methods', async () => {
    const { registry, registered } = createRegistryStub()
    const minimaxClient = { chatCompletion: vi.fn(), imageGeneration: vi.fn(), getBalance: vi.fn() }
    const dbService = { getPendingTasks: vi.fn(), createMediaRecord: vi.fn(), updateTask: vi.fn() }
    const capacityChecker = { getRemainingCapacity: vi.fn(), canExecuteTask: vi.fn() }
    const queueProcessor = { processQueue: vi.fn(), retryFailedTasks: vi.fn() }
    const mediaStorage = { saveMediaFile: vi.fn(), saveFromUrl: vi.fn(), deleteMediaFile: vi.fn(), readMediaFile: vi.fn() }
    const utils = { toCSV: vi.fn(), generateMediaToken: vi.fn(), verifyMediaToken: vi.fn() }

    await registerServiceNodeCatalog(registry, {
      minimaxClient,
      dbService,
      capacityChecker,
      queueProcessor,
      mediaStorage,
      utils,
    })

    expect(registry.register).toHaveBeenCalledTimes(6)
    expect(registered.map(config => config.serviceName)).toEqual([
      'minimaxClient',
      'db',
      'capacityChecker',
      'mediaStorage',
      'queueProcessor',
      'utils',
    ])
    expect(registered[0].methods.map(method => method.name)).toContain('chatCompletion')
    expect(registered[1].methods.map(method => method.name)).toContain('createCronJob')
    expect(registered[3].instance).toBe(mediaStorage)
    expect(registered[5].methods.map(method => method.name)).toEqual(['toCSV', 'generateMediaToken', 'verifyMediaToken'])
  })
})
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm run test:server -- server/services/__tests__/service-node-catalog.test.ts`

Expected: FAIL，原因是 `server/services/service-node-catalog.ts` 尚不存在。

---

## Task 2: 实现服务节点目录并接入启动层

**Files:**
- Create: `server/services/service-node-catalog.ts`
- Modify: `server/index.ts`
- Test: `server/services/__tests__/service-node-catalog.test.ts`

- [ ] **Step 1: 写最小实现**

实现 `registerServiceNodeCatalog(registry, dependencies)`，把原 `server/index.ts` 内 6 段注册元数据原样迁入。依赖通过参数传入：`minimaxClient`、`dbService`、`capacityChecker`、`queueProcessor`、`mediaStorage`、`utils`。

- [ ] **Step 2: 接入 `server/index.ts`**

从 `server/services/service-node-catalog.js` 导入函数，构造依赖对象后调用它。启动文件保留 DI resolve、scheduler 初始化和 graceful shutdown，不再维护方法目录常量。

- [ ] **Step 3: 运行后端聚焦测试**

Run: `npm run test:server -- server/services/__tests__/service-node-catalog.test.ts server/services/__tests__/service-node-registry.test.ts`

Expected: PASS。

- [ ] **Step 4: 运行 diagnostics**

Run: `lsp_diagnostics server/services/service-node-catalog.ts` 与 `lsp_diagnostics server/index.ts`

Expected: 无新增错误。

---

## Task 3: 模板 store 泛型 RED 测试

**Files:**
- Modify: `src/stores/__tests__/templates.test.ts`

- [ ] **Step 1: 增强 factory 测试类型契约**

把 `createTemplateStore<CustomItem>` 改为显式泛型：`createTemplateStore<CustomItem, CustomListParams, CustomCreateInput, CustomUpdateInput>`，并定义 `mockListApi`、`mockCreateApi`、`mockUpdateApi` 参数类型。测试调用 `fetchTemplates({ ownerId: 'owner-1' })`、`addTemplate({ name: 'New Item' })`、`editTemplate('item-1', { name: 'Updated Item' })`。

- [ ] **Step 2: 运行测试或类型检查确认 RED**

Run: `npm run test -- src/stores/__tests__/templates.test.ts`

Expected: 当前实现泛型参数不足或仍需要宽泛类型，测试编译失败。

---

## Task 4: 收紧模板 store 工厂类型

**Files:**
- Modify: `src/stores/template-store-factory.ts`
- Modify: `src/stores/templates.ts`
- Modify: `src/stores/workflowTemplates.ts`
- Test: `src/stores/__tests__/templates.test.ts`

- [ ] **Step 1: 修改工厂类型**

定义 `IdentifiedTemplate`，让 `TemplateStoreState<TTemplate extends IdentifiedTemplate, TListParams = void, TCreateInput = Partial<TTemplate>, TUpdateInput = Partial<TTemplate>>` 暴露强类型方法。`TemplateStoreConfig` 使用同样泛型，`listApi` 返回 `ApiResponse<Record<string, TTemplate[] | unknown>>`。

- [ ] **Step 2: 删除运行时 id 断言**

在 `editTemplate` 和 `removeTemplate` 中直接使用 `template.id` 与 `state.currentTemplate?.id`，不再使用 `(t as { id: string })`。

- [ ] **Step 3: 更新 workflow templates store**

使用 `createTemplateStore<WorkflowTemplate, Parameters<typeof listWorkflows>[0], CreateWorkflowDTO, UpdateWorkflowDTO>`，并直接传入 `listApi: listWorkflows`，删除 `params as ...`。

- [ ] **Step 4: 运行前端聚焦测试与 diagnostics**

Run: `npm run test -- src/stores/__tests__/templates.test.ts src/stores/__tests__/workflowTemplates.test.ts`

Expected: PASS。

Run: `lsp_diagnostics src/stores/template-store-factory.ts`、`lsp_diagnostics src/stores/templates.ts`、`lsp_diagnostics src/stores/workflowTemplates.ts`

Expected: 无新增错误。

---

## Task 5: 验证、Review 与原子提交

**Files:**
- All changed files

- [ ] **Step 1: 运行构建验证**

Run: `npm run build`

Expected: exit 0。

- [ ] **Step 2: 搜索本阶段禁止模式**

Run: `rg "no-explicit-any|\bany\b|as \{ id: string \}|params as Parameters" src/stores/template-store-factory.ts src/stores/workflowTemplates.ts`

Expected: 无输出，或仅出现非禁止的类型名片段。

- [ ] **Step 3: 自审 diff**

Run: `GIT_MASTER=1 git diff --stat` 与 `GIT_MASTER=1 git diff`

Expected: diff 只包含计划中的文档、后端 catalog、启动层接入、模板 store 类型收紧和对应测试。

- [ ] **Step 4: 原子提交**

按 git-master 规则拆分提交：文档计划、后端服务节点目录、前端模板 store 类型收紧。每个提交带 Sisyphus footer 与 co-author。

---

## 后续迭代候选

- 将 `server/index.ts` 路由挂载继续抽到 `server/bootstrap/routes.ts`，用集成测试锁定公开路由。
- 将 `DatabaseService` façade 拆成更窄的端口接口，让 workflow/task/media 依赖各自端口而非 God service。
- 将 `src/lib/api/client.ts` 的 auth/settings store 依赖抽成 request context adapter，减少 API client 对 UI store 的直接耦合。
- 梳理路由中直接 `new Service/Repository` 的位置，逐步迁移到 DI 容器或 factory。
