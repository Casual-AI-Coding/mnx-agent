# LogService Repository Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution. User constraint for this work forbids subagents, so execute task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 domain `LogService` 从 `DatabaseService` God Facade 中解耦，改为直接依赖日志、审计、外部 API 日志仓储，并让统计与审计路由通过该 domain service 访问日志能力。

**Architecture:** 以 `SettingsService` 为参照，domain service 接收仓储实例而不是全局数据库 façade。`service-registration.ts` 负责从 `DatabaseService.getConnection()` 构建仓储并注入 `LogService`，路由只调用 `getLogService()`，不再直接调用日志/审计相关的 `getDatabaseService()` 透传方法。

**Tech Stack:** Express + TypeScript + Vitest + 现有 DI Container + Repository 层。

---

### Task 1: 写计划与基线

**Files:**
- Create: `docs/superpowers/plans/2026-07-06-12-log-service-repository-contract.md`
- Inspect: `server/services/domain/log.service.ts`
- Inspect: `server/database/services/log-service.ts`
- Inspect: `server/routes/stats.ts`
- Inspect: `server/routes/audit.ts`

- [ ] **Step 1: 运行基线测试**

Run: `rtk npm run test:server -- server/services/domain/log.service.test.ts server/repositories/__tests__/log-repository.test.ts server/repositories/__tests__/user-repository.test.ts`

Expected: 现有测试通过，允许既有 sourcemap/deprecation warning。

- [ ] **Step 2: 记录风险边界**

保持 `cron/logs.ts` 的 workflow template 路径不变；本阶段只迁移 `stats.ts` 与 `audit.ts` 的日志/审计读取路径。

### Task 2: RED 契约测试

**Files:**
- Create: `server/services/domain/log-service-di-contract.test.ts`
- Create: `server/routes/__tests__/stats-audit-log-service-contract.test.ts`

- [ ] **Step 1: 写 domain service 契约测试**

测试读取 `server/services/domain/log.service.ts`，断言：

```typescript
expect(source).not.toContain('../../database/service-async')
expect(source).not.toContain('DatabaseService')
expect(source).toContain('LogRepository')
expect(source).toContain('UserRepository')
expect(source).toContain('ExternalApiLogRepository')
```

- [ ] **Step 2: 写路由契约测试**

测试读取 `server/routes/stats.ts` 与 `server/routes/audit.ts`，断言两者包含 `getLogService`，且不包含 `getDatabaseService`。

- [ ] **Step 3: 运行 RED**

Run: `rtk npm run test:server -- server/services/domain/log-service-di-contract.test.ts server/routes/__tests__/stats-audit-log-service-contract.test.ts`

Expected: 旧实现失败，因为 `LogService` 仍导入 `DatabaseService`，且 `stats.ts`/`audit.ts` 仍调用 `getDatabaseService()`。

### Task 3: GREEN 实现

**Files:**
- Modify: `server/services/domain/interfaces/log.interface.ts`
- Modify: `server/services/domain/log.service.ts`
- Modify: `server/services/domain/log.service.test.ts`
- Modify: `server/service-registration.ts`
- Modify: `server/routes/stats.ts`
- Modify: `server/routes/audit.ts`

- [ ] **Step 1: 扩展 `ILogService`**

将旧 `database/services/log-service.ts` 中统计与审计能力纳入 domain 接口：

```typescript
getExecutionStatsOverview(ownerId?: string): Promise<LogStats>
getExecutionStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<readonly { date: string; total: number; success: number; failed: number }[]>
getExecutionStatsDistribution(ownerId?: string): Promise<readonly { type: string; count: number }[]>
getExecutionStatsErrors(limit?: number, ownerId?: string): Promise<readonly { errorSummary: string; count: number }[]>
getAuditLogById(id: string, ownerId?: string): Promise<AuditLog | null>
getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }>
getAuditStats(userId?: string): Promise<AuditStats>
getUniqueRequestPaths(userId?: string): Promise<string[]>
getUniqueAuditUsers(userId?: string): Promise<{ id: string; username: string }[]>
```

- [ ] **Step 2: 重写 `LogService` 构造依赖**

`LogService` 构造函数改为接收 `LogRepository`、`UserRepository`、`ExternalApiLogRepository`，所有原有执行日志方法委托 `logRepo`，审计方法委托 `userRepo`，外部 API 日志方法委托 `externalApiLogRepo`。

- [ ] **Step 3: 更新服务注册**

`TOKENS.LOG_SERVICE` 的 singleton factory 改为：

```typescript
const db = c.resolve<DatabaseService>(TOKENS.DATABASE)
const conn = db.getConnection()
return new LogService(
  new LogRepository(conn),
  new UserRepository(conn),
  c.resolve(TOKENS.EXTERNAL_API_LOG_REPOSITORY)
)
```

- [ ] **Step 4: 迁移 `stats.ts`**

`stats.ts` 删除 `getDatabaseService` 导入，四个统计端点改用 `getLogService()` 的统计方法；`/pool-stats` 保持 `getConnection()`。

- [ ] **Step 5: 迁移 `audit.ts`**

`audit.ts` 删除 `getDatabaseService` 导入，审计列表、统计、路径、用户、详情端点改用 `getLogService()`。

### Task 4: 验证与提交

**Files:**
- Test: `server/services/domain/log.service.test.ts`
- Test: `server/services/domain/log-service-di-contract.test.ts`
- Test: `server/routes/__tests__/stats-audit-log-service-contract.test.ts`
- Test: repository tests covering delegated repositories

- [ ] **Step 1: 运行目标测试**

Run: `rtk npm run test:server -- server/services/domain/log.service.test.ts server/services/domain/log-service-di-contract.test.ts server/routes/__tests__/stats-audit-log-service-contract.test.ts server/repositories/__tests__/log-repository.test.ts server/repositories/__tests__/user-repository.test.ts server/repositories/__tests__/external-api-log.repository.test.ts`

Expected: 全部通过。

- [ ] **Step 2: 运行构建**

Run: `rtk npm run build`

Expected: 构建通过，仅允许既有 Vite locale warning。

- [ ] **Step 3: LSP 与自审**

对所有改动 TypeScript 文件运行 `lsp_diagnostics`。扫描禁用逃逸：`@ts-ignore`、`@ts-expect-error`、`as any`、裸 `any`、非空断言。统计纯 LOC 并记录超过 250 行的历史大文件情况。

- [ ] **Step 4: 原子提交**

按 git-master 检测提交风格，并至少拆成两个提交：计划文档提交、实现与测试提交。所有 git 命令必须带 `GIT_MASTER=1`。
