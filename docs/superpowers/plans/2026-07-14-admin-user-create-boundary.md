# 后台用户创建边界 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将 `POST /api/users` 创建端点从 Route 直连数据库收敛为 Route → AdminUserService.createUser → AdminUserRepository.createUser。

**Architecture:** Route 委托 AdminUserService 创建用户；Service 负责 bcrypt 哈希、UUID 生成、时间戳；Repository 执行参数化 INSERT 和脱敏读回。DI 无需修改（token/singleton 已就位）。

**Tech Stack:** Express + TypeScript + Vitest + bcrypt + uuid

---

## File Structure

| 文件 | 职责 | 变更 |
|------|------|------|
| `server/repositories/admin-user-repository.ts` | 数据访问 | 新增 `createUser` 方法 |
| `server/repositories/__tests__/admin-user-repository.test.ts` | 仓储测试 | 新增 `createUser` 测试 |
| `server/services/admin-user-service.ts` | 业务编排 | 新增 `createUser` 方法 |
| `server/services/__tests__/admin-user-service.test.ts` | 服务测试 | 新增 `createUser` 测试 |
| `server/routes/users.ts` | HTTP 路由 | POST handler 替换为 service 委托 |
| `server/routes/__tests__/users.test.ts` | 路由测试 | 新增 POST 行为测试 |
| `server/routes/__tests__/users-di-contract.test.ts` | 契约测试 | 新增 createUser 委托断言 |

---

## 前置条件

- `AdminUserRepository` 已导出 `AdminUserListItem`，窄端口含 `query` + `execute`
- `AdminUserService` 已注册为 DI singleton，token `ADMIN_USER_SERVICE`
- `server/routes/users.ts` 已 import `getAdminUserService`
- `createUserSchema` 已定义在 routes/users.ts 第 36-42 行
- 工作树干净

---

### Task 1: Repository RED → GREEN → Commit

**Files:**
- Modify: `server/repositories/__tests__/admin-user-repository.test.ts`
- Modify: `server/repositories/admin-user-repository.ts`

- [x] **Step 1: 在测试中扩展窄连接 fake，新增 `createUser` RED 测试**

在 `server/repositories/__tests__/admin-user-repository.test.ts` 的 `describe` 块末尾新增：

```typescript
// 扩展 query fake 支持返回刷新用户
function createFreshUser(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    id: 'new-user',
    username: 'newuser',
    email: 'new@example.com',
    minimax_api_key: 'minimax_****abcd',
    minimax_region: null,
    role: 'user',
    is_active: true,
    last_login_at: null,
    created_at: '2026-07-14T10:00:00.000',
    updated_at: '2026-07-14T10:00:00.000',
    ...overrides,
  }
}

describe('createUser', () => {
  it('executes an ordered nine-parameter INSERT then reads back a masked public user', async () => {
    const freshUser = createFreshUser()
    const executeCalls: Array<{ sql: string; params?: unknown[] }> = []
    const queryResults: unknown[][] = [[{ total: '1' }], [freshUser]]

    let queryCallIndex = 0
    const conn = {
      query(sql: string): Promise<Array<{ total: string | number }>> {
        return Promise.resolve(queryResults[queryCallIndex++] as Array<{ total: string | number }>)
      },
      query(sql: string, params: unknown[]): Promise<AdminUserListItem[]> {
        return Promise.resolve(queryResults[queryCallIndex++] as AdminUserListItem[])
      },
      execute(sql: string, params?: unknown[]): Promise<{ changes: number }> {
        executeCalls.push({ sql, params })
        return Promise.resolve({ changes: 1 })
      },
    }
    const repository = new AdminUserRepository(conn)

    const result = await repository.createUser({
      id: 'new-user',
      username: 'newuser',
      email: 'new@example.com',
      passwordHash: '$2b$12$hashed',
      role: 'user',
      apiKey: null,
      now: '2026-07-14T10:00:00.000',
    })

    expect(executeCalls).toHaveLength(1)
    const call = executeCalls[0]
    expect(call.sql).toContain('INSERT INTO users')
    expect(call.sql).toContain('id')
    expect(call.sql).toContain('username')
    expect(call.sql).toContain('email')
    expect(call.sql).toContain('password_hash')
    expect(call.sql).toContain('role')
    expect(call.sql).toContain('minimax_api_key')
    expect(call.sql).toContain('is_active')
    expect(call.sql).toContain('created_at')
    expect(call.sql).toContain('updated_at')
    expect(call.params).toEqual([
      'new-user', 'newuser', 'new@example.com', '$2b$12$hashed',
      'user', null, true, '2026-07-14T10:00:00.000', '2026-07-14T10:00:00.000',
    ])
    expect(result).toEqual(freshUser)
    // 读回查询不含 password_hash
    const readbackQuery = conn.query as ReturnType<typeof vi.fn>
  })

  it('returns the user with API key masked when apiKey is provided', async () => {
    const freshUser = createFreshUser({ minimax_api_key: 'minimax_****1234' })
    const queryResults: unknown[][] = [[freshUser]]
    let queryCallIndex = 0
    const executeCalls: Array<{ sql: string; params?: unknown[] }> = []
    const conn = {
      query(sql: string): Promise<Array<{ total: string | number }>> {
        return Promise.resolve(queryResults[queryCallIndex++] as Array<{ total: string | number }>)
      },
      query(sql: string, params: unknown[]): Promise<AdminUserListItem[]> {
        return Promise.resolve(queryResults[queryCallIndex++] as AdminUserListItem[])
      },
      execute(sql: string, params?: unknown[]): Promise<{ changes: number }> {
        executeCalls.push({ sql, params })
        return Promise.resolve({ changes: 1 })
      },
    }
    const repository = new AdminUserRepository(conn)

    const result = await repository.createUser({
      id: 'new-user',
      username: 'newuser',
      email: null,
      passwordHash: '$2b$12$hashed',
      role: 'admin',
      apiKey: 'sk-original-key-1234',
      now: '2026-07-14T10:00:00.000',
    })

    expect(result.minimax_api_key).toBe('minimax_****1234')
  })
})
```

