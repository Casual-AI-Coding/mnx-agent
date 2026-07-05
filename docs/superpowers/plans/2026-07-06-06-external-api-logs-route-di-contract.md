# External API Logs 路由 DI 契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 `server/routes/external-api-logs.ts` 中对 `ExternalApiLogRepository` 的直接构造，让外部 API 日志写入路径通过容器解析仓储依赖。

**Architecture:** 将 `ExternalApiLogRepository` 纳入现有轻量 DI 容器 token 契约，路由只依赖 `getExternalApiLogRepository()` getter。保留查询端现有 `DatabaseService` façade 调用，避免本切片扩大到数据库 façade 拆分。

**Tech Stack:** Express、TypeScript strict、Vitest、现有 `Container`/`TOKENS` 服务注册机制。

---

## 文件结构

- Modify: `server/service-registration.ts`，新增 `EXTERNAL_API_LOG_REPOSITORY` token、注册逻辑和 getter。
- Modify: `server/container.types.ts`，把 token 映射到 `ExternalApiLogRepository`，保持类型化 `resolve()` 覆盖真实注册源。
- Modify: `server/routes/external-api-logs.ts`，删除 `ExternalApiLogRepository` 与 `getConnection()` 路由层直接构造，改用容器 getter。
- Modify: `server/__tests__/container-types.test.ts`，增加仓储 token 类型解析断言。
- Create: `server/routes/__tests__/external-api-logs-di-contract.test.ts`，锁定路由源码不再直接 `new ExternalApiLogRepository`。

## Task 1: RED 契约测试

**Files:**
- Create: `server/routes/__tests__/external-api-logs-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

describe('external api logs route DI contract', () => {
  it('uses the container registered external api log repository', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const routePath = resolve(currentDir, '../external-api-logs.ts')
    const source = readFileSync(routePath, 'utf8')

    expect(source).toContain('getExternalApiLogRepository')
    expect(source).not.toContain('new ExternalApiLogRepository')
    expect(source).not.toContain('../repositories/external-api-log.repository')
  })
})
```

- [ ] **Step 2: 运行 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/external-api-logs-di-contract.test.ts`

Expected: FAIL，旧路由源码不包含 `getExternalApiLogRepository`，且包含 `new ExternalApiLogRepository`。

## Task 2: 容器注册和类型映射

**Files:**
- Modify: `server/service-registration.ts`
- Modify: `server/container.types.ts`
- Modify: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 注册 repository token**

在 `server/service-registration.ts` 导入 `ExternalApiLogRepository`，新增 token：

```typescript
EXTERNAL_API_LOG_REPOSITORY: 'externalApiLogRepository',
```

在 `registerServices()` 中注册：

```typescript
container.registerSingleton(TOKENS.EXTERNAL_API_LOG_REPOSITORY, (c) => {
  return new ExternalApiLogRepository(c.resolve<DatabaseService>(TOKENS.DATABASE).getConnection())
})
```

导出 getter：

```typescript
export function getExternalApiLogRepository(): ExternalApiLogRepository {
  return getGlobalContainer().resolve<ExternalApiLogRepository>(TOKENS.EXTERNAL_API_LOG_REPOSITORY)
}
```

- [ ] **Step 2: 收紧类型映射**

在 `server/container.types.ts` 导入 `ExternalApiLogRepository`，并加入：

```typescript
readonly [TOKENS.EXTERNAL_API_LOG_REPOSITORY]: ExternalApiLogRepository
```

- [ ] **Step 3: 扩展容器类型测试**

在 `server/__tests__/container-types.test.ts` 构造并注册仓储：

```typescript
const externalApiLogRepository = new ExternalApiLogRepository(fakeConnection)
container.register(TOKENS.EXTERNAL_API_LOG_REPOSITORY, externalApiLogRepository)
const resolvedExternalApiLogRepository: ExternalApiLogRepository = resolve(container, TOKENS.EXTERNAL_API_LOG_REPOSITORY)
expect(resolvedExternalApiLogRepository).toBe(externalApiLogRepository)
```

## Task 3: 路由改为容器解析

**Files:**
- Modify: `server/routes/external-api-logs.ts`

- [ ] **Step 1: 替换直接构造**

删除 `ExternalApiLogRepository` 导入，将 `getDatabaseService` 导入扩展为：

```typescript
import { getDatabaseService, getExternalApiLogRepository } from '../service-registration.js'
```

在 POST/PATCH handler 中用：

```typescript
const repository = getExternalApiLogRepository()
```

删除 handler 内仅用于构造仓储的 `const db = getDatabaseService()`。

## Task 4: 验证与提交

**Files:**
- Verify: `server/routes/external-api-logs.ts`
- Verify: `server/service-registration.ts`
- Verify: `server/container.types.ts`
- Verify: `server/__tests__/container-types.test.ts`
- Verify: `server/routes/__tests__/external-api-logs-di-contract.test.ts`

- [ ] **Step 1: LSP 验证**

Run diagnostics on all changed TypeScript files.

Expected: No diagnostics found.

- [ ] **Step 2: 测试验证**

Run: `rtk npm run test:server -- server/routes/__tests__/external-api-logs-di-contract.test.ts server/routes/__tests__/external-api-logs.test.ts server/__tests__/container-types.test.ts`

Expected: all selected test files pass.

- [ ] **Step 3: 构建验证**

Run: `rtk npm run build`

Expected: build succeeds. Existing Vite locale warning may remain.

- [ ] **Step 4: 原子提交**

Commit plan doc separately, then commit implementation and tests together using repository semantic Chinese style.
