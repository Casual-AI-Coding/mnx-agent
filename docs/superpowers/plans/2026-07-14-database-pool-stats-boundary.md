# 数据库连接池统计边界实施计划

> **执行约束：** 用户明确禁止 sub agent。本计划在当前会话顺序执行，使用复选框记录事实状态。

**目标：** 将 `/api/stats/pool-stats` 的数据库实现判断和报告组装移入 DI 管理的单用途服务，保持现有 API 语义不变。

**架构：** `DatabasePoolStatsService` 通过 `DatabaseService` 的最小连接读取能力生成报告或返回 `null`；服务注册模块管理其生命周期；stats Route 只将服务结果转换为既有 HTTP 响应。

**技术栈：** Express、TypeScript strict、Vitest、PostgreSQL `pg`、现有轻量 DI Container。

---

## 文件结构

- 新增：`server/services/database-pool-stats-service.ts`
  - 识别支持统计的 PostgreSQL 连接，并生成连接池报告。
- 新增：`server/services/__tests__/database-pool-stats-service.test.ts`
  - 锁定不支持、健康和拥塞三种报告契约。
- 新增：`server/service-registration/__tests__/database-pool-stats-di-contract.test.ts`
  - 锁定服务注册和 getter 公开边界。
- 修改：`server/service-registration/tokens.ts`
  - 增加连接池统计服务 token。
- 修改：`server/service-registration/__tests__/tokens.test.ts`
  - 锁定新增 token 字符串。
- 修改：`server/container.types.ts`
  - 将新增 token 映射为服务类型。
- 修改：`server/service-registration/service-registrations.ts`
  - 将服务注册为 singleton。
- 修改：`server/service-registration/service-getters.ts`
  - 新增服务 getter。
- 修改：`server/routes/stats.ts`
  - 将 `/pool-stats` Route 改为服务调用。
- 修改：`server/routes/__tests__/stats-audit-log-service-contract.test.ts`
  - 锁定 Route 不再导入数据库连接实现。

---

## 任务 1：建立连接池统计服务的 RED 单元测试

**文件：**
- 新增：`server/services/__tests__/database-pool-stats-service.test.ts`
- 新增：`server/services/database-pool-stats-service.ts`

- [x] **步骤 1：写失败测试**

```typescript
import { describe, expect, it } from 'vitest'
import type { DatabaseConnection } from '../../database/connection.js'
import type { DatabaseService } from '../../database/service-async.js'
import { DatabasePoolStatsService, type DatabasePoolStats } from '../database-pool-stats-service.js'

type DatabaseFixture = Pick<DatabaseService, 'getConnection'>
type PoolStatsConnection = DatabaseConnection & { getPoolStats(): DatabasePoolStats }

function createDatabase(connection: DatabaseConnection): DatabaseFixture {
  return { getConnection: () => connection }
}

function createConnection(isPostgres: boolean): DatabaseConnection {
  const connection: DatabaseConnection = {
    async query() { return [] },
    async execute() { return { changes: 0 } },
    async transaction(fn) { return fn(connection) },
    async close() {},
    isPostgres() { return isPostgres },
  }
  return connection
}

function createPoolStatsConnection(stats: DatabasePoolStats): PoolStatsConnection {
  const connection: PoolStatsConnection = {
    ...createConnection(true),
    getPoolStats() { return stats },
  }
  return connection
}

describe('DatabasePoolStatsService', () => {
  it('returns null when the database connection has no PostgreSQL pool statistics capability', () => {
    const service = new DatabasePoolStatsService(createDatabase(createConnection(false)))
    expect(service.getReport()).toBeNull()
  })

  it('returns a healthy report when no requests wait for a connection', () => {
    const service = new DatabasePoolStatsService(createDatabase(createPoolStatsConnection({ totalCount: 4, idleCount: 2, waitingCount: 0 })))
    expect(service.getReport()).toEqual({
      pool: { totalCount: 4, idleCount: 2, waitingCount: 0 },
      status: 'healthy',
      warning: null,
      recommendation: null,
    })
  })

  it('returns a congested report and expansion recommendation above five waiting requests', () => {
    const service = new DatabasePoolStatsService(createDatabase(createPoolStatsConnection({ totalCount: 10, idleCount: 0, waitingCount: 6 })))
    expect(service.getReport()).toEqual({
      pool: { totalCount: 10, idleCount: 0, waitingCount: 6 },
      status: 'congested',
      warning: '6 requests waiting for connection - consider increasing DB_POOL_MAX',
      recommendation: 'Connection pool is under pressure. Consider increasing DB_POOL_MAX environment variable.',
    })
  })
})
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/services/__tests__/database-pool-stats-service.test.ts`

预期：FAIL，原因是 `database-pool-stats-service.js` 尚不存在。

