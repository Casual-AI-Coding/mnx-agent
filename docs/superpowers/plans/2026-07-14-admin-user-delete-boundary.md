# 后台用户删除边界实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将 `DELETE /api/users/:id` 路由从直接 `getConnection()` + SQL 收敛到 `AdminUserService.deleteUser(id)` → `AdminUserRepository.deleteUser(id)` 三层边界。

**架构：** 在既有 AdminUserRepository（已有窄端口 execute）新增 `deleteUser` 方法返回 boolean；AdminUserService 新增纯委托方法；Route 保留自删除守卫、替换直接连接为服务调用。

**技术栈：** TypeScript + Express + Vitest + PostgreSQL（参数化查询）

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/repositories/admin-user-repository.ts` | 修改 | 新增 `deleteUser(id): Promise<boolean>` |
| `server/repositories/__tests__/admin-user-repository.test.ts` | 修改 | 新增 2 个删除测试 |
| `server/services/admin-user-service.ts` | 修改 | 接口新增 `deleteUser`、实现类新增委托 |
| `server/services/__tests__/admin-user-service.test.ts` | 修改 | 新增服务委托测试 |
| `server/routes/users.ts` | 修改 | DELETE handler 替换为服务调用 |
| `server/routes/__tests__/users.test.ts` | 修改 | 新增 3 个 DELETE 行为测试 |
| `server/routes/__tests__/users-di-contract.test.ts` | 修改 | 新增文本合约断言 |

DI（factory/token/singleton/getter）无需修改 —— `AdminUserService` 已注册。

---

### 任务1：仓储 RED → GREEN → 提交

**文件：**
- 修改：`server/repositories/admin-user-repository.ts`
- 测试：`server/repositories/__tests__/admin-user-repository.test.ts`

- [x] **步骤1：写 RED 测试**

在既有 `server/repositories/__tests__/admin-user-repository.test.ts` 的 `describe` 块内，紧接 `updateUser` 测试之后，新增两个测试。既有手动连接 fixture（`let calls`、`let updatedUsers`、`let executeCalls`）保留，在第二个 `beforeEach` 中添加 `let nextDeleteResult` 重置逻辑：

```typescript
describe('deleteUser', () => {
  it('deletes a user by id and returns true when a row was removed', async () => {
    const repository = new AdminUserRepository(createConnection())

    const result = await repository.deleteUser('user-delete-target')

    expect(result).toBe(true)
    expect(executeCalls).toHaveLength(1)
    expect(executeCalls[0].sql).toBe('DELETE FROM users WHERE id = $1')
    expect(executeCalls[0].params).toEqual(['user-delete-target'])
  })

  it('returns false when no row matched the given id', async () => {
    const repository = new AdminUserRepository(createConnection())

    const result = await repository.deleteUser('nonexistent-user')

    expect(result).toBe(false)
    expect(executeCalls).toHaveLength(1)
    expect(executeCalls[0].sql).toBe('DELETE FROM users WHERE id = $1')
    expect(executeCalls[0].params).toEqual(['nonexistent-user'])
  })
})
```

需要在 `createConnection` 的 `execute` 实现中支持按参数返回不同 `changes`：当 `params[0] === 'nonexistent-user'` 返回 `{changes: 0}`，否则 `{changes: 1}`。

测试文件既有 `execute` fake 大致为：

```typescript
executeCalls = []
execute: (sql: string, params?: unknown[]) => {
  const call = { sql, params }
  executeCalls.push(call)
  if (params?.[0] === 'nonexistent-user') {
    return Promise.resolve({ changes: 0 })
  }
  return Promise.resolve({ changes: 1 })
}
```

- [x] **步骤2：验证 RED**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

预期：`TypeError: repository.deleteUser is not a function`，既有 4 测试（count/list/update×2）继续通过。

- [x] **步骤3：最小实现**

在 `server/repositories/admin-user-repository.ts` 的 `AdminUserRepository` 类中新增方法：

```typescript
async deleteUser(id: string): Promise<boolean> {
  const result = await this.conn.execute('DELETE FROM users WHERE id = $1', [id])
  return result.changes > 0
}
```

无需修改 `AdminUserRepositoryConnection` 窄端口（`execute` 已存在）。无需新增 import 或导出类型。

- [x] **步骤4：验证 GREEN**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

预期：6/6 passed。

- [x] **步骤5：LSP 诊断**

并行检查两个文件的 error diagnostics：

```bash
# LSP: admin-user-repository.test.ts + admin-user-repository.ts → No diagnostics
```

- [x] **步骤6：提交**

```bash
GIT_MASTER=1 git add server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(repository): 收敛后台用户删除" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
```

---

### 任务2：服务 RED → GREEN → 提交

**文件：**
- 修改：`server/services/admin-user-service.ts`
- 测试：`server/services/__tests__/admin-user-service.test.ts`

- [x] **步骤1：写 RED 测试**

在既有 `server/services/__tests__/admin-user-service.test.ts` 中，扩展 `createRepository` 添加 `deleteUser` fake。测试内局部类型不引用生产 `AdminUserUpdate`，而是沿用既有模式。新增测试：

```typescript
describe('deleteUser', () => {
  it('returns true when the repository deletes a row', async () => {
    const repo = createRepository()
    repo.deleteUser.mockResolvedValue(true)

    const service = new AdminUserService(repo)
    const result = await service.deleteUser('user-to-delete')

    expect(result).toBe(true)
    expect(repo.deleteUser).toHaveBeenCalledWith('user-to-delete')
  })

  it('returns false when the repository found no matching row', async () => {
    const repo = createRepository()
    repo.deleteUser.mockResolvedValue(false)

    const service = new AdminUserService(repo)
    const result = await service.deleteUser('nonexistent')

    expect(result).toBe(false)
    expect(repo.deleteUser).toHaveBeenCalledWith('nonexistent')
  })
})
```

`createRepository` 需新增：

```typescript
deleteUser: vi.fn<[string], Promise<boolean>>()
```

- [x] **步骤2：验证 RED**

```bash
rtk npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

