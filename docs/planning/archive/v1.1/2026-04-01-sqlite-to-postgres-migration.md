# SQLite 到 PostgreSQL 迁移方案

## 1. 项目概述

### 1.1 迁移目标
将 mnx-agent 项目从 SQLite (better-sqlite3) 迁移到 PostgreSQL，使用服务器上已有的 PostgreSQL 16-alpine 容器。

### 1.2 当前状态

| 项目 | 详情 |
|------|------|
| 数据库 | SQLite via `better-sqlite3` |
| 数据表 | 15 个表，28 个索引 |
| 迁移系统 | 自定义迁移系统（7 个迁移） |
| 服务层 | `DatabaseService` 类，1312 行代码 |
| API 风格 | 同步 API (`prepare().get/run/all`) |

### 1.3 目标状态

| 项目 | 详情 |
|------|------|
| 数据库 | PostgreSQL 16-alpine |
| 驱动 | `pg` (node-postgres) |
| API 风格 | 异步 API (`await pool.query()`) |
| 连接池 | 支持连接池管理 |
| 兼容性 | 保留 SQLite 支持（可选） |

---

## 2. 技术方案

### 2.1 驱动选择：pg (node-postgres)

**选择理由：**
- 最小抽象层，保留完整 SQL 控制权
- 原生支持 TypeScript
- 生产级稳定性，被广泛使用
- 连接池内置支持
- 与现有架构匹配（raw SQL 风格）

**替代方案对比：**

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| `pg` | 轻量、原生 SQL、TypeScript 支持 | 需要手动处理异步转换 | ✅ 推荐 |
| `knex` | 查询构建器、迁移工具 | 增加抽象层，学习成本 | ❌ 过度设计 |
| `prisma` | 最佳 TypeScript DX | 重量级 ORM，改变架构 | ❌ 不适合 |
| `drizzle` | TypeScript-first ORM | 社区较小 | ❌ 不适合 |

### 2.2 架构设计

```
server/database/
├── index.ts              # 导出 + 工厂函数
├── connection.ts         # 连接管理（新增）
├── schema.ts             # Schema SQL（重构）
├── schema-pg.ts          # PostgreSQL Schema（新增）
├── migrations.ts         # 迁移系统（重构）
├── service.ts            # 数据服务（重构为异步）
└── types.ts              # TypeScript 类型（保持不变）
```

### 2.3 环境变量设计

```bash
# 数据库类型选择
DB_TYPE=postgres  # 或 'sqlite'

# SQLite 配置（仅 DB_TYPE=sqlite 时使用）
DATABASE_PATH=./data/minimax.db

# PostgreSQL 配置（仅 DB_TYPE=postgres 时使用）
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=minimax

# 连接池配置
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
```

---

## 3. 详细实施计划

### Phase 1: Schema 转换 (Wave 1)

#### Task 1.1: 创建 PostgreSQL Schema 文件

**文件:** `server/database/schema-pg.ts`

**转换规则:**

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `INTEGER DEFAULT 1` (boolean) | `BOOLEAN DEFAULT true` |
| `INTEGER DEFAULT 0` (boolean) | `BOOLEAN DEFAULT false` |
| `datetime('now')` | `CURRENT_TIMESTAMP` |
| `TEXT` | `TEXT` 或 `VARCHAR(n)` |
| JSON as TEXT | `JSONB` |

**示例转换:**

```sql
-- SQLite (before)
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PostgreSQL (after)
CREATE TABLE IF NOT EXISTS cron_jobs (
  id VARCHAR(36) PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Task 1.2: 更新 TypeScript Row Types

**文件:** `server/database/types.ts`

**修改:** 将 `number` 类型改为 `boolean` 用于布尔字段：

```typescript
// Before
export interface CronJobRow {
  is_active: number
  // ...
}

// After
export interface CronJobRow {
  is_active: boolean
  // ...
}
```

---

### Phase 2: 连接层实现 (Wave 2)

#### Task 2.1: 创建数据库连接模块

**新文件:** `server/database/connection.ts`

**功能:**
- 根据环境变量选择数据库类型
- PostgreSQL 连接池管理
- SQLite 单例连接管理
- 优雅关闭支持

```typescript
// 连接抽象接口
interface DatabaseConnection {
  query<T>(sql: string, params?: any[]): Promise<T[]>
  execute(sql: string, params?: any[]): Promise<{ changes: number }>
  transaction<T>(fn: (conn: DatabaseConnection) => Promise<T>): Promise<T>
  close(): Promise<void>
}

