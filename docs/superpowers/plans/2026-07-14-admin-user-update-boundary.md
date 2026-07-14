# 后台用户属性更新边界实施计划

> **面向执行代理：** 必须逐项依照复选框（`- [ ]`）执行本计划，并在每个原子任务后完成对应验证。

> 本仓库用户明确禁止子代理；执行时在当前会话逐项完成，不得派发子代理。

**目标：** 将 `PATCH /api/users/:id` 的 users 表属性更新和刷新读取从 Route 收敛至既有 `AdminUserService` -> `AdminUserRepository` 链路，并保持 HTTP 行为不变。

**架构：** Route 继续拥有 `super` 授权、Zod 验证、空更新成功响应和 HTTP 包装；`AdminUserService` 只委托后台用户更新；`AdminUserRepository` 以固定五字段白名单执行参数化更新，并读取脱敏公开用户。既有后台用户 factory、token、singleton 和 getter 已可装配该同一实例，本批不改 DI。

**技术栈：** Express、TypeScript strict、Vitest、Supertest、PostgreSQL、Zod、现有 DI Container。

---

## 文件结构

- 修改：`server/repositories/admin-user-repository.ts`，定义后台用户更新类型、扩展窄连接端口，并实现参数化更新和公开字段刷新读取。
- 修改：`server/repositories/__tests__/admin-user-repository.test.ts`，锁定五字段白名单、参数顺序、脱敏刷新读取和未命中 `null`。
- 修改：`server/services/admin-user-service.ts`，将后台用户 repository 契约扩展为更新委托。
- 修改：`server/services/__tests__/admin-user-service.test.ts`，覆盖更新委托与 `null` 透传，同时保持分页测试。
- 修改：`server/routes/users.ts`，仅替换 PATCH 处理器的连接和 SQL 逻辑。
- 修改：`server/routes/__tests__/users.test.ts`，将 PATCH 变为后台 Service mock，覆盖部分更新与空更新不委托。
- 修改：`server/routes/__tests__/users-di-contract.test.ts`，锁定 PATCH 委托并禁止遗留的 PATCH 专属 SQL 组装。
- 修改：`docs/superpowers/plans/2026-07-14-admin-user-update-boundary.md`，最终同步完成状态。

### 任务 1：锁定 Repository 的更新和刷新读取契约

**文件：**
- 修改：`server/repositories/__tests__/admin-user-repository.test.ts`
- 修改：`server/repositories/admin-user-repository.ts`

- [ ] **步骤 1：扩展失败的 Repository 测试 fixture 和更新断言**

将 `createConnectionFixture()` 扩展为可记录 `execute` 调用并配置按参数查询返回的公开用户。连接接口保持为局部窄端口，不使用 `DatabaseConnection`、类型断言或 `vi`：

```ts
type ExecuteCall = {
  sql: string
  params: unknown[] | undefined
}

function createConnectionFixture(): {
  connection: {
    query: {
      (sql: string): Promise<Array<{ total: string | number }>>
      (sql: string, params: unknown[]): Promise<AdminUserListItem[]>
    }
    execute(sql: string, params?: unknown[]): Promise<{ changes: number }>
  }
  calls: QueryCall[]
  executeCalls: ExecuteCall[]
  setCountRows(rows: Array<{ total: string | number }>): void
  setListedUsers(rows: AdminUserListItem[]): void
  setUpdatedUsers(rows: AdminUserListItem[]): void
} {
  const calls: QueryCall[] = []
  const executeCalls: ExecuteCall[] = []
  let countRows: Array<{ total: string | number }> = []
  let listedUsers: AdminUserListItem[] = []
  let updatedUsers: AdminUserListItem[] = []

  function query(sql: string): Promise<Array<{ total: string | number }>>
  function query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  async function query(
    sql: string,
    params?: unknown[]
  ): Promise<Array<{ total: string | number }> | AdminUserListItem[]> {
    calls.push({ sql, params })
    if (!params) return countRows
    return sql.includes('WHERE id = $1') ? updatedUsers : listedUsers
  }

  async function execute(sql: string, params?: unknown[]): Promise<{ changes: number }> {
    executeCalls.push({ sql, params })
    return { changes: 1 }
  }

  return {
    connection: { query, execute },
    calls,
    executeCalls,
    setCountRows(rows): void { countRows = rows },
    setListedUsers(rows): void { listedUsers = rows },
    setUpdatedUsers(rows): void { updatedUsers = rows },
  }
}
```

