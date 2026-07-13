# 服务注册模块化实施计划

> **执行约束：** 用户明确禁止 sub agent。本计划在当前会话顺序执行，使用复选框记录事实状态。

**目标：** 将服务注册的 token、注册编排和全局 getter 拆为内部模块，同时保持 `server/service-registration.ts` 的公开 API 与运行时生命周期兼容。

**架构：** `tokens.ts` 是唯一 token 源；`service-registrations.ts` 接受 `Container` 并登记既有依赖；`service-getters.ts` 保留全局解析；根文件作为兼容门面调用内部注册器并重导出公开符号。

**技术栈：** Express、TypeScript strict、Vitest、现有轻量 DI Container。

---

## 文件结构

- 新增：`server/service-registration/tokens.ts`
  - 仅导出 `TOKENS` 常量。
- 新增：`server/service-registration/service-registrations.ts`
  - 接收 `Container`，移动现有服务登记顺序和 factory 调用。
- 新增：`server/service-registration/service-getters.ts`
  - 移动所有既有 `getXxxService()` 实现。
- 新增：`server/service-registration/__tests__/tokens.test.ts`
  - 锁定 token 字符串契约。
- 新增：`server/service-registration/__tests__/composition-contract.test.ts`
  - 锁定门面重导出与内部模块边界。
- 修改：`server/service-registration.ts`
  - 保留兼容门面，调用内部注册器。
- 修改：`server/container.types.ts`
  - 从 `tokens.ts` 导入 token。

---

## 任务 1：建立稳定 token 模块的 RED 测试

**文件：**
- 新增：`server/service-registration/__tests__/tokens.test.ts`
- 新增：`server/service-registration/tokens.ts`
- 修改：`server/container.types.ts`

- [x] **步骤 1：写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { TOKENS } from '../tokens.js'

describe('service registration tokens', () => {
  it('preserves every public dependency token value', () => {
    expect(TOKENS).toEqual({
      DATABASE: 'database',
      MINIMAX_CLIENT: 'minimaxClient',
      TASK_EXECUTOR: 'taskExecutor',
      CAPACITY_CHECKER: 'capacityChecker',
      QUEUE_PROCESSOR: 'queueProcessor',
      WORKFLOW_ENGINE: 'workflowEngine',
      CRON_SCHEDULER: 'cronScheduler',
      SERVICE_NODE_REGISTRY: 'serviceNodeRegistry',
      WEBSOCKET_SERVICE: 'websocketService',
      NOTIFICATION_SERVICE: 'notificationService',
      EXECUTION_STATE_MANAGER: 'executionStateManager',
      WORKFLOW_SERVICE: 'workflowService',
      EVENT_BUS: 'eventBus',
      CONCURRENCY_MANAGER: 'concurrencyManager',
      MISFIRE_HANDLER: 'misfireHandler',
      RETRY_MANAGER: 'retryManager',
      DLQ_AUTO_RETRY_SCHEDULER: 'dlqAutoRetryScheduler',
      JOB_SERVICE: 'jobService',
      TASK_SERVICE: 'taskService',
      LOG_SERVICE: 'logService',
      MEDIA_SERVICE: 'mediaService',
      WEBHOOK_SERVICE: 'webhookService',
      CAPACITY_SERVICE: 'capacityService',
      MATERIAL_SERVICE: 'materialService',
      EXPORT_SERVICE: 'exportService',
      BACKUP_SERVICE: 'backupService',
      TEMPLATE_SERVICE: 'templateService',
      SYSTEM_CONFIG_SERVICE: 'systemConfigService',
      EXTERNAL_API_LOG_SERVICE: 'externalApiLogService',
      SERVICE_NODE_PERMISSION_SERVICE: 'serviceNodePermissionService',
      SETTINGS_SERVICE: 'settingsService',
      EXTERNAL_API_LOG_REPOSITORY: 'externalApiLogRepository',
      MEDIA_REPOSITORY: 'mediaRepository',
      USER_SERVICE: 'userService',
    })
  })
})
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/tokens.test.ts`

预期：FAIL，原因是 `../tokens.js` 尚不存在。

- [x] **步骤 3：实现最小 token 模块并替换类型契约导入**

```typescript
// server/service-registration/tokens.ts
export const TOKENS = {
  DATABASE: 'database',
  // 保留步骤 1 中所有键和值
  USER_SERVICE: 'userService',
} as const

// server/container.types.ts
import { TOKENS } from './service-registration/tokens.js'
```

从现有 `service-registration.ts` 原样移动完整 token 对象，不改任何键或值。

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/service-registration/__tests__/tokens.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`

预期：所有测试通过。

---

## 任务 2：建立门面与内部模块的 RED 组合契约

**文件：**
- 新增：`server/service-registration/__tests__/composition-contract.test.ts`
- 新增：`server/service-registration/service-registrations.ts`
- 新增：`server/service-registration/service-getters.ts`
- 修改：`server/service-registration.ts`