// PostgreSQL 实现
class PostgresConnection implements DatabaseConnection { ... }

// SQLite 实现
class SQLiteConnection implements DatabaseConnection { ... }
```

#### Task 2.2: 更新环境变量模板

**文件:** `.env.example`

添加所有 PostgreSQL 配置变量。

---

### Phase 3: 迁移系统重构 (Wave 3)

#### Task 3.1: 更新迁移系统

**文件:** `server/database/migrations.ts`

**关键变更:**

1. **迁移表检测:**
```typescript
// SQLite
const tableExists = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
).get()

// PostgreSQL
const result = await pool.query(
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_migrations')"
)
const tableExists = result.rows[0].exists
```

2. **迁移执行:**
- 支持事务包装
- 使用 PostgreSQL 语法

3. **迁移表结构:**
```sql
-- SQLite
CREATE TABLE _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
)

-- PostgreSQL
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
)
```

---

### Phase 4: 服务层重构 (Wave 4 - 最关键)

#### Task 4.1: 重构 DatabaseService

**文件:** `server/database/service.ts`

**核心变更: 所有方法改为异步**

**转换模式:**

```typescript
// Before (SQLite 同步)
getAllCronJobs(): CronJob[] {
  const rows = this.db.prepare('SELECT * FROM cron_jobs').all() as CronJobRow[]
  return rows.map(rowToCronJob)
}

// After (PostgreSQL 异步)
async getAllCronJobs(): Promise<CronJob[]> {
  const result = await this.pool.query('SELECT * FROM cron_jobs ORDER BY created_at DESC')
  return result.rows.map(rowToCronJob)
}
```

**影响的调用链:**

所有调用 `DatabaseService` 方法的代码都需要使用 `await`：

```
server/index.ts
  └── getDatabase()
  └── runMigrations()

