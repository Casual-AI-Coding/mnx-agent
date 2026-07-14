# 后台用户密码重置边界 - 实施计划

> **Goal:** 将 `POST /api/users/:id/reset-password` 从 Route 直连数据库收敛为 Route → AdminUserService.resetPassword → AdminUserRepository。

**Architecture:** Repository 提供 `exists`（存在性检查）和 `updatePassword`（参数化 UPDATE）；Service 编排生成随机密码 + bcrypt 哈希 + 委托；Route 委托后删除 `bcrypt`/`crypto` import 和内联 `generateRandomPassword` 函数。

**Tech Stack:** Express + TypeScript + Vitest + bcrypt

---

## File Structure

| 文件 | 职责 | 变更 |
|------|------|------|
| `server/repositories/admin-user-repository.ts` | 数据访问 | 新增 `exists`、`updatePassword` |
| `server/repositories/__tests__/admin-user-repository.test.ts` | 仓储测试 | 新增 exists/updatePassword 测试 |
| `server/services/admin-user-service.ts` | 业务编排 | 新增 `resetPassword`，移入 `generateRandomPassword` |
| `server/services/__tests__/admin-user-service.test.ts` | 服务测试 | 新增 resetPassword 测试 |
| `server/routes/users.ts` | HTTP 路由 | 委托 service，移除 `bcrypt`/`crypto`/`generateRandomPassword` |
| `server/routes/__tests__/users.test.ts` | 路由测试 | 新增 reset-password 行为测试 |
| `server/routes/__tests__/users-di-contract.test.ts` | 契约测试 | 新增 resetPassword 委托 + 禁止 bcrypt/crypto/UPDATE SQL |

---

### Task 1: Repository RED → GREEN → Commit

**Files:**
- Modify: `server/repositories/__tests__/admin-user-repository.test.ts`
- Modify: `server/repositories/admin-user-repository.ts`

- [x] **Step 1: RED — 扩展测试**

在 `server/repositories/__tests__/admin-user-repository.test.ts` 末尾新增：

```typescript
describe('exists', () => {
  it('returns true when the user was found', async () => {
    const { connection, calls } = createConnectionFixture()
    const repository = new AdminUserRepository(connection)

    // exists() calls query with params → uses the params path, which returns countRows
    // Override: we need EXISTS to use a dedicated query path.
    // For now, exists() RED will fail with "not a function".
    await expect(repository.exists('existing-user')).resolves.toBe(true)
  })

  it('returns false when no matching row exists', async () => {
    const { connection, setCountRows } = createConnectionFixture()
    setCountRows([])
    const repository = new AdminUserRepository(connection)

    await expect(repository.exists('missing-user')).resolves.toBe(false)
  })
})

describe('updatePassword', () => {
  it('executes a parameterized password update and returns true when a row matched', async () => {
    const { connection, executeCalls, setNextDeleteChanges } = createConnectionFixture()
    setNextDeleteChanges(1)
    const repository = new AdminUserRepository(connection)

    await expect(repository.updatePassword('user-1', '$2b$12$hashed', '2026-07-14T10:00:00.000')).resolves.toBe(true)
    expect(executeCalls).toEqual([{
      sql: 'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      params: ['$2b$12$hashed', '2026-07-14T10:00:00.000', 'user-1'],
    }])
  })

  it('returns false when no row matched the given id', async () => {
    const { connection, setNextDeleteChanges } = createConnectionFixture()
    setNextDeleteChanges(0)
    const repository = new AdminUserRepository(connection)

    await expect(repository.updatePassword('ghost', 'hash', 'now')).resolves.toBe(false)
  })
})
```

对于 `exists`，需要用不同的 fixture 路径——当前 `query` fake 的无参数路径返回 `countRows`。将 `countRows` 默认设为 `[{ total: '1' }]` 可让 exists 检测到行。

**注意**: `createConnectionFixture` 的 `query` 路由在无参数时返回 `countRows`。`exists()` 将用 `SELECT id FROM users WHERE id = $1` 带参数，会命中 `sql.includes('WHERE id = $1')` 路径并先检查 `createdUser`，然后返回 `updatedUsers`。需要调整 fixture 以支持 exists 的独立查询路径。

