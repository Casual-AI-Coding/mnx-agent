# Auth 路由 DI 契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 `server/routes/auth.ts` 中 6 处 `new UserService(conn)`，让认证路由通过容器解析用户服务依赖。

**Architecture:** 将 `UserService` 纳入现有 DI 容器 token 契约，认证路由只依赖 `getUserService()`。静态 token 校验方法仍保留 `UserService.verifyRefreshToken()`，因为它不依赖数据库连接，不属于本切片的直接构造问题。

**Tech Stack:** Express、TypeScript strict、Vitest、现有 `Container`/`TOKENS` 服务注册机制。

---

## 文件结构

- Modify: `server/service-registration.ts`，新增 `USER_SERVICE` token、注册逻辑和 getter。
- Modify: `server/container.types.ts`，把 `USER_SERVICE` 映射到 `UserService`。
- Modify: `server/routes/auth.ts`，删除 `getConnection` 和生产 `UserService` 直接构造，改用 `getUserService()`。
- Modify: `server/__tests__/container-types.test.ts`，增加用户服务 token 类型解析断言。
- Create: `server/routes/__tests__/auth-di-contract.test.ts`，锁定 auth 路由源码不再直接构造 `UserService`。

## Task 1: RED 契约测试

**Files:**
- Create: `server/routes/__tests__/auth-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('auth route DI contract', () => {
  it('uses the container registered user service', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const routePath = resolve(currentDir, '../auth.ts')
    const source = readFileSync(routePath, 'utf8')

    expect(source).toContain('getUserService')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../database/connection')
  })
})
```

- [ ] **Step 2: 运行 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/auth-di-contract.test.ts`

Expected: FAIL，旧路由源码不包含 `getUserService`，并包含 `new UserService` 与 `../database/connection`。

## Task 2: 容器注册和类型映射

**Files:**
- Modify: `server/service-registration.ts`
- Modify: `server/container.types.ts`
- Modify: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 注册用户服务 token**

在 `server/service-registration.ts` 导入 `UserService`，新增 token：

```typescript
USER_SERVICE: 'userService',
```

在 `registerServices()` 中注册：

```typescript
container.registerSingleton(TOKENS.USER_SERVICE, (c) => {
  return new UserService(c.resolve<DatabaseService>(TOKENS.DATABASE).getConnection())
})
```

导出 getter：

```typescript
export function getUserService(): UserService {
  return getGlobalContainer().resolve<UserService>(TOKENS.USER_SERVICE)
}
```

- [ ] **Step 2: 收紧类型映射**

在 `server/container.types.ts` 导入 `UserService` 并加入：

```typescript
readonly [TOKENS.USER_SERVICE]: UserService
```

- [ ] **Step 3: 扩展容器类型测试**

在 `server/__tests__/container-types.test.ts` 注册并解析：

```typescript
const userService = new UserService(fakeConnection)
container.register(TOKENS.USER_SERVICE, userService)
const resolvedUserService: UserService = resolve(container, TOKENS.USER_SERVICE)
expect(resolvedUserService).toBe(userService)
```

## Task 3: auth 路由改为容器解析

**Files:**
- Modify: `server/routes/auth.ts`

- [ ] **Step 1: 替换直接构造**

删除 `getConnection` 导入；保留 `UserService` 导入用于静态 `verifyRefreshToken()`；新增：

```typescript
import { getUserService } from '../service-registration.js'
```

将每个 `const conn = getConnection(); const userService = new UserService(conn)` 替换为：

```typescript
const userService = getUserService()
```

## Task 4: 验证与提交

**Files:**
- Verify: `server/routes/auth.ts`
- Verify: `server/service-registration.ts`
- Verify: `server/container.types.ts`
- Verify: `server/__tests__/container-types.test.ts`
- Verify: `server/routes/__tests__/auth-di-contract.test.ts`

- [ ] **Step 1: LSP 验证**

Run diagnostics on all changed TypeScript files.

Expected: No diagnostics found.

- [ ] **Step 2: 测试验证**

Run: `rtk npm run test:server -- server/routes/__tests__/auth-di-contract.test.ts server/routes/__tests__/auth.test.ts server/__tests__/container-types.test.ts`

Expected: all selected test files pass.

- [ ] **Step 3: 构建验证**

Run: `rtk npm run build`

Expected: build succeeds. Existing Vite locale warning may remain.

- [ ] **Step 4: 原子提交**

Commit plan doc separately, then commit implementation and tests together using repository semantic Chinese style.
