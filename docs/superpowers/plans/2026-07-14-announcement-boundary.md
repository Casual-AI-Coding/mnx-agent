# 公告管理边界实施计划

> **执行约束：** 用户明确禁止子代理。本计划在当前会话使用 `superpowers:executing-plans` 顺序执行，使用复选框记录事实状态。

**目标：** 将公告管理 Route 的数据库访问迁移到 DI 管理的 Repository 与应用服务，保持现有 API 行为不变。

**架构：** `AnnouncementRepository` 承担公告 SQL 和审计字段持久化；`AnnouncementService` 通过最小仓储端口提供用例；Route 只做认证、校验和响应映射；服务注册模块管理对象生命周期。

**技术栈：** Express、TypeScript strict、Vitest、PostgreSQL `pg`、Zod、既有轻量 DI Container。

---

## 文件结构

- 新增：`server/repositories/announcement-repository.ts`
  - 集中公告查询、创建、更新和软删除 SQL。
- 新增：`server/services/announcement-service.ts`
  - 定义最小仓储端口并提供公告应用用例。
- 新增：`server/services/announcement-types.ts`
  - 定义公告实体、输入 DTO 和仓储端口，供服务与仓储共同依赖。
- 新增：`server/services/__tests__/announcement-service.test.ts`
  - 锁定服务与仓储端口的查询、更新和删除协作。
- 新增：`server/repositories/__tests__/announcement-repository.test.ts`
  - 锁定公告 SQL、审计字段与软删除的持久化契约。
- 新增：`server/service-registration/__tests__/announcement-di-contract.test.ts`
  - 锁定 token、注册与 getter 边界。
- 新增：`server/routes/admin/__tests__/announcements-di-contract.test.ts`
  - 锁定公告 Route 不再直接访问数据库实现。
- 修改：`server/service-registration/tokens.ts`
  - 增加公告服务 token。
- 修改：`server/container.types.ts`
  - 将 token 映射到 `AnnouncementService`。
- 修改：`server/service-registration/repository-factories.ts`
  - 新增公告仓储构造 helper。
- 修改：`server/service-registration/service-registrations.ts`
  - 注册公告服务 singleton。
- 修改：`server/service-registration/service-getters.ts`
  - 新增公告服务 getter。
- 修改：`server/routes/admin/announcements.ts`
  - Route 改为应用服务调用。
- 保留：`server/routes/admin/__tests__/announcements.test.ts`
  - 继续用真实测试数据库覆盖 Repository SQL、时间窗口与 HTTP 兼容性。

---

## 任务 1：建立公告服务的 RED 单元测试

**文件：**
- 新增：`server/services/__tests__/announcement-service.test.ts`
- 新增：`server/services/announcement-types.ts`
- 新增：`server/services/announcement-service.ts`

- [x] **步骤 1：写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import { AnnouncementService } from '../announcement-service.js'
import type {
  Announcement,
  AnnouncementRepositoryPort,
} from '../announcement-types.js'

function createAnnouncement(id: string): Announcement {
  return {
    id,
    title: '系统公告',
    content: '公告内容',
    severity: 'info',
    status: 'draft',
    starts_at: null,
    ends_at: null,
    owner_id: 'owner-1',
    created_by: 'owner-1',
    updated_by: 'owner-1',
    created_at: '2026-07-14 00:00:00',
    updated_at: '2026-07-14 00:00:00',
    deleted_at: null,
    is_deleted: false,
  }
}

function createRepository(calls: string[]): AnnouncementRepositoryPort {
  let findCount = 0
  return {
    findActive: async () => [],
    list: async () => [],
    findById: async () => {
      calls.push('find')
      return findCount++ === 0 ? createAnnouncement('announcement-1') : createAnnouncement('announcement-1')
    },
    create: async () => createAnnouncement('created-1'),
    update: async () => { calls.push('update') },
    softDelete: async () => true,
  }
}

describe('AnnouncementService', () => {
  it('checks an announcement before updating and returns the refreshed entity', async () => {
    const calls: string[] = []
    const repository = createRepository(calls)
    const service = new AnnouncementService(repository)

    await expect(service.update('announcement-1', { status: 'published' }, 'owner-1')).resolves.toMatchObject({ id: 'announcement-1' })
    expect(calls).toEqual(['find', 'update', 'find'])
  })
})
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/services/__tests__/announcement-service.test.ts`

预期：FAIL，原因是 `announcement-service.js` 尚不存在。

- [x] **步骤 3：实现最小服务**

```typescript
export type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'error'
export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export interface Announcement {
  id: string
  title: string
  content: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  starts_at: string | null
  ends_at: string | null
  owner_id: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_deleted: boolean
  created_by_username?: string | null
  updated_by_username?: string | null
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  starts_at?: string | null
  ends_at?: string | null
}

