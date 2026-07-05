# Users 路由 DI 契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本轮受用户约束禁止 sub agent，必须在当前 session 内按步骤执行。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 `server/routes/users.ts` 中对 `UserService` 的直接构造，让用户管理路由通过既有容器 getter 解析用户服务。

**Architecture:** 复用第七阶段已建立的 `TOKENS.USER_SERVICE` 与 `getUserService()`。本切片只改创建/更新用户后的服务回读路径，列表、批量、删除、重置密码等现有 SQL 路径保持不变，避免扩大行为面。

**Tech Stack:** Express、TypeScript strict、Zod、Vitest、现有轻量 DI 容器。

---

## 文件结构

- Modify: `server/routes/users.ts`
  - 删除 `UserService` 的生产导入。
  - 引入 `getUserService()`。
  - 将 POST/PATCH 中的 `new UserService(conn)` 改为容器解析。
  - 顺手清理当前文件已暴露的 Zod v4 deprecation 和 unused type hint，不改变 API 行为。
- Modify: `server/routes/__tests__/users.test.ts`
  - 将旧的 `UserService` class mock 改为 `service-registration` getter mock。
  - 保持现有 GET/PATCH 行为断言。
- Create: `server/routes/__tests__/users-di-contract.test.ts`
  - 用源码契约测试锁定 users 路由不得再直接导入/构造 `UserService`。

---

### Task 1: 写 RED 契约测试

**Files:**
- Create: `server/routes/__tests__/users-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('users route dependency contract', () => {
  it('resolves UserService through the service container', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/users.ts'), 'utf8')

    expect(source).toContain('getUserService')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../services/user-service')
  })
})
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/users-di-contract.test.ts`

Expected: FAIL，因为旧实现仍导入 `../services/user-service.js` 并包含 `new UserService(conn)`。

---

### Task 2: 最小实现 users 路由 DI 解耦

**Files:**
- Modify: `server/routes/users.ts`
- Modify: `server/routes/__tests__/users.test.ts`

- [ ] **Step 1: 改造生产路由**

`server/routes/users.ts` 的目标形态：

```typescript
import { getUserService } from '../service-registration.js'
```

POST/PATCH 中使用：

```typescript
const userService = getUserService()
const user = await userService.getUserById(id)
```

不得保留：

```typescript
import { UserService } from '../services/user-service.js'
const userService = new UserService(conn)
```

- [ ] **Step 2: 更新 users 路由测试 mock**

`server/routes/__tests__/users.test.ts` 的目标 mock：

```typescript
vi.mock('../../service-registration.js', () => ({
  getUserService: () => ({
    getUserById: mocks.getUserById,
  }),
}))
```

删除旧的：

```typescript
vi.mock('../../services/user-service.js', () => ({
  UserService: class MockUserService {
    getUserById = mocks.getUserById
  },
}))
```

- [ ] **Step 3: 运行 GREEN 测试**

Run: `rtk npm run test:server -- server/routes/__tests__/users-di-contract.test.ts server/routes/__tests__/users.test.ts`

Expected: PASS，契约测试和既有 users 路由行为测试均通过。

---

### Task 3: 回归验证与提交

**Files:**
- Modify: `server/routes/users.ts`
- Modify: `server/routes/__tests__/users.test.ts`
- Create: `server/routes/__tests__/users-di-contract.test.ts`

- [ ] **Step 1: LSP 验证**

Run diagnostics for:

```text
server/routes/users.ts
server/routes/__tests__/users.test.ts
server/routes/__tests__/users-di-contract.test.ts
```

Expected: No diagnostics found.

- [ ] **Step 2: 相关测试**

Run: `rtk npm run test:server -- server/routes/__tests__/users-di-contract.test.ts server/routes/__tests__/users.test.ts server/routes/__tests__/auth-di-contract.test.ts server/__tests__/container-types.test.ts`

Expected: PASS。`auth-di-contract` 与 `container-types` 作为 USER_SERVICE token 回归哨兵。

- [ ] **Step 3: 构建验证**

Run: `rtk npm run build`

Expected: PASS。若只出现既有 `src/i18n/locales/zh.json` 动静态导入 warning，不阻塞本切片。

- [ ] **Step 4: 提交**

按 git-master 流程拆分提交：

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-06-08-users-route-di-contract.md
GIT_MASTER=1 git commit -m "docs(architecture): 记录 users 路由 DI 计划" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"

GIT_MASTER=1 git add server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(users): 通过容器解析用户服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

## 自审

- 本计划只处理 `users.ts` 中两处 `UserService` 直接构造，不改用户管理 API 行为。
- `getConnection()` 仍保留给本路由现有 SQL 查询/更新路径，因本切片目标是消除服务直接构造，不同时拆 DatabaseService façade。
- 第七阶段已提供 `USER_SERVICE` token，本切片不新增容器 token，避免重复抽象。
- RED/GREEN 测试覆盖源码契约和现有 PATCH 行为，能防止路由重新直接 `new UserService`。