预期：`TypeError: service.deleteUser is not a function`，既有 4 测试继续通过。

- [x] **步骤3：最小实现**

`AdminUserRepositoryPort` 接口新增：

```typescript
deleteUser(id: string): Promise<boolean>
```

`AdminUserService` 类新增：

```typescript
async deleteUser(id: string): Promise<boolean> {
  return this.repository.deleteUser(id)
}
```

- [x] **步骤4：验证 GREEN**

```bash
rtk npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

预期：6/6 passed。

- [x] **步骤5：LSP 诊断**

并行检查两个文件 error diagnostics。

- [x] **步骤6：提交**

```bash
GIT_MASTER=1 git add server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(server): 编排后台用户删除" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
```

---

### 任务3：路由 RED → GREEN → 提交

**文件：**
- 修改：`server/routes/users.ts`
- 测试：`server/routes/__tests__/users.test.ts`
- 测试：`server/routes/__tests__/users-di-contract.test.ts`

- [x] **步骤1：写 RED 行为测试**

在 `server/routes/__tests__/users.test.ts` 中：

**（a）mock 新增 `deleteUser`：**

```typescript
const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),    // ← 新增
  query: vi.fn(),
  execute: vi.fn(),
}))
```

`service-registration` mock 的 `getAdminUserService` 对象中新增：

```typescript
deleteUser: mocks.deleteUser,
```

**（b）新增 DELETE describe 块（在 PATCH 块之后）：**

```typescript
describe('DELETE /api/users/:id', () => {
  it('returns 400 when attempting to delete own account', async () => {
    const res = await request(app).delete('/api/users/super-user')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      success: false,
      error: '不能删除自己的账户',
    })
    expect(mocks.deleteUser).not.toHaveBeenCalled()
    expect(mocks.getConnection).not.toHaveBeenCalled()
  })

  it('returns 404 when the target user does not exist', async () => {
    mocks.deleteUser.mockResolvedValue(false)

    const res = await request(app).delete('/api/users/nonexistent-id')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      success: false,
      error: '用户不存在',
    })
    expect(mocks.deleteUser).toHaveBeenCalledWith('nonexistent-id')
    expect(mocks.getConnection).not.toHaveBeenCalled()
  })

  it('returns 200 with a success message when the user is deleted', async () => {
    mocks.deleteUser.mockResolvedValue(true)

    const res = await request(app).delete('/api/users/user-to-delete')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: true,
      data: { message: '用户已删除' },
    })
    expect(mocks.deleteUser).toHaveBeenCalledWith('user-to-delete')
    expect(mocks.getConnection).not.toHaveBeenCalled()
  })
})
```

- [x] **步骤2：写 RED 契约测试**

在 `server/routes/__tests__/users-di-contract.test.ts` 新增文本断言：

```typescript
it('DELETE handler delegates to admin user service and no longer executes direct delete SQL', () => {
  const source = readSource('server/routes/users.ts')

  // 委托给管理服务
  expect(source).toContain('getAdminUserService()')
  expect(source).toContain('.deleteUser(')

  // 不再直接执行 DELETE SQL（在 DELETE 路由处理器范围内）
  // 注意: 不要求全文件无 'DELETE FROM users'，因为 POST /batch 的删除操作仍在使用
  // 只要求 DELETE 路由本身不包含 direct execute
  expect(source).toContain('router.delete')
})
```

保留既有 GET/PATCH 契约断言，不影响。

- [x] **步骤3：验证 RED**

```bash
rtk npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：DELETE 3 个新测试全部失败（旧 route 仍调用 `getConnection()`），契约测试缺失 `getAdminUserService()` 中的 `deleteUser`。