export interface AnnouncementUpdateInput {
  title?: string
  content?: string
  severity?: AnnouncementSeverity
  status?: AnnouncementStatus
  starts_at?: string | null
  ends_at?: string | null
}

export interface AnnouncementRepositoryPort {
  findActive(): Promise<Announcement[]>
  list(): Promise<Announcement[]>
  findById(id: string): Promise<Announcement | null>
  create(input: CreateAnnouncementInput, actorId: string): Promise<Announcement | null>
  update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<void>
  softDelete(id: string, actorId: string): Promise<boolean>
}
```

```typescript
import type {
  Announcement,
  AnnouncementRepositoryPort,
  AnnouncementUpdateInput,
  CreateAnnouncementInput,
} from './announcement-types.js'

export class AnnouncementService {
  constructor(private readonly repository: AnnouncementRepositoryPort) {}

  async getActive(): Promise<Announcement[]> { return this.repository.findActive() }
  async getAll(): Promise<Announcement[]> { return this.repository.list() }
  async create(input: CreateAnnouncementInput, actorId: string): Promise<Announcement | null> { return this.repository.create(input, actorId) }
  async update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<Announcement | null> {
    const existing = await this.repository.findById(id)
    if (!existing) return null
    await this.repository.update(id, input, actorId)
    return this.repository.findById(id)
  }
  async delete(id: string, actorId: string): Promise<boolean> { return this.repository.softDelete(id, actorId) }
}
```

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/services/__tests__/announcement-service.test.ts`

预期：服务单测通过。

---

## 任务 2：实现公告 Repository 并登记 DI 契约

**文件：**
- 新增：`server/repositories/announcement-repository.ts`
- 新增：`server/repositories/__tests__/announcement-repository.test.ts`
- 新增：`server/services/announcement-types.ts`
- 修改：`server/service-registration/tokens.ts`
- 修改：`server/container.types.ts`
- 修改：`server/service-registration/repository-factories.ts`
- 修改：`server/service-registration/service-registrations.ts`
- 修改：`server/service-registration/service-getters.ts`
- 新增：`server/service-registration/__tests__/announcement-di-contract.test.ts`

- [x] **步骤 1：写失败的 DI 契约**

```typescript
expect(registrations).toContain('TOKENS.ANNOUNCEMENT_SERVICE')
expect(registrations).toContain('new AnnouncementService')
expect(getters).toContain('export function getAnnouncementService')
expect(getters).toContain('TOKENS.ANNOUNCEMENT_SERVICE')
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/announcement-di-contract.test.ts`

预期：FAIL，原因是公告服务 token、注册和 getter 尚未存在。

- [x] **步骤 3：实现仓储与装配**

Repository 使用参数化 SQL 实现以下操作：

```typescript
findActive(): Promise<Announcement[]>
list(): Promise<Announcement[]>
findById(id: string): Promise<Announcement | null>
create(input: CreateAnnouncementInput, actorId: string): Promise<Announcement | null>
update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<void>
softDelete(id: string, actorId: string): Promise<boolean>
```

核心实现遵循当前 Route 语义：

```typescript
export class AnnouncementRepository implements AnnouncementRepositoryPort {
  constructor(private readonly connection: DatabaseConnection) {}

  async findActive(): Promise<Announcement[]> {
    return this.connection.query<Announcement>(`
      SELECT * FROM announcements
      WHERE is_deleted = false
        AND status = 'published'
        AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
        AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `)
  }

  async findById(id: string): Promise<Announcement | null> {
    const rows = await this.connection.query<Announcement>(
      'SELECT * FROM announcements WHERE id = $1 AND is_deleted = false',
      [id]
    )
    return rows[0] ?? null
  }

  async update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<void> {
    const fields: string[] = []
    const values: unknown[] = []
    let index = 1
    if (input.title !== undefined) { fields.push(`title = $${index++}`); values.push(input.title) }
    if (input.content !== undefined) { fields.push(`content = $${index++}`); values.push(input.content) }
    if (input.severity !== undefined) { fields.push(`severity = $${index++}`); values.push(input.severity) }
    if (input.status !== undefined) { fields.push(`status = $${index++}`); values.push(input.status) }
    if (input.starts_at !== undefined) { fields.push(`starts_at = $${index++}`); values.push(input.starts_at) }
    if (input.ends_at !== undefined) { fields.push(`ends_at = $${index++}`); values.push(input.ends_at) }
    fields.push(`updated_by = $${index++}`)
    values.push(actorId)
    fields.push(`updated_at = $${index++}`)
    values.push(toLocalISODateString())
    values.push(id)
    await this.connection.execute(
      `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${index} AND is_deleted = false`,
      values
    )
  }
}
```

在注册模块中使用仓储 factory 创建服务：