- [x] **步骤 1：写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import * as publicFacade from '../../service-registration.js'
import * as getters from '../service-getters.js'
import { registerServiceDependencies } from '../service-registrations.js'
import { TOKENS } from '../tokens.js'

describe('service registration composition', () => {
  it('reexports the single token object and every getter through the public facade', () => {
    expect(publicFacade.TOKENS).toBe(TOKENS)

    expect(publicFacade).toMatchObject(getters)
  })

  it('keeps public and internal registration entry points available', () => {
    expect(publicFacade.registerServices).toBeTypeOf('function')
    expect(registerServiceDependencies).toBeTypeOf('function')
  })
})
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/composition-contract.test.ts`

预期：FAIL，原因是 `service-getters.js` 与 `service-registrations.js` 尚不存在。

- [x] **步骤 3：移动注册编排**

```typescript
// server/service-registration/service-registrations.ts
import type { Container } from '../container.js'
import { TOKENS } from './tokens.js'

export async function registerServiceDependencies(container: Container): Promise<void> {
  // 从原 registerServices 原样移动数据库、MiniMax 和 singleton 登记语句。
  // 保留原有登记顺序与 factory 调用。
}
```

注册器不得调用 `getGlobalContainer()`；全局容器边界由门面控制。

- [x] **步骤 4：移动 getter 并改造兼容门面**

```typescript
// server/service-registration.ts
import { getGlobalContainer } from './container.js'
import { registerServiceDependencies } from './service-registration/service-registrations.js'

export { TOKENS } from './service-registration/tokens.js'
export * from './service-registration/service-getters.js'

export async function registerServices(): Promise<void> {
  await registerServiceDependencies(getGlobalContainer())
}
```

将所有现有 `getXxxService()` 实现原样移动到 `service-getters.ts`；它从 `tokens.ts` 获取 token，并继续从 `getGlobalContainer()` 解析服务。

- [x] **步骤 5：确认 GREEN**

运行：`npm run test:server -- server/service-registration/__tests__/tokens.test.ts server/service-registration/__tests__/composition-contract.test.ts server/service-registration/__tests__/repository-factories.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`

预期：所有测试通过。

---

## 任务 3：DI 契约、静态检查与构建验证

**文件：**
- 验证：本计划列出的所有 TypeScript 文件。
- 验证：既有 `server/routes/__tests__/*-di-contract.test.ts`。

- [x] **步骤 1：运行 diagnostics 和禁止项检查**

对新增和修改的 TypeScript 文件运行 `lsp_diagnostics`，并检查：

```bash
grep -nE '\bany\b|@ts-ignore|@ts-expect-error|as[[:space:]]+unknown[[:space:]]+as' server/service-registration/*.ts server/service-registration/__tests__/*.ts
git diff --check
```

预期：无新增 diagnostics、无禁止项、无空白错误。

- [x] **步骤 2：运行路由 DI 契约测试**

运行：

```bash
npm run test:server -- \
  server/routes/__tests__/auth-di-contract.test.ts \
  server/routes/__tests__/media-di-contract.test.ts \
  server/routes/__tests__/external-proxy-di-contract.test.ts \
  server/routes/__tests__/settings-di-contract.test.ts \
  server/routes/__tests__/workflows-di-contract.test.ts \
  server/routes/__tests__/users-di-contract.test.ts \
  server/routes/__tests__/admin-workflows-di-contract.test.ts \
  server/routes/__tests__/external-api-logs-di-contract.test.ts
```

预期：所有契约测试通过。

- [x] **步骤 3：运行构建**

运行：`npm run build`

预期：命令退出码为 0；既有 `zh.json` 动静态导入分包告警单独记录，不在本轮处理。

---

## 任务 4：原子提交

- [ ] **步骤 1：提交设计和计划**

```bash
GIT_MASTER=1 git add docs/superpowers/specs/2026-07-14-service-registration-module-design.md docs/superpowers/plans/2026-07-14-service-registration-module.md
GIT_MASTER=1 git commit -m "docs(architecture): 规划服务注册模块化边界" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 2：提交 token 模块与类型契约**

```bash
GIT_MASTER=1 git add server/service-registration/tokens.ts server/service-registration/__tests__/tokens.test.ts server/container.types.ts
GIT_MASTER=1 git commit -m "refactor(container): 分离服务注册 token 契约" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 3：提交注册器、getter 与兼容门面**

```bash
GIT_MASTER=1 git add server/service-registration.ts server/service-registration/service-registrations.ts server/service-registration/service-getters.ts server/service-registration/__tests__/composition-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(server): 拆分服务注册编排与解析门面" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 4：提交后检查**

运行：`GIT_MASTER=1 git status --short`。

预期：无输出。