- [x] **Step 2: 运行 RED**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

**Expected:** 4 new tests FAIL with `repository.exists is not a function` / `repository.updatePassword is not a function`；既有 8 tests 通过。

- [x] **Step 3: GREEN — 实现 `exists` 和 `updatePassword`**

```typescript
// AdminUserRepository 新增
async exists(id: string): Promise<boolean> {
  const rows = await this.conn.query('SELECT id FROM users WHERE id = $1', [id])
  return rows.length > 0
}

async updatePassword(id: string, passwordHash: string, now: string): Promise<boolean> {
  const result = await this.conn.execute(
    'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
    [passwordHash, now, id]
  )
  return result.changes > 0
}
```

**注意**: `exists` 的 query 返回类型需要与窄端口兼容。当前 `AdminUserListItem` 没有 `id` 字段的问题——实际上它有。但 SELECT id 不返回完整 AdminUserListItem。需要用泛型 `query<T>`或接受 `Record<string, unknown>[]`。现有 `conn.query` 重载返回 `AdminUserListItem[]`，但 SELECT id 只返回 `{id: string}[]`。需要在测试中调整。

实际方案：由于 `DatabaseConnection.query<T>` 使用泛型，窄端口 `conn.query(sql, params)` 返回 `AdminUserListItem[]` 但 SELECT id 不会返回完整类型。最简修复：将 `exists` 使用无参数 `query` 路径（把 SQL 改为无参数 `SELECT id FROM users`... 不对）。或者将 exists 实现为 `conn.query('SELECT id FROM users WHERE id = $1', [id])` 并接受返回类型为 `AdminUserListItem[]`（实际运行时 Postgres 返回 `{id: string}[]`，TypeScript 类型检查通过，因为 `AdminUserListItem` 是 `Record<string, unknown> & {...}`）。

测试需调整 fixture：`updatedUsers` 变量用于返回 exists 查询结果。在 exists 测试中设置 `setUpdatedUsers([{id: 'existing-user'} as AdminUserListItem])`。

- [x] **Step 4: 运行 GREEN**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

**Expected:** 12/12 passed。

- [x] **Step 5: LSP + 禁止项**

error diagnostics ×2 必须 No diagnostics；`rg "as any|@ts-ignore|@ts-expect-error|as unknown as"` must be 0。

- [x] **Step 6: 提交**

```bash
GIT_MASTER=1 git add server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(repository): 收敛密码重置查询与更新" \
  -m "由 Sisyphus 执行" \
  -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

---

### Task 2: Service RED → GREEN → Commit

**Files:**
- Modify: `server/services/__tests__/admin-user-service.test.ts`
- Modify: `server/services/admin-user-service.ts`

- [x] **Step 1: RED — 新增 resetPassword 测试**

扩展 `createRepository` fake 添加 `exists` 和 `updatePassword`：

```typescript
// 在 createCalls 附近新增
type ResetCall = {
  existsId: string | null
  updateId: string | null
  passwordHash: string | null
  now: string | null
}

// 在 createRepository 中添加 exists 和 updatePassword 方法
async exists(id: string): Promise<boolean> {
  resetCalls.push({ existsId: id, updateId: null, passwordHash: null, now: null })
  return id !== 'ghost'
},
async updatePassword(id: string, passwordHash: string, now: string): Promise<boolean> {
  resetCalls.push({ existsId: null, updateId: id, passwordHash, now })
  return true
},
```

新增测试：

```typescript
describe('resetPassword', () => {
  it('rejects unknown users without calling bcrypt or the update', async () => {
    const { repository, resetCalls } = createRepository(0, [], null, false)
    const service = new AdminUserService(repository)

    await expect(service.resetPassword('ghost')).resolves.toBe(false)
    expect(resetCalls).toEqual([{ existsId: 'ghost', updateId: null, passwordHash: null, now: null }])
  })

  it('generates a random password, hashes it with bcrypt, and updates the row', async () => {
    const { repository, resetCalls } = createRepository(0, [], null, false)
    const service = new AdminUserService(repository)

    await expect(service.resetPassword('user-1')).resolves.toBe(true)
    expect(resetCalls).toEqual([
      { existsId: 'user-1', updateId: null, passwordHash: null, now: null },
      { existsId: null, updateId: 'user-1', passwordHash: expect.stringMatching(/^\$2b\$12\$.{53}$/), now: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/) },
    ])
  })
})
```

- [x] **Step 2: RED**

```bash
rtk npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