- [x] **步骤 3：实现最小服务**

```typescript
import type { DatabaseConnection } from '../database/connection.js'
import type { DatabaseService } from '../database/service-async.js'

export interface DatabasePoolStats {
  totalCount: number
  idleCount: number
  waitingCount: number
}

export interface DatabasePoolStatsReport {
  pool: DatabasePoolStats
  status: 'healthy' | 'congested'
  warning: string | null
  recommendation: string | null
}

type PoolStatsConnection = DatabaseConnection & { getPoolStats(): DatabasePoolStats }
type PoolStatsDatabase = Pick<DatabaseService, 'getConnection'>

function supportsPoolStats(connection: DatabaseConnection): connection is PoolStatsConnection {
  return connection.isPostgres() && 'getPoolStats' in connection && typeof connection.getPoolStats === 'function'
}

export class DatabasePoolStatsService {
  constructor(private readonly database: PoolStatsDatabase) {}

  getReport(): DatabasePoolStatsReport | null {
    const connection = this.database.getConnection()
    if (!supportsPoolStats(connection)) return null

    const pool = connection.getPoolStats()
    const waitingCount = pool.waitingCount
    return {
      pool,
      status: waitingCount > 0 ? 'congested' : 'healthy',
      warning: waitingCount > 0 ? `${waitingCount} requests waiting for connection - consider increasing DB_POOL_MAX` : null,
      recommendation: waitingCount > 5 ? 'Connection pool is under pressure. Consider increasing DB_POOL_MAX environment variable.' : null,
    }
  }
}
```

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/services/__tests__/database-pool-stats-service.test.ts`

预期：3 个测试通过。

---

## 任务 2：登记 DI token 与类型契约

**文件：**
- 修改：`server/service-registration/tokens.ts`
- 修改：`server/service-registration/__tests__/tokens.test.ts`
- 修改：`server/container.types.ts`

- [x] **步骤 1：先扩展 token 测试**

在 token 对象断言中加入：

```typescript
DATABASE_POOL_STATS_SERVICE: 'databasePoolStatsService',
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/tokens.test.ts`

预期：FAIL，原因是 token 对象缺少 `DATABASE_POOL_STATS_SERVICE`。

- [x] **步骤 3：增加 token 和类型映射**

```typescript
// server/service-registration/tokens.ts
DATABASE_POOL_STATS_SERVICE: 'databasePoolStatsService',

// server/container.types.ts
import type { DatabasePoolStatsService } from './services/database-pool-stats-service.js'

readonly [TOKENS.DATABASE_POOL_STATS_SERVICE]: DatabasePoolStatsService
```

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/service-registration/__tests__/tokens.test.ts server/__tests__/container-types.test.ts`

预期：所有测试通过。

---

## 任务 3：登记和公开连接池统计服务

**文件：**
- 新增：`server/service-registration/__tests__/database-pool-stats-di-contract.test.ts`
- 修改：`server/service-registration/service-registrations.ts`
- 修改：`server/service-registration/service-getters.ts`

- [x] **步骤 1：写失败的 DI 边界契约**

```typescript
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('database pool stats DI contract', () => {
  it('registers the database pool stats service and exposes its getter', async () => {
    const registrations = await readFile('server/service-registration/service-registrations.ts', 'utf8')
    const getters = await readFile('server/service-registration/service-getters.ts', 'utf8')

    expect(registrations).toContain('TOKENS.DATABASE_POOL_STATS_SERVICE')
    expect(registrations).toContain('new DatabasePoolStatsService')
    expect(getters).toContain('export function getDatabasePoolStatsService')
    expect(getters).toContain('TOKENS.DATABASE_POOL_STATS_SERVICE')
  })
})
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/database-pool-stats-di-contract.test.ts`

预期：FAIL，原因是登记与 getter 都尚未出现。

- [x] **步骤 3：注册并公开服务**

```typescript
// server/service-registration/service-registrations.ts
container.registerSingleton(TOKENS.DATABASE_POOL_STATS_SERVICE, (c) => {
  return new DatabasePoolStatsService(c.resolve<DatabaseService>(TOKENS.DATABASE))
})

// server/service-registration/service-getters.ts
export function getDatabasePoolStatsService(): DatabasePoolStatsService {
  return getGlobalContainer().resolve<DatabasePoolStatsService>(TOKENS.DATABASE_POOL_STATS_SERVICE)
}
```

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/service-registration/__tests__/database-pool-stats-di-contract.test.ts server/service-registration/__tests__/composition-contract.test.ts`

预期：所有测试通过，门面继续重导出新增 getter。

---

## 任务 4：迁移 stats Route 并锁定边界

**文件：**
- 修改：`server/routes/stats.ts`
- 修改：`server/routes/__tests__/stats-audit-log-service-contract.test.ts`

- [x] **步骤 1：先扩展 Route 契约测试**

在 stats 路由断言中加入：

```typescript
expect(statsSource).toContain('getDatabasePoolStatsService')
expect(statsSource).not.toContain('../database/connection')
expect(statsSource).not.toContain('PostgresConnection')
expect(statsSource).not.toContain('getConnection(')
```

- [x] **步骤 2：确认 RED**

运行：`npm run test:server -- server/routes/__tests__/stats-audit-log-service-contract.test.ts`

预期：FAIL，原因是现有 Route 仍直接导入并调用数据库连接实现。

- [x] **步骤 3：将 Route 改为服务调用**

```typescript
import { getDatabasePoolStatsService, getLogService } from '../service-registration.js'

