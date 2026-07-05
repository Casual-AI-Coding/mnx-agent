# Media 路由日志仓储 DI 契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 `server/routes/media.ts` 中对 `ExternalApiLogRepository` 的直接构造，让媒体恢复相关路径通过既有容器 getter 解析日志仓储。

**Architecture:** 本阶段复用第六阶段已建立的 `TOKENS.EXTERNAL_API_LOG_REPOSITORY` 与 `getExternalApiLogRepository()`，只替换 media 路由中的日志查询依赖来源。`MediaService`、文件存储、恢复计划、`DatabaseService` 其它使用保持不变，避免扩大业务行为面。

**Tech Stack:** Express + TypeScript + Vitest + 既有轻量 DI 容器。

---

## 文件结构

- 修改：`server/routes/media.ts`
  - 删除运行时 `ExternalApiLogRepository` 与 `getConnection` 导入。
  - 在 `GET /recoverable` 与 `POST /recover/:logId` 中使用 `getExternalApiLogRepository()`。
- 新增：`server/routes/__tests__/media-di-contract.test.ts`
  - 用源码契约测试锁定 media 路由不再直接构造日志仓储。

## 边界

- 不改变任何 `/api/media` 路径、请求体、响应格式、状态码或鉴权逻辑。
- 不拆分 `server/routes/media.ts`，虽然文件较大，本阶段只做 DI 契约切片。
- 不修改 `ExternalApiLogRepository`、`MediaService`、媒体恢复领域服务或文件存储实现。
- 不新增容器 token，因为日志仓储 token 已存在。
- 不处理 `server/routes/external-proxy.ts`，留给下一阶段。

## Task 1: 写入 RED 契约测试

**Files:**
- Create: `server/routes/__tests__/media-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

describe('media route dependency contract', () => {
  it('resolves external API log repository through service registration', async () => {
    const source = await readFile(resolve(process.cwd(), 'server/routes/media.ts'), 'utf8')

    expect(source).toContain('getExternalApiLogRepository')
    expect(source).not.toContain('new ExternalApiLogRepository')
    expect(source).not.toContain('../repositories/external-api-log.repository')
    expect(source).not.toContain('../database/connection')
  })
})
```

- [ ] **Step 2: 验证 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/media-di-contract.test.ts`

Expected: FAIL，原因是旧 `server/routes/media.ts` 仍导入 `ExternalApiLogRepository`/`getConnection` 且直接 `new ExternalApiLogRepository(conn)`。

## Task 2: 改造 media 路由依赖解析

**Files:**
- Modify: `server/routes/media.ts`
- Test: `server/routes/__tests__/media-di-contract.test.ts`

- [ ] **Step 1: 最小实现**

在 `server/routes/media.ts` 中将：

```typescript
import { getMediaService } from '../service-registration.js'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import { getConnection } from '../database/connection.js'
```

改为：

```typescript
import { getExternalApiLogRepository, getMediaService } from '../service-registration.js'
```

将 `GET /recoverable` 中的：

```typescript
const conn = getConnection()
const logRepo = new ExternalApiLogRepository(conn)
```

改为：

```typescript
const logRepo = getExternalApiLogRepository()
```

将 `POST /recover/:logId` 中同样两行替换为 `const logRepo = getExternalApiLogRepository()`。

- [ ] **Step 2: 验证 GREEN**

Run: `rtk npm run test:server -- server/routes/__tests__/media-di-contract.test.ts server/routes/__tests__/media.test.ts server/__tests__/container-types.test.ts`

Expected: PASS。允许既有 node-cron sourcemap warning 或外部测试环境 warning，但不允许新增失败。

- [ ] **Step 3: 编译与诊断**

Run: `rtk npm run build`

Expected: PASS。允许既有 `src/i18n/locales/zh.json` Vite warning。

Run: `lsp_diagnostics` on `server/routes/media.ts` and `server/routes/__tests__/media-di-contract.test.ts`

Expected: No diagnostics found。

## Task 3: 提交

**Files:**
- Commit docs: `docs/superpowers/plans/2026-07-06-10-media-route-di-contract.md`
- Commit implementation: `server/routes/media.ts`, `server/routes/__tests__/media-di-contract.test.ts`

- [ ] **Step 1: 按 git-master 检测风格与拆分**

Run: `GIT_MASTER=1 git status --short --branch`

Expected: 仅有本阶段计划、media 路由、契约测试改动。

- [ ] **Step 2: 原子提交**

Commit 1: `docs(architecture): 记录 media 路由 DI 计划`

Commit 2: `refactor(media): 通过容器解析日志仓储`

两个提交都带 Sisyphus footer 与 co-author trailer。

## 自审

- 计划覆盖了 Oracle P0 中“路由层直接 new Repository/Service”的 media 子切片。
- 本阶段只替换依赖来源，不改变业务分支、SQL、响应格式或恢复流程。
- 测试先失败再实现，能在未来防止 `media.ts` 重新引入直接日志仓储构造。
- 没有占位符、未定义函数或跨阶段隐式依赖。
