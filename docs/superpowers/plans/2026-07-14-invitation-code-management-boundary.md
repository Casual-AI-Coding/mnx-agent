# 邀请码管理边界实施计划

> **执行约束：** 用户明确禁止子代理。本计划在当前会话使用 `superpowers:executing-plans` 顺序执行，使用复选框记录事实状态。

**目标：** 将超级管理员邀请码管理 Route 的数据库访问迁移到 DI 管理的 Repository 与应用服务，保持既有 API 行为并隔离注册兑换事务。

**架构：** `InvitationCodeRepository` 负责管理端邀请码持久化、ID 与时间写入；`InvitationCodeService` 负责批量随机码生成和管理用例编排；Route 只处理角色授权、Zod 校验与响应映射。`UserService.register()` 保留原有事务兑换实现，不依赖新模块。

**技术栈：** Express、TypeScript strict、Vitest、PostgreSQL `pg`、Zod、Node `crypto`、既有轻量 DI Container。

---

## 文件结构

- 新增：`server/services/invitation-code-types.ts`
  - 定义管理端邀请码实体、输入 DTO 和仓储端口。
- 新增：`server/services/invitation-code-service.ts`
  - 生成随机邀请码并编排列表、更新和失效用例。
- 新增：`server/services/__tests__/invitation-code-service.test.ts`
  - 锁定批量生成、空更新、刷新读取与失效协作。
- 新增：`server/repositories/invitation-code-repository.ts`
  - 集中管理端邀请码列表、创建、更新、查询和失效 SQL。
- 新增：`server/repositories/__tests__/invitation-code-repository.test.ts`
  - 锁定参数化 SQL、所有权条件和写入数据。
- 新增：`server/service-registration/__tests__/invitation-code-di-contract.test.ts`
  - 锁定 token、类型映射、factory、注册和 getter。
- 新增：`server/routes/__tests__/invitation-codes-di-contract.test.ts`
  - 锁定 Route 不再直接访问数据库实现。
- 修改：`server/service-registration/tokens.ts`
  - 增加邀请码管理服务 token。
- 修改：`server/container.types.ts`
  - 将 token 映射到 `InvitationCodeService`。
- 修改：`server/service-registration/repository-factories.ts`
  - 新增邀请码 Repository 构造 helper。
- 修改：`server/service-registration/service-registrations.ts`
  - 注册邀请码管理服务 singleton。
- 修改：`server/service-registration/service-getters.ts`
  - 新增邀请码管理服务 getter。
- 修改：`server/routes/invitation-codes.ts`
  - 通过服务完成管理端用例。
- 保留：`server/services/__tests__/user-service-race.test.ts`
  - 覆盖注册邀请码原子兑换的并发约束。

---

## 任务 1：建立邀请码管理服务的 RED 单元测试

**文件：**
- 新增：`server/services/__tests__/invitation-code-service.test.ts`
- 新增：`server/services/invitation-code-types.ts`
- 新增：`server/services/invitation-code-service.ts`

- [ ] **步骤 1：写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { InvitationCodeService } from '../invitation-code-service.js'
import type { InvitationCodeRepositoryPort } from '../invitation-code-types.js'

function createRepository(calls: string[]): InvitationCodeRepositoryPort {
  return {
    listByCreator: async () => [],
    findByIdForCreator: async () => null,
    create: async input => { calls.push(`create:${input.code}`) },
    update: async () => { calls.push('update') },
    deactivate: async () => true,
  }
}