新增全字段更新用例：设置一个脱敏公开用户为 `updatedUsers`，调用时故意以非白名单顺序提供字段：

```ts
const result = await repository.updateUser('user-123', {
  minimax_region: 'intl',
  role: 'admin',
  is_active: false,
  email: null,
  minimax_api_key: 'unmasked-key',
})

expect(result).toEqual(updatedUser)
expect(executeCalls).toEqual([{
  sql: 'UPDATE users SET email = $1, role = $2, is_active = $3, minimax_api_key = $4, minimax_region = $5, updated_at = $6 WHERE id = $7',
  params: [null, 'admin', false, 'unmasked-key', 'intl', expect.any(String), 'user-123'],
}])
expect(calls).toEqual([{
  sql: expect.stringContaining('WHERE id = $1'),
  params: ['user-123'],
}])
expect(calls[0]?.sql).toContain("CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4))")
expect(calls[0]?.sql).not.toContain('password_hash')
```

新增未命中用例：不设置 `updatedUsers`，调用 `updateUser('missing-user', { role: 'admin' })` 并断言结果为 `null`；同时断言更新 SQL 为 `role = $1, updated_at = $2 WHERE id = $3`，参数为 `['admin', expect.any(String), 'missing-user']`。

- [ ] **步骤 2：运行 Repository 测试确认 RED**

运行：

```bash
npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

预期：失败，原因是 `AdminUserRepository.updateUser`、连接端口的 `execute` 和更新类型尚未存在；失败必须来自待实现的更新契约，而不是 fixture 或导入错误。

- [ ] **步骤 3：实现最小参数化 Repository 更新**

在 `server/repositories/admin-user-repository.ts` 中保留现有列表读取，并添加：

```ts
import { toLocalISODateString } from '../lib/date-utils.js'

export type AdminUserUpdate = {
  readonly email?: string | null
  readonly role?: 'super' | 'admin' | 'pro' | 'user'
  readonly is_active?: boolean
  readonly minimax_api_key?: string | null
  readonly minimax_region?: 'cn' | 'intl'
}

export type AdminUserListItem = Record<string, unknown> & {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string | null
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

type AdminUserUpdateValue = AdminUserUpdate[keyof AdminUserUpdate] | string

export interface AdminUserRepositoryConnection {
  query(sql: string): Promise<Array<{ total: string | number }>>
  query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>
}
```

在 `updateUser()` 中严格按照下面顺序构造参数化白名单；空更新由 Route 阻止，所以 Repository 不添加空输入分支：

```ts
async updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null> {
  const fields: string[] = []
  const values: AdminUserUpdateValue[] = []
  let index = 1

  if (updates.email !== undefined) { fields.push(`email = $${index++}`); values.push(updates.email) }
  if (updates.role !== undefined) { fields.push(`role = $${index++}`); values.push(updates.role) }
  if (updates.is_active !== undefined) { fields.push(`is_active = $${index++}`); values.push(updates.is_active) }
  if (updates.minimax_api_key !== undefined) { fields.push(`minimax_api_key = $${index++}`); values.push(updates.minimax_api_key) }
  if (updates.minimax_region !== undefined) { fields.push(`minimax_region = $${index++}`); values.push(updates.minimax_region) }

  fields.push(`updated_at = $${index++}`)
  values.push(toLocalISODateString())
  values.push(id)

  await this.conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`, values)
  const rows = await this.conn.query(
    `SELECT id, username, email,
      CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4)) AS minimax_api_key,
      minimax_region, role, is_active, last_login_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  )

  return rows[0] ?? null
}
```

不要继承 `UserRepository`，不要读取或返回 `password_hash`，不要检查 `changes` 并新增错误语义，也不要触碰列表 SQL 以外的 users 用例。

- [ ] **步骤 4：运行 Repository 测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

预期：通过；公开刷新查询脱敏 API Key、不含 `password_hash`，五字段更新保持固定参数顺序，未命中透传 `null`。

- [ ] **步骤 5：提交 Repository 单元**

运行：

```bash
GIT_MASTER=1 git add server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(repository): 收敛后台用户属性更新" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含 Repository 与其更新测试的原子提交。

### 任务 2：锁定 Service 的更新委托契约

**文件：**
- 修改：`server/services/__tests__/admin-user-service.test.ts`
- 修改：`server/services/admin-user-service.ts`

- [ ] **步骤 1：写失败的 Service 更新测试**

