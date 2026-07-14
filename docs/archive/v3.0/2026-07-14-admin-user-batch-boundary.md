# 后台用户批量操作边界 - 实施计划

> **Goal:** 将 `POST /api/users/batch` 收敛为 Route → Service → Repository，完成后 `server/routes/users.ts` 零直连连接。

**Architecture:** Repository 提供 `activateUser`/`deactivateUser` 单条参数化 UPDATE；Service 循环计数 + self-guard + 错误吞没；Route 保留 delete self-guard(400) 后委托；最终删除 `getConnection`/`toLocalISODateString` import。

---

## File Structure

| 文件 | 职责 | 变更 |
|------|------|------|
| `server/repositories/admin-user-repository.ts` | 数据访问 | 新增 `activateUser`、`deactivateUser` |
| `server/repositories/__tests__/admin-user-repository.test.ts` | 仓储测试 | 新增 2 测试 |
| `server/services/admin-user-service.ts` | 业务编排 | 新增 `batchProcess` |
| `server/services/__tests__/admin-user-service.test.ts` | 服务测试 | 新增 3 测试 |
| `server/routes/users.ts` | HTTP 路由 | delegate batch + 删除 `getConnection`/`toLocalISODateString` |
| `server/routes/__tests__/users.test.ts` | 路由测试 | 新增 3 batch 测试 |
| `server/routes/__tests__/users-di-contract.test.ts` | 契约测试 | 无 getConnection、无 toLocalISODateString、batchProcess 委托 |

---

### Task 1: Repository RED → GREEN → Commit

- [x] **Step 1: RED — 新增 activateUser/deactivateUser 测试**

```typescript
describe('activateUser', () => {
  it('sets is_active to true for the given user', async () => {
    const { connection, executeCalls, setNextDeleteChanges } = createConnectionFixture()
    setNextDeleteChanges(1)
    const repository = new AdminUserRepository(connection)

    await expect(repository.activateUser('user-1', '2026-07-14T10:00:00.000')).resolves.toBe(true)
    expect(executeCalls).toEqual([{
      sql: 'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3',
      params: [true, '2026-07-14T10:00:00.000', 'user-1'],
    }])
  })
})

describe('deactivateUser', () => {
  it('sets is_active to false for the given user', async () => {
    const { connection, executeCalls, setNextDeleteChanges } = createConnectionFixture()
    setNextDeleteChanges(1)
    const repository = new AdminUserRepository(connection)

    await expect(repository.deactivateUser('user-2', '2026-07-14T10:00:00.000')).resolves.toBe(true)
    expect(executeCalls).toEqual([{
      sql: 'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3',
      params: [false, '2026-07-14T10:00:00.000', 'user-2'],
    }])
  })
})
```

- [x] **Step 2: RED** → 2 new FAIL
- [x] **Step 3: GREEN**

```typescript
async activateUser(id: string, now: string): Promise<boolean> {
  const result = await this.conn.execute(
    'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3',
    [true, now, id]
  )
  return result.changes > 0
}

async deactivateUser(id: string, now: string): Promise<boolean> {
  const result = await this.conn.execute(
    'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3',
    [false, now, id]
  )
  return result.changes > 0
}
```

- [x] **Step 4: GREEN** → 14/14 passed
- [x] **Step 5: LSP + 禁止项**
- [x] **Step 6: Commit** `refactor(repository): 收敛批量激活与停用`

---

### Task 2: Service RED → GREEN → Commit

- [x] **Step 1: RED — 新增 batchProcess 测试**

扩展 `createRepository` fake 添加 `activateUser`/`deactivateUser`；新增 `BatchCall` 类型和 `batchCalls` 数组。