describe('InvitationCodeService', () => {
  it('creates one persistent code for every requested batch item', async () => {
    const calls: string[] = []
    const service = new InvitationCodeService(createRepository(calls))

    const result = await service.generateBatch({ count: 2, max_uses: 3, expires_at: null }, 'owner-1')

    expect(result.count).toBe(2)
    expect(result.codes).toHaveLength(2)
    expect(calls).toHaveLength(2)
  })
})
```

- [ ] **步骤 2：确认 RED**

运行：`npm run test:server -- server/services/__tests__/invitation-code-service.test.ts`

预期：失败原因是 `invitation-code-service.js` 尚不存在。

- [ ] **步骤 3：实现最小类型和服务**

```typescript
export interface InvitationCode {
  id: string
  code: string
  created_by: string | null
  created_by_username?: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface GenerateInvitationCodesInput {
  count: number
  max_uses: number
  expires_at?: string | null
}

export interface InvitationCodeUpdateInput {
  max_uses?: number
  expires_at?: string | null
  is_active?: boolean
}

export interface InvitationCodeRepositoryPort {
  listByCreator(creatorId: string): Promise<InvitationCode[]>
  findByIdForCreator(id: string, creatorId: string): Promise<InvitationCode | null>
  create(input: { code: string; creatorId: string; maxUses: number; expiresAt: string | null }): Promise<void>
  update(id: string, creatorId: string, input: InvitationCodeUpdateInput): Promise<void>
  deactivate(id: string, creatorId: string): Promise<boolean>
}
```

```typescript
export class InvitationCodeService {
  constructor(private readonly repository: InvitationCodeRepositoryPort) {}

  async generateBatch(input: GenerateInvitationCodesInput, creatorId: string): Promise<{ count: number; codes: Array<{ code: string; max_uses: number; expires_at: string | null }> }> {
    const codes: Array<{ code: string; max_uses: number; expires_at: string | null }> = []
    for (let index = 0; index < input.count; index += 1) {
      const code = crypto.randomBytes(16).toString('hex').toUpperCase()
      await this.repository.create({ code, creatorId, maxUses: input.max_uses, expiresAt: input.expires_at ?? null })
      codes.push({ code, max_uses: input.max_uses, expires_at: input.expires_at ?? null })
    }
    return { count: codes.length, codes }
  }
}
```

- [ ] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/services/__tests__/invitation-code-service.test.ts`

预期：服务单测通过。

---

## 任务 2：实现邀请码管理 Repository 并保留兑换隔离

**文件：**
- 新增：`server/repositories/invitation-code-repository.ts`
- 新增：`server/repositories/__tests__/invitation-code-repository.test.ts`
- 新增：`server/services/invitation-code-types.ts`
- 保留：`server/services/user-service.ts`
- 保留：`server/services/__tests__/user-service-race.test.ts`

- [ ] **步骤 1：写 Repository 失败测试**

测试必须验证以下可观察契约：

```typescript
expect(query.sql).toContain('WHERE ic.created_by = $1')
expect(execute.sql).toContain('INSERT INTO invitation_codes')
expect(execute.params).toContain('owner-1')
expect(update.sql).toContain('WHERE id = $2 AND created_by = $3')
expect(deactivate.sql).toContain('SET is_active = false')
```

- [ ] **步骤 2：确认 RED**

运行：`npm run test:server -- server/repositories/__tests__/invitation-code-repository.test.ts`

预期：失败原因是 `invitation-code-repository.js` 尚不存在。

- [ ] **步骤 3：实现参数化 Repository**

Repository 的公开方法与边界：

```typescript
export class InvitationCodeRepository implements InvitationCodeRepositoryPort {
  constructor(private readonly connection: DatabaseConnection) {}

  listByCreator(creatorId: string): Promise<InvitationCode[]>
  findByIdForCreator(id: string, creatorId: string): Promise<InvitationCode | null>
  create(input: { code: string; creatorId: string; maxUses: number; expiresAt: string | null }): Promise<void>
  update(id: string, creatorId: string, input: InvitationCodeUpdateInput): Promise<void>
  deactivate(id: string, creatorId: string): Promise<boolean>
}
```

实现要求：

```typescript
await this.connection.execute(
  `INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, expires_at, is_active, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [uuidv4(), input.code, input.creatorId, input.maxUses, 0, input.expiresAt, true, toLocalISODateString()]
)
```

`update()` 仅接受 `max_uses`、`expires_at` 和 `is_active` 三个可选字段；当调用方已有字段时，以参数化占位符构造 SET 子句，并以 `id` 与 `creatorId` 限制更新。`deactivate()` 返回 `changes > 0`。不得把注册兑换条件更新移入该 Repository，也不得修改 `UserService`。

- [ ] **步骤 4：确认 GREEN 与兑换隔离**

运行：

```bash
npm run test:server -- \
  server/repositories/__tests__/invitation-code-repository.test.ts \
  server/services/__tests__/invitation-code-service.test.ts \
  server/services/__tests__/user-service-race.test.ts