router.get('/pool-stats', asyncHandler(async (_req, res) => {
  const report = getDatabasePoolStatsService().getReport()
  if (!report) {
    errorResponse(res, 'Pool stats only available for PostgreSQL', 400)
    return
  }
  successResponse(res, report)
}))
```

- [x] **步骤 4：确认 GREEN**

运行：`npm run test:server -- server/routes/__tests__/stats-audit-log-service-contract.test.ts`

预期：契约测试通过。

---

## 任务 5：诊断、回归与构建验证

- [x] **步骤 1：运行 diagnostics 和禁止项检查**

对新增和修改的 TypeScript 文件运行 `lsp_diagnostics`，并检查：

```bash
grep -nE '\bany\b|@ts-ignore|@ts-expect-error|as[[:space:]]+unknown[[:space:]]+as' \
  server/services/database-pool-stats-service.ts \
  server/services/__tests__/database-pool-stats-service.test.ts \
  server/service-registration/*.ts \
  server/service-registration/__tests__/database-pool-stats-di-contract.test.ts \
  server/routes/stats.ts \
  server/routes/__tests__/stats-audit-log-service-contract.test.ts
git diff --check
```

预期：无新增 diagnostics、无禁止项、无空白错误。

- [x] **步骤 2：运行聚焦测试和路由 DI 契约**

运行：

```bash
npm run test:server -- \
  server/services/__tests__/database-pool-stats-service.test.ts \
  server/service-registration/__tests__/tokens.test.ts \
  server/service-registration/__tests__/database-pool-stats-di-contract.test.ts \
  server/service-registration/__tests__/composition-contract.test.ts \
  server/routes/__tests__/stats-audit-log-service-contract.test.ts \
  server/routes/__tests__/auth-di-contract.test.ts \
  server/routes/__tests__/media-di-contract.test.ts \
  server/routes/__tests__/external-proxy-di-contract.test.ts \
  server/routes/__tests__/settings-di-contract.test.ts \
  server/routes/__tests__/workflows-di-contract.test.ts \
  server/routes/__tests__/users-di-contract.test.ts \
  server/routes/__tests__/admin-workflows-di-contract.test.ts \
  server/routes/__tests__/external-api-logs-di-contract.test.ts
```

预期：所有聚焦测试通过。

- [x] **步骤 3：运行构建**

运行：`npm run build`

预期：命令退出码为 0；既有 `zh.json` 动静态导入分包告警单独记录，不在本轮处理。

---

## 任务 6：原子提交

- [x] **步骤 1：提交设计与计划**

```bash
GIT_MASTER=1 git add docs/superpowers/specs/2026-07-14-database-pool-stats-boundary-design.md docs/superpowers/plans/2026-07-14-database-pool-stats-boundary.md
GIT_MASTER=1 git commit -m "docs(architecture): 规划连接池统计服务边界" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 2：提交连接池统计服务与单元测试**

```bash
GIT_MASTER=1 git add server/services/database-pool-stats-service.ts server/services/__tests__/database-pool-stats-service.test.ts
GIT_MASTER=1 git commit -m "feat(server): 新增连接池统计服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 3：提交 token 与类型契约**

```bash
GIT_MASTER=1 git add server/service-registration/tokens.ts server/service-registration/__tests__/tokens.test.ts server/container.types.ts
GIT_MASTER=1 git commit -m "refactor(container): 登记连接池统计服务契约" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 4：提交服务注册与 getter 契约**

```bash
GIT_MASTER=1 git add server/service-registration/service-registrations.ts server/service-registration/service-getters.ts server/service-registration/__tests__/database-pool-stats-di-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(server): 装配连接池统计服务" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 5：提交 stats Route 边界迁移**

```bash
GIT_MASTER=1 git add server/routes/stats.ts server/routes/__tests__/stats-audit-log-service-contract.test.ts
GIT_MASTER=1 git commit -m "refactor(routes): 移除 stats 路由数据库直连" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 6：提交后检查**

运行：`GIT_MASTER=1 git status --short`。

预期：无输出。
