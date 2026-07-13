# 后台用户列表读取边界实施计划

> **面向执行代理：** 必须逐项依照复选框（`- [ ]`）执行本计划，并在每个原子任务后完成对应验证。

> 本仓库用户明确禁止子代理；执行时在当前会话逐项完成，不得派发子代理。

**目标：** 将 `GET /api/users` 的用户总数与分页读取从 Route 收敛到专职的后台用户 Service -> Repository 链路，同时保持 HTTP 行为完全不变。

**架构：** `AdminUserRepository` 专注于 users 表的计数和脱敏分页查询；`AdminUserService` 计算 offset 并组装分页值；容器在 composition root 中创建 repository、注册 service 并提供 getter。Route 继续负责授权、Zod 查询验证和 `successResponse`，不再访问连接或拼接列表 SQL。

**技术栈：** Express、TypeScript strict、Vitest、Supertest、PostgreSQL、Zod、现有 DI Container。

---

## 文件结构

- 创建：`server/repositories/admin-user-repository.ts`，users 表只读后台列表的数据访问。
- 创建：`server/services/admin-user-service.ts`，分页用例和响应 DTO 编排。
- 创建：`server/repositories/__tests__/admin-user-repository.test.ts`，SQL 投影、脱敏、排序和参数化契约。
- 创建：`server/services/__tests__/admin-user-service.test.ts`，offset、数值总数和分页页数契约。
- 修改：`server/service-registration/repository-factories.ts`，新增后台用户 repository factory。
- 修改：`server/service-registration/tokens.ts`，新增后台用户 service token。
- 修改：`server/service-registration/service-registrations.ts`，装配 singleton service。
- 修改：`server/service-registration/service-getters.ts`，暴露 service getter。
- 修改：`server/service-registration/__tests__/repository-factories.test.ts`，覆盖新 factory。
- 修改：`server/service-registration/__tests__/tokens.test.ts`，覆盖新增公开 token。
- 创建：`server/service-registration/__tests__/admin-user-list-di-contract.test.ts`，覆盖装配和 getter 的源文件契约。
- 修改：`server/routes/users.ts`，仅改写 GET 列表处理器的依赖边界。
- 修改：`server/routes/__tests__/users.test.ts`，将 GET mock 转为后台列表 service 并保留 HTTP 断言。
- 修改：`server/routes/__tests__/users-di-contract.test.ts`，验证 Route 无列表连接/SQL 泄露。

### 任务 1：锁定 Repository 的读取 SQL 契约

**文件：**
- 创建：`server/repositories/__tests__/admin-user-repository.test.ts`
- 创建：`server/repositories/admin-user-repository.ts`

- [ ] **步骤 1：写失败的 Repository 测试**

以记录 `query` 调用的 `DatabaseConnection` fixture 构造 `AdminUserRepository`，先写两个断言：

```ts
const result = await repository.countUsers()

expect(result).toBe(7)
expect(query).toHaveBeenCalledWith('SELECT COUNT(*) as total FROM users')
```

```ts
await repository.listUsers({ limit: 5, offset: 5 })

expect(query).toHaveBeenCalledWith(
  expect.stringContaining("CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4))"),
  [5, 5]
)
expect(query).toHaveBeenCalledWith(
  expect.stringContaining('ORDER BY created_at DESC LIMIT $1 OFFSET $2'),
  [5, 5]
)
```

为 `query` 依次提供 `[{ total: '7' }]` 和包含公开字段的列表；断言列表原样返回且不含 `password_hash`。

- [ ] **步骤 2：运行测试确认 RED**

运行：

```bash
npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

预期：失败，原因是 `admin-user-repository.ts` 尚不存在。

- [ ] **步骤 3：实现最小只读 Repository**

在 `server/repositories/admin-user-repository.ts` 定义并导出：

```ts
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

export interface AdminUserListOptions {
  limit: number
  offset: number
}

export class AdminUserRepository {
  constructor(private readonly conn: DatabaseConnection) {}

  async countUsers(): Promise<number> {
    const rows = await this.conn.query<{ total: string | number }>('SELECT COUNT(*) as total FROM users')
    return Number(rows[0]?.total ?? 0)
  }