**Expected:** 2 new FAIL；8 existing PASS。

- [x] **Step 3: GREEN**

`server/services/admin-user-service.ts`：

```typescript
import crypto from 'node:crypto'

function generateRandomPassword(length: number = 20): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const bytes = crypto.randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += CHARS[bytes[i] % CHARS.length]
  }
  return password
}
```

`AdminUserRepositoryPort` 新增：

```typescript
exists(id: string): Promise<boolean>
updatePassword(id: string, passwordHash: string, now: string): Promise<boolean>
```

`AdminUserService` 新增：

```typescript
async resetPassword(id: string): Promise<boolean> {
  const found = await this.repository.exists(id)
  if (!found) return false

  const newPassword = generateRandomPassword(20)
  const passwordHash = await bcrypt.hash(newPassword, 12)
  const now = toLocalISODateString()

  await this.repository.updatePassword(id, passwordHash, now)
  return true
}
```

- [x] **Step 4: GREEN**

```bash
rtk npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

**Expected:** 10/10 passed。

- [x] **Step 5: LSP + 禁止项**

- [x] **Step 6: 提交**

```bash
GIT_MASTER=1 git add server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts
GIT_MASTER=1 git commit -m "refactor(server): 编排密码重置逻辑" \
  -m "由 Sisyphus 执行" \
  -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

---

### Task 3: Route RED → GREEN → Commit

**Files:**
- Modify: `server/routes/__tests__/users.test.ts`
- Modify: `server/routes/__tests__/users-di-contract.test.ts`
- Modify: `server/routes/users.ts`

- [x] **Step 1: RED — 路由测试**

在 `mocks` 新增 `resetPassword`，`getAdminUserService` mock 新增 `resetPassword`。

新增测试：

```typescript
describe('POST /api/users/:id/reset-password', () => {
  it('delegates password reset to the admin user service and returns 200', async () => {
    mocks.resetPassword.mockResolvedValue(true)

    const res = await request(app).post('/api/users/user-42/reset-password')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { message: '密码已重置' } })
    expect(mocks.resetPassword).toHaveBeenCalledWith('user-42')
    expect(mocks.getConnection).not.toHaveBeenCalled()
  })

  it('returns 404 when the user does not exist', async () => {
    mocks.resetPassword.mockResolvedValue(false)

    const res = await request(app).post('/api/users/ghost/reset-password')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, error: '用户不存在' })
    expect(mocks.resetPassword).toHaveBeenCalledWith('ghost')
    expect(mocks.getConnection).not.toHaveBeenCalled()
  })
})
```

DI 契约新增：

```typescript
expect(source).toContain("await adminUserService.resetPassword(id)")
expect(source).not.toContain("import bcrypt from 'bcrypt'")
expect(source).not.toContain("import crypto from 'node:crypto'")
expect(source).not.toContain("function generateRandomPassword")
```

- [x] **Step 2: RED**

```bash
rtk npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

- [x] **Step 3: GREEN — 修改 Route**

POST `/:id/reset-password` handler 改为 delegate 模式；删除 `generateRandomPassword` 函数、`bcrypt` import、`crypto` import。

- [x] **Step 4: GREEN**

- [x] **Step 5: LSP + 禁止项**

- [x] **Step 6: 提交**

```bash
GIT_MASTER=1 git add server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(routes): 委托密码重置并清理死代码" \
  -m "由 Sisyphus 执行" \
  -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

---

### Task 4: 全链路验证与计划同步

- [x] **Step 1: 聚焦测试** — 4 files / 32 tests passed
- [x] **Step 2: 构建** — `npm run build` exit 0
- [x] **Step 3: 禁止项 + diff check**
- [x] **Step 4: 计划复选框 → `[x]`**
- [x] **Step 5: 提交计划状态**