server/routes/*.ts
  └── 所有调用 dbService.xxx() 的地方

server/services/*.ts
  ├── cron-scheduler.ts
  ├── workflow-engine.ts
  ├── task-executor.ts
  ├── queue-processor.ts
  ├── capacity-checker.ts
  ├── websocket-service.ts
  └── notification-service.ts
```

#### Task 4.2: 更新 strftime 函数调用

**文件:** `server/database/service.ts`

**位置:** `getExecutionStatsTrend` 方法 (lines 962-989)

```typescript
// Before (SQLite)
const rows = this.db.prepare(`
  SELECT strftime('${dateFormat}', started_at) as date, ...
`).all()

// After (PostgreSQL)
const rows = await this.pool.query(`
  SELECT TO_CHAR(started_at, '${dateFormat}') as date, ...
`)
```

**格式映射:**
| SQLite | PostgreSQL |
|--------|------------|
| `%Y-%m-%d` | `YYYY-MM-DD` |
| `%Y-%W` | `IYYY-IW` |
| `%Y-%m` | `YYYY-MM` |

---

### Phase 5: 服务层调用更新 (Wave 5)

#### Task 5.1: 更新 server/index.ts

**修改:**
1. 数据库初始化改为异步
2. 服务初始化使用 `await`

```typescript
// Before
const dbService = getDatabase()
runMigrations(dbService.getDatabase())

// After
const dbService = await getDatabase()
await runMigrations(dbService)
```

#### Task 5.2: 更新所有路由

**文件:** `server/routes/*.ts`

所有路由处理器需要使用 `async/await`：

```typescript
// Before
router.get('/jobs', (req, res) => {
  const jobs = dbService.getAllCronJobs()
  res.json(jobs)
})

// After
router.get('/jobs', async (req, res) => {
  const jobs = await dbService.getAllCronJobs()
  res.json(jobs)
})
```

#### Task 5.3: 更新所有服务

**文件:** `server/services/*.ts`

所有服务方法需要支持异步数据库调用。

---

### Phase 6: 验证与测试 (Wave 6)

#### Task 6.1: 创建 PostgreSQL 数据库

```bash
# 连接到 PostgreSQL 容器
docker exec -it postgres psql -U postgres

# 创建数据库
CREATE DATABASE minimax;
```

#### Task 6.2: 配置环境变量

复制 `.env.example` 到 `.env`，填写 PostgreSQL 连接信息。

#### Task 6.3: 运行测试

```bash
# 构建检查
npm run build

# 运行测试
npm run test

# 启动服务器
npm run server
```

#### Task 6.4: 验证功能

- [ ] 服务器启动成功
- [ ] 数据库连接成功
- [ ] 迁移执行成功
- [ ] API 端点正常响应
- [ ] Cron 任务正常调度

---

## 4. 文件修改清单

### 4.1 新增文件

| 文件 | 描述 |
|------|------|
| `server/database/schema-pg.ts` | PostgreSQL Schema 定义 |
| `server/database/connection.ts` | 数据库连接抽象层 |

### 4.2 修改文件

| 文件 | 修改内容 | 工作量 |
|------|---------|--------|
| `server/database/service.ts` | 全部方法改为异步 | 高 |
| `server/database/migrations.ts` | PostgreSQL 迁移支持 | 中 |
| `server/database/types.ts` | Row 类型布尔字段 | 低 |
| `server/database/index.ts` | 导出更新 | 低 |
| `server/index.ts` | 异步初始化 | 低 |
| `.env.example` | 添加 DB 配置 | 低 |
| `package.json` | 添加 pg 依赖 | ✅ 已完成 |

### 4.3 需要更新的路由文件

```
server/routes/
├── text.ts
├── voice.ts
├── image.ts
├── music.ts
├── video.ts
├── videoAgent.ts
├── voiceMgmt.ts
├── files.ts
├── usage.ts
├── capacity.ts
├── cron.ts
├── media.ts
├── templates.ts
├── stats.ts
├── export.ts
└── audit.ts
```

### 4.4 需要更新的服务文件

```
server/services/
├── cron-scheduler.ts
├── workflow-engine.ts
├── task-executor.ts
├── queue-processor.ts
├── capacity-checker.ts
├── websocket-service.ts
└── notification-service.ts
```

---

## 5. 风险评估

### 5.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 异步转换遗漏 | 运行时错误 | 全量代码审查 + TypeScript 严格模式 |
| 事务处理差异 | 数据不一致 | 完整的事务测试用例 |
| 数据类型不兼容 | 数据丢失 | 先在测试环境验证 |

### 5.2 中风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 性能差异 | 响应变慢 | 连接池调优 + 索引优化 |
| 时区处理 | 数据错误 | 统一使用 UTC |
| JSON 存储差异 | 解析错误 | 使用 JSONB 类型 |

### 5.3 低风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 环境变量配置错误 | 启动失败 | 完善的 .env.example |
| 迁移版本冲突 | 迁移失败 | 版本号校验 |

---

## 6. 回滚计划

如果迁移失败，可以通过以下步骤回滚：

1. **保留 SQLite 支持:** 在代码中保留 SQLite 分支，通过环境变量切换
2. **数据备份:** 迁移前备份 SQLite 数据库文件
3. **环境变量回滚:** 将 `DB_TYPE` 改回 `sqlite`

---

## 7. 验证清单

### 7.1 代码验证

- [ ] TypeScript 编译无错误
- [ ] ESLint 检查通过
- [ ] 所有测试通过

### 7.2 功能验证

- [ ] 服务器启动成功
- [ ] PostgreSQL 连接成功
- [ ] 迁移执行成功
- [ ] 所有 API 端点响应正常
- [ ] Cron 任务调度正常
- [ ] WebSocket 连接正常

### 7.3 性能验证

- [ ] API 响应时间 < 200ms
- [ ] 数据库连接池正常工作
- [ ] 无连接泄漏

---

## 8. 时间估算

| Phase | 任务数 | 预估时间 |
|-------|--------|---------|
| Phase 1 | 2 | 1 小时 |
| Phase 2 | 2 | 1 小时 |
| Phase 3 | 1 | 0.5 小时 |
| Phase 4 | 2 | 2 小时 |
| Phase 5 | 3 | 2 小时 |
| Phase 6 | 4 | 1 小时 |
| **总计** | **14** | **7.5 小时** |

---

## 9. 执行建议

1. **先在开发环境验证** - 确保所有变更在开发环境测试通过
2. **分阶段提交** - 每个 Phase 完成后提交，便于回滚
3. **保留 SQLite 支持** - 便于快速回滚和测试对比
4. **完整测试覆盖** - 确保所有功能正常

---

## 10. 需要用户确认

1. **PostgreSQL 密码** - 需要提供 PostgreSQL 容器的密码
2. **数据库名称** - 确认使用 `minimax` 还是其他名称
3. **是否保留 SQLite 支持** - 建议保留，便于回滚
4. **执行时机** - 确认何时开始实施