```

预期：Repository、服务和既有注册竞争测试通过。

---

## 任务 3：登记 DI 契约

**文件：**
- 修改：`server/service-registration/tokens.ts`
- 修改：`server/container.types.ts`
- 修改：`server/service-registration/repository-factories.ts`
- 修改：`server/service-registration/service-registrations.ts`
- 修改：`server/service-registration/service-getters.ts`
- 新增：`server/service-registration/__tests__/invitation-code-di-contract.test.ts`
- 修改：`server/service-registration/__tests__/tokens.test.ts`

- [ ] **步骤 1：写 DI 失败契约**

```typescript
expect(tokens).toContain("INVITATION_CODE_SERVICE: 'invitationCodeService'")
expect(containerTypes).toContain('TOKENS.INVITATION_CODE_SERVICE')
expect(factories).toContain('createInvitationCodeRepository')
expect(registrations).toContain('new InvitationCodeService')
expect(getters).toContain('export function getInvitationCodeService')
```

- [ ] **步骤 2：确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/invitation-code-di-contract.test.ts`

预期：失败原因是邀请码管理 token、注册和 getter 尚未存在。

- [ ] **步骤 3：实现 token、factory、注册与 getter**

```typescript
// 服务 token
INVITATION_CODE_SERVICE: 'invitationCodeService',

// 仓储构造 helper
export function createInvitationCodeRepository(database: RepositoryDatabase): InvitationCodeRepository {
  return new InvitationCodeRepository(getConnection(database))
}

// 服务注册
container.registerSingleton(TOKENS.INVITATION_CODE_SERVICE, c => {
  return new InvitationCodeService(createInvitationCodeRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
})

// 服务获取器
export function getInvitationCodeService(): InvitationCodeService {
  return getGlobalContainer().resolve<InvitationCodeService>(TOKENS.INVITATION_CODE_SERVICE)
}
```

- [ ] **步骤 4：确认 GREEN**

运行：

```bash
npm run test:server -- \
  server/service-registration/__tests__/invitation-code-di-contract.test.ts \
  server/service-registration/__tests__/tokens.test.ts \
  server/__tests__/container-types.test.ts
```

预期：所有 DI 契约测试通过。

---

## 任务 4：迁移 Route 并锁定 HTTP 边界

**文件：**
- 修改：`server/routes/invitation-codes.ts`
- 新增：`server/routes/__tests__/invitation-codes-di-contract.test.ts`

- [ ] **步骤 1：写 Route 失败契约**

```typescript
expect(source).toContain('getInvitationCodeService')
expect(source).not.toContain('../database/connection')
expect(source).not.toContain('getConnection()')
expect(source).not.toContain('INSERT INTO invitation_codes')
expect(source).not.toContain('UPDATE invitation_codes')
expect(source).not.toContain('new InvitationCodeRepository')
```

- [ ] **步骤 2：确认 RED**

运行：`npm run test:server -- server/routes/__tests__/invitation-codes-di-contract.test.ts`

预期：现有 Route 因直接连接和 SQL 而失败。

- [ ] **步骤 3：替换为服务调用**

保留 `router.use(requireRole(['super']))`、两个 Zod schema、`validate()` 和既有 response helper。替换方式：

```typescript
router.get('/', asyncHandler(async (req, res) => {
  successResponse(res, await getInvitationCodeService().list(req.user!.userId))
}))

router.post('/batch', validate(batchGenerateSchema), asyncHandler(async (req, res) => {
  const result = await getInvitationCodeService().generateBatch(req.body, req.user!.userId)
  successResponse(res, result, 201)
}))
```

对 PATCH，服务返回 `null` 时保留 `邀请码不存在` 404；服务返回未变更状态时保留 `{ message: '无更新内容', data }`；其他情况继续返回更新后的邀请码。对 DELETE，false 继续映射为同一 404，true 继续映射为 `{ message: '邀请码已失效' }`。