将本地 repository fake 扩展为带 `updateUser` 的后台用户 repository，并记录更新调用。RED 阶段先在测试内定义与目标契约同构的局部输入类型，避免在生产类型尚未导出时产生导入错误：

```ts
type UpdateCall = {
  id: string
  updates: AdminUserUpdateInput
}

type AdminUserUpdateInput = {
  readonly email?: string | null
  readonly role?: 'super' | 'admin' | 'pro' | 'user'
  readonly is_active?: boolean
  readonly minimax_api_key?: string | null
  readonly minimax_region?: 'cn' | 'intl'
}

function createRepository(total: number, users: AdminUserListItem[], updatedUser: AdminUserListItem | null): {
  repository: AdminUserListRepository & {
    updateUser(id: string, updates: AdminUserUpdateInput): Promise<AdminUserListItem | null>
  }
  listCalls: ListCall[]
  updateCalls: UpdateCall[]
} {
  const listCalls: ListCall[] = []
  const updateCalls: UpdateCall[] = []

  return {
    repository: {
      async countUsers(): Promise<number> { return total },
      async listUsers(options: ListCall): Promise<AdminUserListItem[]> {
        listCalls.push(options)
        return users
      },
      async updateUser(id: string, updates: AdminUserUpdateInput): Promise<AdminUserListItem | null> {
        updateCalls.push({ id, updates })
        return updatedUser
      },
    },
    listCalls,
    updateCalls,
  }
}
```

新增两个测试：一个使用 `createUser('user-123')`，断言更新结果原样返回且 `updateCalls` 等于：

```ts
[{ id: 'user-123', updates: { email: 'updated@example.com', is_active: false } }]
```

另一个将 `updatedUser` 设为 `null`，调用 `service.updateUser('missing-user', { role: 'admin' })` 并断言结果为 `null`，以及更新调用保持原 ID 与数据。

- [ ] **步骤 2：运行 Service 测试确认 RED**

运行：

```bash
npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

预期：失败，原因是 `AdminUserService.updateUser` 和扩展后的 repository 契约尚未存在；既有分页行为不是失败原因。

- [ ] **步骤 3：实现最小 Service 委托**

从 Repository 导入 `AdminUserUpdate`，在生产 Service 中将当前本地接口改名为所有后台 users 用例所需的明确端口：

```ts
export interface AdminUserRepositoryPort {
  countUsers(): Promise<number>
  listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]>
  updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null>
}
```

将构造参数类型同步为 `AdminUserRepositoryPort`，并在 `AdminUserService` 增加：

```ts
async updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null> {
  return this.repository.updateUser(id, updates)
}
```

不要导入 `DatabaseConnection`、Express、Zod、HTTP 响应工具或认证代码；不要把空更新、404、密码或授权逻辑引入 Service。

- [ ] **步骤 4：运行 Service 测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

预期：通过；分页计算不变，更新按原 ID 和属性委托，`null` 未命中结果原样透传。

- [ ] **步骤 5：提交 Service 单元**

运行：

```bash
GIT_MASTER=1 git add server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(server): 编排后台用户属性更新" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含 Service 与其更新测试的原子提交。

### 任务 3：使 PATCH Route 委托后台用户 Service

**文件：**
- 修改：`server/routes/users.ts:49-108`
- 修改：`server/routes/__tests__/users.test.ts:5-167`
- 修改：`server/routes/__tests__/users-di-contract.test.ts`

- [ ] **步骤 1：先把 PATCH 行为测试改为 Service mock**

为 hoisted mock 添加：

```ts
updateUser: vi.fn(),
```

将 `getAdminUserService` mock 改为同时暴露列表和更新：

```ts
getAdminUserService: () => ({
  listUsers: mocks.listUsers,
  updateUser: mocks.updateUser,
}),
```

把现有部分更新测试改为配置：

```ts
mocks.updateUser.mockResolvedValue({
  id: 'user-123',
  email: 'updated@example.com',
  is_active: false,
  role: 'user',
})
```

保留既有 HTTP 200 和 body 断言，替换 SQL 断言为：

```ts
expect(mocks.updateUser).toHaveBeenCalledWith('user-123', {
  email: 'updated@example.com',
  is_active: false,
})
expect(mocks.getConnection).not.toHaveBeenCalled()
```

再新增空 body 测试，断言 `PATCH /api/users/user-123` 返回：

```ts
{
  success: true,
  data: { message: 'No changes' },
}
```

并断言 `mocks.updateUser` 和 `mocks.getConnection` 都未被调用。

