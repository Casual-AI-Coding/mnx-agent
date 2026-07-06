# External Proxy Route DI Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project explicitly forbids sub-agent implementation for this Ultrawork session, so execute inline in the current session.

**Goal:** 消除 `server/routes/external-proxy.ts` 中剩余的直接仓储构造，让外部代理路由通过容器解析日志仓储和媒体仓储。

**Architecture:** 复用第六阶段已经建立的 `EXTERNAL_API_LOG_REPOSITORY` token，并新增 `MEDIA_REPOSITORY` token 作为路由层保存媒体记录的窄依赖。`external-proxy` 路由只获取容器 getter，不再导入数据库连接或仓储实现。

**Tech Stack:** Express、TypeScript、Vitest、现有轻量 DI 容器、PostgreSQL repository。

---

## Files

- Modify: `server/service-registration.ts`
  - 新增 `TOKENS.MEDIA_REPOSITORY`
  - 注册 `MediaRepository` singleton
  - 导出 `getMediaRepository()` getter
- Modify: `server/container.types.ts`
  - 将 `TOKENS.MEDIA_REPOSITORY` 映射到 `MediaRepository`
- Modify: `server/__tests__/container-types.test.ts`
  - 增加 `MediaRepository` 的类型化解析覆盖
- Modify: `server/routes/external-proxy.ts`
  - 删除 `ExternalApiLogRepository`、`MediaRepository`、`getConnection` 运行时导入
  - 使用 `getExternalApiLogRepository()` 和 `getMediaRepository()`
- Create: `server/routes/__tests__/external-proxy-di-contract.test.ts`
  - 锁定路由不得直接构造仓储或直接获取数据库连接

---

## Task 1: RED 契约测试

**Files:**
- Create: `server/routes/__tests__/external-proxy-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('external proxy route DI contract', () => {
  it('uses container getters instead of constructing repositories directly', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/external-proxy.ts'), 'utf8')

    expect(source).toContain('getExternalApiLogRepository')
    expect(source).toContain('getMediaRepository')
    expect(source).not.toContain('new ExternalApiLogRepository')
    expect(source).not.toContain('new MediaRepository')
    expect(source).not.toContain('../repositories/external-api-log.repository')
    expect(source).not.toContain('../repositories/media-repository')
    expect(source).not.toContain('../database/connection')
  })
})
```

- [ ] **Step 2: 运行 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/external-proxy-di-contract.test.ts`

Expected: FAIL，旧实现不包含 `getExternalApiLogRepository`/`getMediaRepository`，且包含 `new ExternalApiLogRepository`、`new MediaRepository`、`../database/connection`。

---

## Task 2: 容器注册媒体仓储

**Files:**
- Modify: `server/service-registration.ts`
- Modify: `server/container.types.ts`
- Modify: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 在 service registration 中注册 token**

在 `TOKENS` 中加入：

```typescript
MEDIA_REPOSITORY: 'mediaRepository',
```

在 `registerServices()` 中加入：

```typescript
container.registerSingleton(TOKENS.MEDIA_REPOSITORY, (c) => {
  return new MediaRepository(c.resolve<DatabaseService>(TOKENS.DATABASE).getConnection())
})
```

导出 getter：

```typescript
export function getMediaRepository(): MediaRepository {
  return getGlobalContainer().resolve<MediaRepository>(TOKENS.MEDIA_REPOSITORY)
}
```

- [ ] **Step 2: 扩展类型映射**

在 `server/container.types.ts` 中导入并映射：

```typescript
import type { MediaRepository } from './repositories/media-repository.js'
```

```typescript
readonly [TOKENS.MEDIA_REPOSITORY]: MediaRepository
```

- [ ] **Step 3: 扩展容器类型测试**

在 `server/__tests__/container-types.test.ts` 中构造并注册：

```typescript
const mediaRepository = new MediaRepository(fakeConnection)
container.register(TOKENS.MEDIA_REPOSITORY, mediaRepository)
const resolvedMediaRepository: MediaRepository = resolve(container, TOKENS.MEDIA_REPOSITORY)
expect(resolvedMediaRepository).toBe(mediaRepository)
```

---

## Task 3: external-proxy 路由改为容器解析

**Files:**
- Modify: `server/routes/external-proxy.ts`

- [ ] **Step 1: 替换 imports**

从：

```typescript
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository'
import { MediaRepository } from '../repositories/media-repository'
import { getConnection } from '../database/connection'
import { getDatabaseService } from '../service-registration.js'
```

改为：

```typescript
import {
  getDatabaseService,
  getExternalApiLogRepository,
  getMediaRepository,
} from '../service-registration.js'
```

- [ ] **Step 2: 替换日志仓储解析**

将 `/submit`、`/status/:taskId` 和 `executeAsyncTask()` 中的：

```typescript
const conn = await getConnection()
const repo = new ExternalApiLogRepository(conn)
```

改为：

```typescript
const repo = getExternalApiLogRepository()
```

- [ ] **Step 3: 替换媒体仓储解析**

将：

```typescript
const mediaRepo = new MediaRepository(conn)
```

改为：

```typescript
const mediaRepo = getMediaRepository()
```

---

## Task 4: 验证

**Files:**
- Verify: all modified TS files

- [ ] **Step 1: LSP diagnostics**

Run diagnostics on:

```text
server/service-registration.ts
server/container.types.ts
server/__tests__/container-types.test.ts
server/routes/external-proxy.ts
server/routes/__tests__/external-proxy-di-contract.test.ts
```

Expected: No diagnostics found.

- [ ] **Step 2: 相关测试**

Run:

```bash
rtk npm run test:server -- server/routes/__tests__/external-proxy-di-contract.test.ts server/routes/__tests__/external-proxy.test.ts server/routes/__tests__/external-proxy-media-save-helpers.test.ts server/__tests__/container-types.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Build**

Run:

```bash
rtk npm run build
```

Expected: build succeeds. Existing Vite locale import warning may remain.

- [ ] **Step 4: Escape hatch scan**

Run grep over changed TS files for:

```text
new ExternalApiLogRepository|new MediaRepository|../database/connection|as any|\bany\b|@ts-ignore|@ts-expect-error|!\.|!\)|!;
```

Expected: production route has no direct construction or database connection import. Contract test may contain forbidden strings inside assertions.

---

## Commit Plan

1. `docs(architecture): 记录 external-proxy 路由 DI 计划`
   - `docs/superpowers/plans/2026-07-06-11-external-proxy-route-di-contract.md`
2. `refactor(external-proxy): 通过容器解析代理仓储`
   - `server/service-registration.ts`
   - `server/container.types.ts`
   - `server/__tests__/container-types.test.ts`
   - `server/routes/external-proxy.ts`
   - `server/routes/__tests__/external-proxy-di-contract.test.ts`

---

## Self Review

- Spec coverage: 覆盖日志仓储三处直接构造、媒体仓储一处直接构造、容器 token 映射和测试验证。
- Placeholder scan: 无占位符。
- Scope check: 不改外部代理业务行为，不拆大路由，不修改请求/响应契约。
- Type safety: 新增 `MEDIA_REPOSITORY` 映射，容器类型测试要求 `resolve(container, TOKENS.MEDIA_REPOSITORY)` 返回 `MediaRepository`。