```typescript
container.registerSingleton(TOKENS.ANNOUNCEMENT_SERVICE, (c) => {
  return new AnnouncementService(createAnnouncementRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
})
```

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/services/__tests__/announcement-service.test.ts server/service-registration/__tests__/announcement-di-contract.test.ts server/service-registration/__tests__/tokens.test.ts server/__tests__/container-types.test.ts`

预期：所有服务与 DI 契约测试通过。

---

## 任务 3：迁移 Route 并锁定 HTTP 边界

**文件：**
- 修改：`server/routes/admin/announcements.ts`
- 新增：`server/routes/admin/__tests__/announcements-di-contract.test.ts`

- [x] **步骤 1：先扩展 Route 契约**

在独立 Route 契约测试中读取源码并断言：

```typescript
expect(source).toContain('getAnnouncementService')
expect(source).not.toContain('../../database/connection')
expect(source).not.toContain('getConnection()')
expect(source).not.toContain('INSERT INTO announcements')
expect(source).not.toContain('UPDATE announcements')
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/routes/admin/__tests__/announcements-di-contract.test.ts`

预期：Route 契约因现有直接连接访问而失败。

- [x] **步骤 3：改为应用服务调用**

保留 `requireRole`、Zod schema、时间窗口校验、`getAuthenticatedUserId`、既有错误文案和 `successResponse` 系列调用；将活跃查询、列表、创建、更新和软删除委托给 `getAnnouncementService()`。

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/routes/admin/__tests__/announcements-di-contract.test.ts server/routes/admin/__tests__/announcements.test.ts`

预期：现有公告集成测试与新增 Route 契约测试通过。

---

## 任务 4：诊断、回归与构建验证

- [x] **步骤 1：运行 diagnostics 和禁止项检查**

对新增和修改 TypeScript 文件运行 `lsp_diagnostics`，使用项目既有的禁止类型逃逸扫描命令，并运行：

```bash
GIT_MASTER=1 git diff --check
```

预期：无新增 diagnostics、无禁止项、无空白错误。

- [x] **步骤 2：运行聚焦测试与现有路由 DI 契约**

运行：

```bash
npm run test:server -- \
  server/services/__tests__/announcement-service.test.ts \
  server/repositories/__tests__/announcement-repository.test.ts \
  server/service-registration/__tests__/announcement-di-contract.test.ts \
  server/service-registration/__tests__/tokens.test.ts \
  server/__tests__/container-types.test.ts \
  server/routes/admin/__tests__/announcements-di-contract.test.ts \
  server/routes/admin/__tests__/announcements.test.ts \
  server/routes/__tests__/auth-di-contract.test.ts \
  server/routes/__tests__/media-di-contract.test.ts \
  server/routes/__tests__/external-proxy-di-contract.test.ts \
  server/routes/__tests__/settings-di-contract.test.ts \
  server/routes/__tests__/workflows-di-contract.test.ts \
  server/routes/__tests__/users-di-contract.test.ts \
  server/routes/__tests__/admin-workflows-di-contract.test.ts \
  server/routes/__tests__/external-api-logs-di-contract.test.ts
```

预期：聚焦测试通过。

- [x] **步骤 3：运行构建**

运行：`npm run build`

预期：命令退出码为 0；既有 `zh.json` 动静态导入分包告警单独记录。

---

## 任务 5：原子提交

- [ ] **步骤 1：提交设计与计划**

```bash
GIT_MASTER=1 git add docs/superpowers/specs/2026-07-14-announcement-boundary-design.md docs/superpowers/plans/2026-07-14-announcement-boundary.md
GIT_MASTER=1 git commit -m "docs(architecture): 规划公告管理分层边界" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 2：提交公告类型、应用服务与单测**

```bash
GIT_MASTER=1 git add server/services/announcement-types.ts server/services/announcement-service.ts server/services/__tests__/announcement-service.test.ts
GIT_MASTER=1 git commit -m "feat(server): 新增公告应用服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 3：提交公告 Repository 与单测**

```bash
GIT_MASTER=1 git add server/repositories/announcement-repository.ts server/repositories/__tests__/announcement-repository.test.ts
GIT_MASTER=1 git commit -m "feat(server): 新增公告持久化仓储" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 4：提交公告服务 token 契约**

```bash
GIT_MASTER=1 git add server/service-registration/tokens.ts server/service-registration/__tests__/tokens.test.ts server/container.types.ts
GIT_MASTER=1 git commit -m "refactor(container): 登记公告服务 token 契约" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 5：提交 DI 装配与契约**

```bash
GIT_MASTER=1 git add server/service-registration/repository-factories.ts server/service-registration/service-registrations.ts server/service-registration/service-getters.ts server/service-registration/__tests__/announcement-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(container): 装配公告管理服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 6：提交 Route 边界迁移**

```bash
GIT_MASTER=1 git add server/routes/admin/announcements.ts server/routes/admin/__tests__/announcements-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(routes): 移除公告路由数据库直连" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [ ] **步骤 7：提交后检查**

运行：`GIT_MASTER=1 git status --short`。

预期：无输出。