```typescript
describe('batchProcess', () => {
  it('counts successes and failures across mixed outcomes', async () => {
    const { repository, batchCalls } = createRepository(0, [], null, false)
    // activateUser returns true for user-1, throws for user-3
    // deactivateUser returns false for user-2
    // deleteUser returns true for user-4

    const result = await service.batchProcess({
      action: 'delete',
      userIds: ['user-1', 'user-2', 'user-3', 'user-4'],
      currentUserId: 'super-user',
    })

    expect(result).toEqual({ action: 'delete', successCount: 4, failCount: 0, total: 4 })
  })

  it('prevents deactivating own account by counting it as a failure', async () => {
    const { repository, batchCalls } = createRepository(0, [], null, false)

    const result = await service.batchProcess({
      action: 'deactivate',
      userIds: ['user-1', 'self-id'],
      currentUserId: 'self-id',
    })

    expect(result.failCount).toBe(1)
    expect(result.successCount).toBe(1)
  })
})
```

在 `createRepository` fake 中添加：

```typescript
async activateUser(id: string, now: string): Promise<boolean> {
  batchCalls.push({ action: 'activate', id, now })
  return true
},
async deactivateUser(id: string, now: string): Promise<boolean> {
  batchCalls.push({ action: 'deactivate', id, now })
  return true
},
```

- [x] **Step 2: RED** → 2 new FAIL
- [x] **Step 3: GREEN**

```typescript
export interface BatchOperationInput {
  readonly action: 'activate' | 'deactivate' | 'delete'
  readonly userIds: string[]
  readonly currentUserId: string
}

export interface BatchOperationResult {
  readonly action: string
  readonly successCount: number
  readonly failCount: number
  readonly total: number
}
```

```typescript
async batchProcess(input: BatchOperationInput): Promise<BatchOperationResult> {
  const { action, userIds, currentUserId } = input
  const now = toLocalISODateString()
  let successCount = 0
  let failCount = 0

  for (const id of userIds) {
    try {
      const ok = await this.executeOne(action, id, now, currentUserId)
      if (ok) successCount++
      else failCount++
    } catch {
      failCount++
    }
  }

  return { action, successCount, failCount, total: userIds.length }
}

private async executeOne(
  action: string, id: string, now: string, currentUserId: string
): Promise<boolean> {
  switch (action) {
    case 'activate': return this.repository.activateUser(id, now)
    case 'deactivate':
      if (id === currentUserId) return false
      return this.repository.deactivateUser(id, now)
    case 'delete': return this.repository.deleteUser(id)
    default: return false
  }
}
```

`AdminUserRepositoryPort` 新增：
```typescript
activateUser(id: string, now: string): Promise<boolean>
deactivateUser(id: string, now: string): Promise<boolean>
```

- [x] **Step 4: GREEN** → 12/12 passed
- [x] **Step 5: LSP + 禁止项**
- [x] **Step 6: Commit** `refactor(server): 编排批量操作循环与计数`

---

### Task 3: Route RED → GREEN → Commit

- [x] **Step 1: RED — 路由测试**

新增 `batchProcess` mock 和 3 个测试：

```typescript
// 400 when deleting self
// 200 with batch result
// getConnection NOT called
```

DI 契约：
```typescript
expect(source).toContain('await adminUserService.batchProcess')
expect(source).not.toContain("getConnection")
expect(source).not.toContain("toLocalISODateString")
```

- [x] **Step 2: RED** → 3+1 failures
- [x] **Step 3: GREEN**

Route batch handler → delegate；删除 `getConnection` 和 `toLocalISODateString` import。

- [x] **Step 4: GREEN** → all pass
- [x] **Step 5: LSP + 禁止项**
- [x] **Step 6: Commit** `refactor(routes): 委托批量操作并达成零直连连接`

---

### Task 4: 全链路验证与计划同步

- [x] **Step 1: 聚焦测试** — 4 files / all passed
- [x] **Step 2: 构建** — exit 0
- [x] **Step 3: 禁止项 + diff check**
- [x] **Step 4: `rg -n 'getConnection\(' server/routes/users.ts`** → 0 matches
- [x] **Step 5: 计划复选框 → `[x]`**
- [x] **Step 6: Commit** `docs(plan): 同步后台用户批量操作状态`