- [ ] **步骤 2：写失败的 Route 依赖契约并运行 RED**

在 `users-di-contract.test.ts` 保留既有 GET 断言，并加入：

```ts
expect(source).toContain('await adminUserService.updateUser(id, updates)')
expect(source).not.toContain('type UserUpdateValue')
expect(source).not.toContain('fields.join(\', \')')
```

运行：

```bash
npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：失败，因为 PATCH 尚直接调用连接、执行 SQL 并通过 `getUserService()` 刷新；失败不能来自 GET、POST、DELETE、批量操作或密码重置。

- [ ] **步骤 3：最小化改写 PATCH Route**

删除：

```ts
type UserUpdateValue = UpdateUserInput[keyof UpdateUserInput] | string
```

在 PATCH 处理器中保留 `id`、`updates`、空更新成功响应和 `return`。以以下代码替换从旧 `const conn = getConnection()` 到旧 `successResponse(res, user)` 的非空更新块：

```ts
const adminUserService = getAdminUserService()
const user = await adminUserService.updateUser(id, updates)
successResponse(res, user)
```

不要删除 `getConnection` 或 `toLocalISODateString` import，因为同一文件范围外的 POST、DELETE、`/batch` 和 `/:id/reset-password` 仍然使用它们；不要修改这些端点或 `getUserService()` 的 POST 用途。

- [ ] **步骤 4：运行 Route 测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：通过；GET 行为仍由现有后台列表 service 覆盖，PATCH 部分更新和空更新保持 HTTP 响应，PATCH 不再取得连接。

- [ ] **步骤 5：提交 Route 单元**

运行：

```bash
GIT_MASTER=1 git add server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(routes): 委托后台用户属性更新" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含 PATCH Route 委托和其行为/依赖契约测试的原子提交。

### 任务 4：完成针对性验证和计划状态同步

**文件：**
- 修改：`docs/superpowers/plans/2026-07-14-admin-user-update-boundary.md`
- 验证：任务 1 至任务 3 列出的所有 TypeScript 文件。

- [ ] **步骤 1：运行完整针对性测试**

运行：

```bash
npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts" "server/services/__tests__/admin-user-service.test.ts" "server/service-registration/__tests__/repository-factories.test.ts" "server/service-registration/__tests__/admin-user-list-di-contract.test.ts" "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：列出的文件全部通过；DI 测试证明已存在的后台 users 装配仍可创建扩展后的 class。

- [ ] **步骤 2：运行类型和构建验证**

对下列文件运行 LSP error diagnostics：

```text
server/repositories/admin-user-repository.ts
server/repositories/__tests__/admin-user-repository.test.ts
server/services/admin-user-service.ts
server/services/__tests__/admin-user-service.test.ts
server/routes/users.ts
server/routes/__tests__/users.test.ts
server/routes/__tests__/users-di-contract.test.ts
```

然后运行：

```bash
npm run build
```

预期：构建退出码为 0。若出现既有无关告警，只记录来源，不修改无关文件。

- [ ] **步骤 3：扫描禁止项并检查差异**

运行：

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/repositories/admin-user-repository.ts server/services/admin-user-service.ts server/routes/users.ts server/repositories/__tests__/admin-user-repository.test.ts server/services/__tests__/admin-user-service.test.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git diff --check 62d7a06^..HEAD
```

预期：禁止项扫描无匹配，差异检查无输出。

- [ ] **步骤 4：更新计划复选框并提交**

将任务 1 至任务 4 中已完成的复选框改为 `[x]`，然后运行：

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-14-admin-user-update-boundary.md
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "docs(plan): 同步后台用户属性更新状态" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：计划状态可追溯，且不混入生产代码变更。

## 计划自审

- 规格覆盖：任务 1 覆盖五字段固定白名单、参数化更新时间、脱敏刷新读取和 `null`；任务 2 覆盖 Service 委托与 `null` 透传；任务 3 覆盖 Route 的部分更新、空更新、既有响应与无连接边界；任务 4 覆盖聚焦测试、LSP、构建、禁止项和差异检查。
- 占位符扫描：已检查常见占位词、延后实现标记和模糊步骤引用；每个代码步骤均提供具体路径、类型、签名、断言或命令。
- 类型一致性：`AdminUserUpdate`、`AdminUserListItem` 和 `AdminUserListOptions` 均由 Repository 导出；Service 的 `AdminUserRepositoryPort` 契约、Route 的 `updateUser(id, updates)` 调用和测试使用同一名称与参数顺序。