- [ ] **步骤 4：确认 GREEN**

运行：

```bash
npm run test:server -- \
  server/routes/__tests__/invitation-codes-di-contract.test.ts \
  server/services/__tests__/invitation-code-service.test.ts \
  server/repositories/__tests__/invitation-code-repository.test.ts
```

预期：Route 边界和管理用例测试通过。

---

## 任务 5：诊断、回归与构建验证

- [ ] **步骤 1：运行 diagnostics、禁止项和空白检查**

对所有新增或修改的 TypeScript 文件运行 `lsp_diagnostics`，扫描类型逃逸与忽略指令，并运行：

```bash
GIT_MASTER=1 git diff --check
```

预期：无新增 diagnostics、无禁止项、无空白错误。

- [ ] **步骤 2：运行聚焦回归**

```bash
npm run test:server -- \
  server/services/__tests__/invitation-code-service.test.ts \
  server/repositories/__tests__/invitation-code-repository.test.ts \
  server/services/__tests__/user-service-race.test.ts \
  server/service-registration/__tests__/invitation-code-di-contract.test.ts \
  server/service-registration/__tests__/tokens.test.ts \
  server/__tests__/container-types.test.ts \
  server/routes/__tests__/invitation-codes-di-contract.test.ts \
  server/routes/__tests__/auth-di-contract.test.ts \
  server/routes/__tests__/media-di-contract.test.ts \
  server/routes/__tests__/external-proxy-di-contract.test.ts \
  server/routes/__tests__/settings-di-contract.test.ts \
  server/routes/__tests__/workflows-di-contract.test.ts \
  server/routes/__tests__/users-di-contract.test.ts \
  server/routes/__tests__/admin-workflows-di-contract.test.ts \
  server/routes/__tests__/external-api-logs-di-contract.test.ts
```

预期：聚焦测试通过；完整套件与 lint 的既有基线若仍失败，单独记录而不混入本切片。

- [ ] **步骤 3：运行构建**

运行：`npm run build`

预期：命令退出码为 0；既有 `zh.json` 动静态导入分包告警单独记录。

---

## 任务 6：原子提交

- [ ] **步骤 1：提交设计与计划**

```bash
GIT_MASTER=1 git add docs/superpowers/specs/2026-07-14-invitation-code-management-boundary-design.md docs/superpowers/plans/2026-07-14-invitation-code-management-boundary.md
GIT_MASTER=1 git commit -m "docs(architecture): 规划邀请码管理分层边界" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 2：提交邀请码应用服务与单测**

```bash
GIT_MASTER=1 git add server/services/invitation-code-types.ts server/services/invitation-code-service.ts server/services/__tests__/invitation-code-service.test.ts
GIT_MASTER=1 git commit -m "feat(server): 新增邀请码管理服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 3：提交邀请码管理 Repository 与单测**

```bash
GIT_MASTER=1 git add server/repositories/invitation-code-repository.ts server/repositories/__tests__/invitation-code-repository.test.ts
GIT_MASTER=1 git commit -m "feat(server): 新增邀请码管理仓储" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 4：提交邀请码服务 token 契约**

```bash
GIT_MASTER=1 git add server/service-registration/tokens.ts server/service-registration/__tests__/tokens.test.ts server/container.types.ts
GIT_MASTER=1 git commit -m "refactor(container): 登记邀请码管理服务 token" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 5：提交 DI 装配与契约**

```bash
GIT_MASTER=1 git add server/service-registration/repository-factories.ts server/service-registration/service-registrations.ts server/service-registration/service-getters.ts server/service-registration/__tests__/invitation-code-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(container): 装配邀请码管理服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 6：提交 Route 边界迁移**

```bash
GIT_MASTER=1 git add server/routes/invitation-codes.ts server/routes/__tests__/invitation-codes-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(routes): 移除邀请码路由数据库直连" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 7：提交后检查**

运行：`GIT_MASTER=1 git status --short`

预期：无输出。