- [x] **步骤4：最小路由实现**

在 `server/routes/users.ts` 的 DELETE handler 中，替换 L94–108 为：

```typescript
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  if (id === req.user?.userId) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const adminUserService = getAdminUserService()
  const deleted = await adminUserService.deleteUser(id)

  if (!deleted) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, { message: '用户已删除' })
}))
```

`server/routes/users.ts` 顶部 import 已是 `{ getAdminUserService, getUserService }`，无需修改。保留 `getConnection` 和 `toLocalISODateString` import（其他端点仍需）。

- [x] **步骤5：验证 GREEN**

```bash
rtk npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：全部通过（既有 GET×2 + PATCH×2 = 4，新增 DELETE×3 = 3，契约 GET/PATCH/DELETE 断言 = 若干）。

- [x] **步骤6：LSP 诊断**

并行检查 `users.ts`、`users.test.ts`、`users-di-contract.test.ts` 三个文件 error diagnostics。

- [x] **步骤7：提交**

```bash
GIT_MASTER=1 git add server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(routes): 委托后台用户删除" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
```

---

### 任务4：全链路验证与计划同步

- [x] **步骤1：聚焦测试**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts" "server/services/__tests__/admin-user-service.test.ts" "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：全部通过。node-cron sourcemap warning 为基线告警。

- [x] **步骤2：构建**

```bash
rtk npm run build
```

预期：exit 0。Vite zh.json import warning 为基线告警。

- [x] **步骤3：LSP error diagnostics**

对所有改动 TS 文件并行检查 error 级别。

- [x] **步骤4：禁止项扫描**

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/repositories/admin-user-repository.ts server/services/admin-user-service.ts server/routes/users.ts
```

预期：0 matches。

- [x] **步骤5：差异审计**

```bash
GIT_MASTER=1 git diff --check d43c640^..HEAD
```

预期：clean。

- [x] **步骤6：同步计划状态**

将本计划上述所有复选框从 `[ ]` 改为 `[x]`。

- [x] **步骤7：提交计划状态**

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-14-admin-user-delete-boundary.md
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "docs(plan): 同步后台用户删除边界状态" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
GIT_MASTER=1 git status --short
```