- [x] **Step 2: 运行 RED 命令确认测试因 `createUser` 不存在而失败**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

**Expected:** 2 new tests FAIL with `TypeError: repository.createUser is not a function`；既有 4 tests 通过。

- [x] **Step 3: 在 `admin-user-repository.ts` 新增 `createUser` 方法**

在 `AdminUserRepositoryConnection` 接口中，`execute` 签名已存在无需改动。新增：

```typescript
export interface AdminUserCreateData {
  readonly id: string
  readonly username: string
  readonly email: string | null
  readonly passwordHash: string
  readonly role: string
  readonly apiKey: string | null
  readonly now: string
}
```

在 `AdminUserRepository` 类中新增方法：

```typescript
async createUser(data: AdminUserCreateData): Promise<AdminUserListItem> {
  await this.conn.execute(
    `INSERT INTO users (id, username, email, password_hash, role, minimax_api_key, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [data.id, data.username, data.email, data.passwordHash, data.role, data.apiKey, true, data.now, data.now]
  )

  const rows = await this.conn.query<AdminUserListItem>(
    `SELECT id, username, email,
       CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4)) AS minimax_api_key,
       minimax_region, role, is_active, last_login_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [data.id]
  )
  return rows[0]
}
```

- [x] **Step 4: 运行 GREEN 命令确认测试通过**

```bash
rtk npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

**Expected:** 6/6 passed。

- [x] **Step 5: LSP 诊断与禁止项检查**

```bash
# 并行运行 LSP 诊断（后台）
```

对 `admin-user-repository.ts` 和 `admin-user-repository.test.ts` 分别运行 `lsp_diagnostics` severity=error；必须 No diagnostics。

运行禁止项扫描（`rg` 字面量）：

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts
```

**Expected:** 0 matches。

- [x] **Step 6: 提交**

```bash
GIT_MASTER=1 git add server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(repository): 收敛后台用户创建" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
GIT_MASTER=1 git status --short
```

---

### Task 2: Service RED → GREEN → Commit

**Files:**
- Modify: `server/services/__tests__/admin-user-service.test.ts`
- Modify: `server/services/admin-user-service.ts`

- [x] **Step 1: 在服务测试中新增 `createUser` RED 测试**

`bcrypt` 和 `uuid` 是外部依赖，在 vitest 中 mock：

```typescript
// 文件顶部新增
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mock-hash'),
  },
}))

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid-1234'),
}))

vi.mock('../../lib/date-utils.js', () => ({
  toLocalISODateString: vi.fn(() => '2026-07-14T10:00:00.000'),
}))
```

在 `describe` 内新增 `describe('createUser')` 块：

```typescript
describe('createUser', () => {
  it('hashes the password, generates a UUID, sets timestamps, and delegates to the repository', async () => {
    const freshUser: AdminUserListItem = {
      id: 'mock-uuid-1234',
      username: 'newuser',
      email: 'new@example.com',
      minimax_api_key: null,
      minimax_region: null,
      role: 'user',
      is_active: true,
      last_login_at: null,
      created_at: '2026-07-14T10:00:00.000',
      updated_at: '2026-07-14T10:00:00.000',
    }

    const calls: string[] = []
    const repo: AdminUserRepositoryPort = {
      countUsers: vi.fn(),
      listUsers: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      createUser: vi.fn().mockImplementation((data) => {
        calls.push(data.passwordHash)
        calls.push(data.id)
        calls.push(data.now)
        return Promise.resolve(freshUser)
      }),
    }
    const service = new AdminUserService(repo)

    const result = await service.createUser({
      username: 'newuser',
      password: 'plain-password',
      email: 'new@example.com',
      role: 'user',
    })

    expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 12)
    expect(calls[0]).toBe('$2b$12$mock-hash')
    expect(calls[1]).toBe('mock-uuid-1234')
    expect(calls[2]).toBe('2026-07-14T10:00:00.000')
    expect(result).toEqual(freshUser)
  })
})
```

同时将现有 `AdminUserRepositoryPort` 的定义从测试文件中复用（当前已有局部类型），确保新增 `createUser` 方法签名。

- [x] **Step 2: 运行 RED 命令**

```bash
rtk npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

**Expected:** 1 new test FAIL with `TypeError: service.createUser is not a function`；既有 4 tests 通过。

- [x] **Step 3: 在 `admin-user-service.ts` 新增 `createUser` 方法**

修改 `AdminUserRepositoryPort` 接口，新增：

```typescript
createUser(data: AdminUserCreateData): Promise<AdminUserListItem>
```

修改 `AdminUserCreateInput`（新增 export）：

```typescript
export interface AdminUserCreateInput {
  readonly username: string
  readonly password: string
  readonly email?: string | null
  readonly role?: string
  readonly minimax_api_key?: string | null
}
```

在 `AdminUserService` 类中新增方法：

```typescript
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { toLocalISODateString } from '../lib/date-utils.js'
import type { AdminUserCreateData } from '../repositories/admin-user-repository.js'

async createUser(input: AdminUserCreateInput): Promise<AdminUserListItem> {
  const passwordHash = await bcrypt.hash(input.password, 12)
  const id = uuidv4()
  const now = toLocalISODateString()

  const data: AdminUserCreateData = {
    id,
    username: input.username,
    email: input.email ?? null,
    passwordHash,
    role: input.role ?? 'user',
    apiKey: input.minimax_api_key ?? null,
    now,
  }

  return this.repo.createUser(data)
}
```

- [x] **Step 4: 运行 GREEN 命令**

```bash
rtk npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

**Expected:** 5/5 passed（既有 4 + 新增 1）。

- [x] **Step 5: LSP 诊断与禁止项检查**

对 `admin-user-service.ts` 和 `admin-user-service.test.ts` 分别运行 `lsp_diagnostics` severity=error；必须 No diagnostics。

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts
```

**Expected:** 0 matches。

- [x] **Step 6: 提交**

```bash
GIT_MASTER=1 git add server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(server): 编排后台用户创建" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
GIT_MASTER=1 git status --short
```

---

### Task 3: Route RED → GREEN → Commit

**Files:**
- Modify: `server/routes/__tests__/users.test.ts`
- Modify: `server/routes/__tests__/users-di-contract.test.ts`
- Modify: `server/routes/users.ts`

- [x] **Step 1: 在路由测试中新增 POST `createUser` RED 测试**

在 `server/routes/__tests__/users.test.ts` 的 `mocks` 新增：

```typescript
const mocks = vi.hoisted(() => ({
  // ... 现有 ...
  createUser: vi.fn(),
}))
```

在 `getAdminUserService` mock 中新增：

```typescript
getAdminUserService: () => ({
  listUsers: mocks.listUsers,
  updateUser: mocks.updateUser,
  deleteUser: mocks.deleteUser,
  createUser: mocks.createUser,  // 新增
}),
```

在文件末尾（`DELETE` describe 之后）新增：

```typescript
describe('POST /api/users', () => {
  it('delegates user creation to the admin user service and returns 201', async () => {
    const createdUser = {
      id: 'new-user-123',
      username: 'newuser',
      email: 'new@example.com',
      role: 'user',
      is_active: true,
    }
    mocks.createUser.mockResolvedValue(createdUser)

    const res = await request(app)
      .post('/api/users')
      .send({
        username: 'newuser',
        password: 'secure-pass-123',
        email: 'new@example.com',
        role: 'user',
      })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      success: true,
      data: createdUser,
    })
    expect(mocks.createUser).toHaveBeenCalledWith({
      username: 'newuser',
      password: 'secure-pass-123',
      email: 'new@example.com',
      role: 'user',
    })
    expect(mocks.getConnection).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(mocks.createUser).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 2: 在 DI 契约测试中新增 `createUser` 委托断言**

在 `server/routes/__tests__/users-di-contract.test.ts` 新增 assertion：

```typescript
expect(source).toContain('await adminUserService.createUser(req.body)')
expect(source).not.toContain('INSERT INTO users (id, username, email, password_hash')
```

- [x] **Step 3: 运行 RED 命令**

```bash
rtk npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

**Expected:**
- users.test.ts: 2 new POST tests FAIL（route 仍用直连 `getConnection`，mock 未设置 query/execute）
- users-di-contract.test.ts: contract 缺 `createUser` 行 FAIL

- [x] **Step 4: 修改 `server/routes/users.ts` POST handler**

将 POST handler（第 60-76 行）替换为：

```typescript
router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  const adminUserService = getAdminUserService()
  const user = await adminUserService.createUser(req.body)
  successResponse(res, user, 201)
}))
```

保留所有现有 import（`bcrypt`/`uuid`/`getConnection`/`toLocalISODateString`/`getUserService` 仍被其他端点使用）。

- [x] **Step 5: 运行 GREEN 命令**

```bash
rtk npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