  async listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]> {
    return this.conn.query<AdminUserListItem>(
      `SELECT id, username, email,
       CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4)) AS minimax_api_key,
       minimax_region, role, is_active, last_login_at, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [options.limit, options.offset]
    )
  }
}
```

仅保留上述两个只读方法；不要继承现有 `UserRepository`、不要引入写入方法、不要读取或返回 `password_hash`。

- [ ] **步骤 4：运行 Repository 测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts"
```

预期：通过，确认计数被数值化、查询按创建时间倒序且分页参数为 `[5, 5]`。

- [ ] **步骤 5：提交 Repository 单元**

运行：

```bash
GIT_MASTER=1 git add server/repositories/admin-user-repository.ts server/repositories/__tests__/admin-user-repository.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(repository): 提取后台用户列表查询" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含 Repository 与其测试的原子提交。

### 任务 2：锁定 Service 的分页编排契约

**文件：**
- 创建：`server/services/__tests__/admin-user-service.test.ts`
- 创建：`server/services/admin-user-service.ts`

- [ ] **步骤 1：写失败的 Service 测试**

定义结构化 repository stub：

```ts
const repository = {
  countUsers: vi.fn(async () => 7),
  listUsers: vi.fn(async () => [{ id: 'user-2', username: 'tester' }]),
}
const service = new AdminUserService(repository)

await expect(service.listUsers({ page: 2, limit: 5 })).resolves.toEqual({
  data: [{ id: 'user-2', username: 'tester' }],
  pagination: { page: 2, limit: 5, total: 7, totalPages: 2 },
})
expect(repository.listUsers).toHaveBeenCalledWith({ limit: 5, offset: 5 })
```

再覆盖空总数：`countUsers` 返回 0 时，`totalPages` 必须为 0。

- [ ] **步骤 2：运行测试确认 RED**

运行：

```bash
npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

预期：失败，原因是 `AdminUserService` 尚不存在。

- [ ] **步骤 3：实现最小 Service**

在 `server/services/admin-user-service.ts` 定义 repository 依赖接口和 service：

```ts
export interface AdminUserListRepository {
  countUsers(): Promise<number>
  listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]>
}

export class AdminUserService {
  constructor(private readonly repository: AdminUserListRepository) {}

  async listUsers({ page, limit }: { page: number; limit: number }) {
    const [total, data] = await Promise.all([
      this.repository.countUsers(),
      this.repository.listUsers({ limit, offset: (page - 1) * limit }),
    ])

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }
}
```

从 Repository 导入 `AdminUserListItem` 和 `AdminUserListOptions` 类型。不要导入 `DatabaseConnection`，不要增加任何 HTTP 或认证依赖。

- [ ] **步骤 4：运行 Service 测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/services/__tests__/admin-user-service.test.ts"
```

预期：通过，确认第二页 offset 为 5，空总数页数为 0。

- [ ] **步骤 5：提交 Service 单元**

运行：

```bash
GIT_MASTER=1 git add server/services/admin-user-service.ts server/services/__tests__/admin-user-service.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(server): 编排后台用户列表分页" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含 Service 与其测试的原子提交。

### 任务 3：通过现有容器装配查询链路

**文件：**
- 修改：`server/service-registration/repository-factories.ts`
- 修改：`server/service-registration/tokens.ts`
- 修改：`server/service-registration/service-registrations.ts`
- 修改：`server/service-registration/service-getters.ts`
- 修改：`server/service-registration/__tests__/repository-factories.test.ts`
- 修改：`server/service-registration/__tests__/tokens.test.ts`
- 创建：`server/service-registration/__tests__/admin-user-list-di-contract.test.ts`

- [ ] **步骤 1：写失败的容器契约测试**

在新测试文件读取四个注册源文件，断言：

```ts
expect(tokensSource).toContain("ADMIN_USER_SERVICE: 'adminUserService'")
expect(factorySource).toContain('createAdminUserRepository')
expect(registrationsSource).toContain('TOKENS.ADMIN_USER_SERVICE')
expect(registrationsSource).toContain('new AdminUserService')
expect(gettersSource).toContain('getAdminUserService')
```

扩展 `repository-factories.test.ts`，从 factory 创建实例并断言 `toBeInstanceOf(AdminUserRepository)`；扩展 `tokens.test.ts` 的期望对象，加入 `ADMIN_USER_SERVICE: 'adminUserService'`。

- [ ] **步骤 2：运行测试确认 RED**

运行：

```bash
npm run test:server -- "server/service-registration/__tests__/repository-factories.test.ts" "server/service-registration/__tests__/tokens.test.ts" "server/service-registration/__tests__/admin-user-list-di-contract.test.ts"
```

预期：失败，原因是 factory、token、注册和 getter 尚未存在。

- [ ] **步骤 3：实现最小装配**

在 `repository-factories.ts` 添加 import 和 factory：

```ts
import { AdminUserRepository } from '../repositories/admin-user-repository.js'

export function createAdminUserRepository(database: RepositoryDatabase): AdminUserRepository {
  return new AdminUserRepository(getConnection(database))
}
```

在 `tokens.ts` 的 `TOKENS` 对象加入：

```ts
ADMIN_USER_SERVICE: 'adminUserService',
```

在 `service-registrations.ts` 导入 `AdminUserService` 与 `createAdminUserRepository`，并在其他单 repository service 的 singleton 注册附近加入：

```ts
container.registerSingleton(TOKENS.ADMIN_USER_SERVICE, (c) => {
  return new AdminUserService(createAdminUserRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
})
```

在 `service-getters.ts` 导入 `AdminUserService` 并加入：

```ts
export function getAdminUserService(): AdminUserService {
  return getGlobalContainer().resolve<AdminUserService>(TOKENS.ADMIN_USER_SERVICE)
}
```

不要改变 `server/service-registration.ts`，它已通过 `export *` 重导出 getters。

- [ ] **步骤 4：运行容器测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/service-registration/__tests__/repository-factories.test.ts" "server/service-registration/__tests__/tokens.test.ts" "server/service-registration/__tests__/admin-user-list-di-contract.test.ts" "server/service-registration/__tests__/composition-contract.test.ts"
```

预期：通过，确认新 token、factory、singleton 和 public getter 均可用。

- [ ] **步骤 5：提交 DI 单元**

运行：

```bash
GIT_MASTER=1 git add server/service-registration/repository-factories.ts server/service-registration/tokens.ts server/service-registration/service-registrations.ts server/service-registration/service-getters.ts server/service-registration/__tests__/repository-factories.test.ts server/service-registration/__tests__/tokens.test.ts server/service-registration/__tests__/admin-user-list-di-contract.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(server): 注册后台用户列表服务" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含 composition root 和其契约测试的原子提交。

### 任务 4：使 Route 委托后台列表 Service

**文件：**
- 修改：`server/routes/users.ts:1-78`
- 修改：`server/routes/__tests__/users.test.ts:5-112`
- 修改：`server/routes/__tests__/users-di-contract.test.ts`

- [ ] **步骤 1：先把 GET 行为测试改为 Service mock**

将 hoisted mock 添加为：

```ts
listUsers: vi.fn(),
```

把 `service-registration.js` mock 扩展为：

```ts
getAdminUserService: () => ({ listUsers: mocks.listUsers }),
```

在两个 GET 测试中分别让 `mocks.listUsers` 返回既有 `{ data, pagination }` 对象，保留 HTTP body 的精确断言，并替换 SQL 调用断言为：

```ts
expect(mocks.listUsers).toHaveBeenCalledWith({ page: 2, limit: 5 })
expect(mocks.getConnection).not.toHaveBeenCalled()
```

和：

```ts
expect(mocks.listUsers).toHaveBeenCalledWith({ page: 1, limit: 20 })
expect(mocks.getConnection).not.toHaveBeenCalled()
```

保留 PATCH 测试及其 `getUserService` mock 不变。

- [ ] **步骤 2：写失败的 Route 边界契约并运行 RED**

在 `users-di-contract.test.ts` 增加一个测试：

```ts
expect(source).toContain('getAdminUserService')
expect(source).toContain('await adminUserService.listUsers({ page, limit })')
expect(source).not.toContain('SELECT COUNT(*) as total FROM users')
expect(source).not.toContain('FROM users ORDER BY created_at DESC')
```

然后运行：

```bash
npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：失败，原因是 GET Route 仍直接查询连接和 SQL。

- [ ] **步骤 3：最小化改写 GET Route**

将 `users.ts` 顶部 registration import 改为：

```ts
import { getAdminUserService, getUserService } from '../service-registration.js'
```

仅在 GET 处理器中，以：

```ts
const adminUserService = getAdminUserService()
const result = await adminUserService.listUsers({ page, limit })
successResponse(res, result)
```

替换从 `const conn = getConnection()` 起到原 `successResponse` 为止的列表 SQL 块。保留 `getConnection` import，因为本批其余五个 Route 端点仍然需要；不得修改它们。

- [ ] **步骤 4：运行 Route 测试确认 GREEN**

运行：

```bash
npm run test:server -- "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：通过，确认 HTTP 响应、默认分页和 PATCH 原有行为均保持不变，且 GET 使用后台查询 service。

- [ ] **步骤 5：提交 Route 单元**

运行：

```bash
GIT_MASTER=1 git add server/routes/users.ts server/routes/__tests__/users.test.ts server/routes/__tests__/users-di-contract.test.ts
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "refactor(routes): 收敛后台用户列表读取" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：产生一个只含用户列表 Route 委托及其行为/边界测试的原子提交。

### 任务 5：完成针对性验证和计划状态同步

**文件：**
- 修改：`docs/superpowers/plans/2026-07-14-admin-user-list-boundary.md`
- 验证：任务 1 至 4 所列所有 TypeScript 文件。

- [ ] **步骤 1：运行完整针对性测试**

运行：

```bash
npm run test:server -- "server/repositories/__tests__/admin-user-repository.test.ts" "server/services/__tests__/admin-user-service.test.ts" "server/service-registration/__tests__/repository-factories.test.ts" "server/service-registration/__tests__/tokens.test.ts" "server/service-registration/__tests__/admin-user-list-di-contract.test.ts" "server/service-registration/__tests__/composition-contract.test.ts" "server/routes/__tests__/users.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
```

预期：列出的文件全部通过。

- [ ] **步骤 2：运行类型和构建验证**

对所有新增和改动 TypeScript 文件运行 LSP error diagnostics；然后运行：

```bash
npm run build
```

预期：构建退出码为 0。若出现既有无关告警，记录其来源但不修改无关文件。

- [ ] **步骤 3：扫描禁止项并检查差异**

运行：

```bash
rg -n "as any|@ts-ignore|@ts-expect-error|as unknown as" server/repositories/admin-user-repository.ts server/services/admin-user-service.ts server/service-registration/repository-factories.ts server/service-registration/service-registrations.ts server/service-registration/service-getters.ts server/routes/users.ts
GIT_MASTER=1 git diff --check HEAD~4..HEAD
```

预期：禁止项扫描无匹配，差异检查无输出。

- [ ] **步骤 4：更新计划复选框并提交**

将任务 1 至 5 中已完成的复选框改为 `[x]`，然后运行：

```bash
GIT_MASTER=1 git add docs/superpowers/plans/2026-07-14-admin-user-list-boundary.md
GIT_MASTER=1 git diff --cached --check
GIT_MASTER=1 git commit -m "docs(plan): 同步后台用户列表边界状态" -m "由 Sisyphus 执行" -m "Co-authored-by: Sisyphus <noreply@sisyphus.local>"
```

预期：计划状态可追溯，且不混入生产代码变更。

## 计划自审

- 规格覆盖：任务 1 覆盖计数、脱敏投影、排序和参数化；任务 2 覆盖 offset、数值总数和页数；任务 3 覆盖 factory、token、singleton 与 getter；任务 4 覆盖 Route 委托与既有 HTTP 契约；任务 5 覆盖聚焦测试、LSP、构建、禁止项和差异检查。
- 占位符扫描：已检查常见占位词、延后实现标记和模糊的步骤引用；每个代码步骤均提供路径、签名或具体断言。
- 类型一致性：`AdminUserListItem` 与 `AdminUserListOptions` 在 Repository 定义，Service 通过 `AdminUserListRepository` 引用；factory、token、getter、Route 均使用 `AdminUserService` / `getAdminUserService` 的同一名称。
