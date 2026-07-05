# Admin Workflows 路由 DI 契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本仓库当前用户约束禁止 sub agent，因此本计划在当前 session 内按 TDD 顺序执行。

**Goal:** 消除 `server/routes/admin/workflows.ts` 中对 `UserService` 的直接构造，让管理员 workflow 权限路由通过既有容器 getter 解析用户服务。

**Architecture:** 复用第七阶段已建立的 `TOKENS.USER_SERVICE` 与 `getUserService()`。本切片只替换管理员 workflow 授权路径中的用户查询依赖，不改 `DatabaseService` façade、不改权限 API 行为、不改数据库访问方法。

**Tech Stack:** Express + TypeScript + Vitest + 现有轻量 DI Container。

---

## 文件结构

- Modify: `server/routes/admin/workflows.ts`
  - 删除 `UserService` 和 `getConnection` 直接依赖。
  - 引入 `getUserService()`。
  - `POST /:id/grant` 中通过容器 getter 获取用户服务。
- Create: `server/routes/__tests__/admin-workflows-di-contract.test.ts`
  - 源码契约测试，防止管理员 workflow 路由再次直接 `new UserService` 或导入数据库连接。

## 边界

- 不修改 API path、请求体、响应格式、状态码或权限规则。
- 不拆分 `DatabaseService` façade，本轮只处理路由层直接构造依赖。
- 不新增容器 token，因为 `USER_SERVICE` 已存在。
- 不改 `requireRole(['super'])` 或 workflow permission 写入逻辑。

## Task 1: 写 RED 契约测试

**Files:**
- Create: `server/routes/__tests__/admin-workflows-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin workflows route DI contract', () => {
  it('resolves UserService through service registration instead of constructing it in the route', () => {
    const source = readFileSync('server/routes/admin/workflows.ts', 'utf8')

    expect(source).toContain('getUserService')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../../database/connection')
    expect(source).not.toContain('import { UserService }')
  })
})
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/admin-workflows-di-contract.test.ts`

Expected: FAIL，旧实现不包含 `getUserService`，且仍有 `new UserService` / `../../database/connection` / 运行时 `UserService` 导入。

## Task 2: 最小改造管理员 workflow 路由

**Files:**
- Modify: `server/routes/admin/workflows.ts`
- Test: `server/routes/__tests__/admin-workflows-di-contract.test.ts`

- [ ] **Step 1: 替换导入**

```typescript
import { getDatabaseService, getUserService } from '../../service-registration.js'
```

删除：

```typescript
import { UserService } from '../../services/user-service'
import { getConnection } from '../../database/connection'
```

- [ ] **Step 2: 替换直接构造**

```typescript
const userService = getUserService()
const user = await userService.getUserById(userId)
```

删除：

```typescript
const conn = getConnection()
const userService = new UserService(conn)
```

- [ ] **Step 3: 运行目标测试**

Run: `rtk npm run test:server -- server/routes/__tests__/admin-workflows-di-contract.test.ts`

Expected: PASS。

- [ ] **Step 4: 运行相关回归**

Run: `rtk npm run test:server -- server/routes/__tests__/admin-workflows-di-contract.test.ts server/routes/__tests__/users-di-contract.test.ts server/routes/__tests__/auth-di-contract.test.ts server/__tests__/container-types.test.ts`

Expected: PASS，允许既有 node-cron sourcemap warning。

- [ ] **Step 5: 类型与构建验证**

Run: `lsp_diagnostics` on changed TS files。

Run: `rtk npm run build`

Expected: LSP 无诊断，build 成功；允许既有 `src/i18n/locales/zh.json` Vite warning。

## Task 3: 提交

**Files:**
- Commit 1: `docs/superpowers/plans/2026-07-06-09-admin-workflows-route-di-contract.md`
- Commit 2: `server/routes/admin/workflows.ts`, `server/routes/__tests__/admin-workflows-di-contract.test.ts`

- [ ] **Step 1: 提交计划文档**

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-06-09-admin-workflows-route-di-contract.md
GIT_MASTER=1 git commit -m "docs(architecture): 记录 admin workflows 路由 DI 计划" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **Step 2: 提交实现与测试**

```bash
GIT_MASTER=1 git add server/routes/admin/workflows.ts server/routes/__tests__/admin-workflows-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(admin): 通过容器解析 workflow 用户服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

## 自审

- 计划无占位符。
- RED 测试先锁定旧实现中的直接构造问题。
- GREEN 仅改依赖获取方式，不改业务行为。
- 测试与实现同提交，计划文档单独提交。