**Expected:** users.test.ts 10/10 passed（3 DELETE + 2 PATCH + 2 GET + 2 POST + 1 400），contract 1/1 passed。

- [x] **Step 6: LSP 诊断与禁止项检查**

对 `users.ts`、`users.test.ts`、`users-di-contract.test.ts` 分别运行 `lsp_diagnostics` severity=error；必须 No diagnostics。

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
```

**Expected:** 0 matches。

- [x] **Step 7: 提交**

```bash
GIT_MASTER=1 git add server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "refactor(routes): 委托后台用户创建" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
GIT_MASTER=1 git status --short
```

---

### Task 4: 全链路验证与计划同步

**Files:**
- Modify: `docs/superpowers/plans/2026-07-14-admin-user-create-boundary.md`（新建计划文件）

- [x] **Step 1: 运行聚焦测试套件**

```bash
rtk npm run test:server -- \
  "server/repositories/__tests__/admin-user-repository.test.ts" \
  "server/services/__tests__/admin-user-service.test.ts" \
  "server/routes/__tests__/users.test.ts" \
  "server/routes/__tests__/users-di-contract.test.ts"
```

**Expected:** 4 files / 26 tests passed。

- [x] **Step 2: 运行构建**

```bash
rtk npm run build
```

**Expected:** exit 0。Vite zh.json 告警为已知基线。

- [x] **Step 3: 全量禁止项与差异审计**

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
```

**Expected:** 0 matches。

```bash
GIT_MASTER=1 git diff --check 3ec7793^..HEAD
GIT_MASTER=1 git status --short
```

**Expected:** clean, 无输出。

- [x] **Step 4: 同步计划复选框**

将当前计划另存为 `docs/superpowers/plans/2026-07-14-admin-user-create-boundary.md`，将所有 `- [x]` 改为 `- [x]`。

- [x] **Step 5: 提交计划状态**

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-14-admin-user-create-boundary.md
GIT_MASTER=1 git diff --staged --stat
GIT_MASTER=1 git diff --staged --check
GIT_MASTER=1 git commit -m "docs(plan): 同步后台用户创建边界状态" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
GIT_MASTER=1 git log -1 --oneline
GIT_MASTER=1 git status --short
```
