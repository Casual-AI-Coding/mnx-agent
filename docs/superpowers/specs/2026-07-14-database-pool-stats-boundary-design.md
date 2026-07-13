# 数据库连接池统计边界设计

## 背景

`server/routes/stats.ts` 的 `/pool-stats` 路由目前直接导入 `getConnection()` 与 `PostgresConnection`，并在 HTTP 层完成 PostgreSQL 判定、连接池统计读取、健康状态和告警文案组装。

这使 Route 同时承担协议适配与数据库实现判断，违反既有的 Route → Service → Repository 单向依赖。连接池统计是运行时基础设施可观测性，不属于执行日志领域服务的职责。

## 目标

引入 `DatabasePoolStatsService`，将连接池能力识别和统计报告组装集中到服务层，使 `/api/stats/pool-stats` 仅调用服务并保留原有成功响应和 PostgreSQL 不可用时的 400 响应。

成功标准：

- Route 不再导入 `getConnection()` 或 `PostgresConnection`。
- Route 不再直接识别 PostgreSQL 连接或读取 pool 计数。
- 可用连接池返回的 `pool`、`status`、`warning` 与 `recommendation` 字段和阈值保持不变。
- 不支持统计的连接继续返回 `null`，由 Route 映射为既有 400 错误。
- 服务通过既有 DI 容器登记和解析，不创建新的全局状态。
- 不修改数据库连接生命周期、SQL、鉴权、owner 隔离或公开路由路径。

## 方案

### 推荐方案：基础设施统计服务加 DI 门面

新增 `server/services/database-pool-stats-service.ts`。服务构造函数只接收 `Pick<DatabaseService, 'getConnection'>`，通过结构化能力判断确认连接同时满足 PostgreSQL 标识和 `getPoolStats()` 方法后生成报告。

服务导出两类稳定数据：

- `DatabasePoolStats`：`totalCount`、`idleCount`、`waitingCount`。
- `DatabasePoolStatsReport`：保留当前 HTTP 成功体中的 `pool`、`status`、`warning`、`recommendation`。

如果连接不支持统计，`getReport()` 返回 `null`。Route 保留当前 `Pool stats only available for PostgreSQL` 错误文本和 400 状态码，从而将传输协议决策限定在 Route。

服务通过 `DATABASE_POOL_STATS_SERVICE` token 在 `service-registrations.ts` 注册，通过 `getDatabasePoolStatsService()` 在 `service-getters.ts` 解析。`stats.ts` 只调用该 getter 和 `getReport()`。

### 不采用的方案：在 LogService 中增加连接池方法

`LogService` 处理执行日志、审计日志和外部 API 日志。连接池状态不是日志聚合，加入该服务会混合独立的基础设施监控职责。

### 不采用的方案：让 Route 保留类型判断

即使把 `getPoolStats()` 包装为小函数，Route 仍会依赖 PostgreSQL 实现和运行时类型判断，不能解决分层边界问题。

## 模块边界

| 模块 | 输入 | 输出 | 禁止职责 |
| --- | --- | --- | --- |
| `database-pool-stats-service.ts` | `DatabaseService` 的连接读取能力 | 连接池报告或 `null` | HTTP 请求、HTTP 响应、全局容器读取 |
| `service-registrations.ts` | 显式 `Container` | 服务 singleton 登记 | 连接池报告决策、HTTP 处理 |
| `service-getters.ts` | 全局容器与 token | `getDatabasePoolStatsService()` | 服务构造、Route 响应组装 |
| `routes/stats.ts` | 认证请求和统计服务 | 既有 API 响应 | PostgreSQL 类型判断、连接对象访问 |

依赖方向：

```text
stats.ts ───────────────────────────> service-registration.ts
service-getters.ts ─────────────────> DatabasePoolStatsService
service-registrations.ts ───────────> DatabasePoolStatsService
DatabasePoolStatsService ───────────> DatabaseService + DatabaseConnection 能力
```

## 场景契约

### 场景 1：不支持连接池统计

Given：数据库连接不是 PostgreSQL，或没有 `getPoolStats()` 能力。

When：`DatabasePoolStatsService.getReport()` 被调用。

Then：返回 `null`，Route 返回既有 400 错误响应。

### 场景 2：健康连接池

Given：PostgreSQL 连接返回 `waitingCount` 为 0。

When：服务生成报告。

Then：`status` 是 `healthy`，`warning` 与 `recommendation` 都是 `null`。

### 场景 3：拥塞连接池

Given：PostgreSQL 连接返回大于 0 的 `waitingCount`。

When：服务生成报告。

Then：`status` 是 `congested`，`warning` 保留当前等待请求文案；仅当等待数大于 5 时返回当前扩容建议文案。

### 场景 4：Route 边界

Given：客户端请求 `/api/stats/pool-stats`。

When：Route 加载。

Then：Route 通过服务 getter 获取报告，不导入数据库连接实现。

## 测试策略

1. 先为 `DatabasePoolStatsService` 写能力缺失、健康和拥塞报告的单元测试，并确认实现不存在时失败。
2. 实现最小服务并确认单元测试变绿。
3. 更新 token 契约测试，先确认新 token 缺失时失败，再登记 token 并更新类型映射。
4. 为 DI 注册和 getter 添加源代码契约测试，确认它们缺失时失败，再注册并公开服务。
5. 扩展 stats Route 契约测试，先锁定其不应再导入数据库连接实现，再迁移调用。
6. 运行服务单测、服务注册契约、stats Route 契约、路由 DI 契约和构建。

## 本轮明确不做

- 不修改 `DatabaseConnection` 接口、`PostgresConnection` 实现或连接池配置。
- 不修改 `/api/stats/pool-stats` 路径、鉴权、成功体、错误文本或状态码。
- 不添加新的监控端点、指标采集器、缓存或告警发送能力。
- 不迁移其它 stats Route 到新的领域服务。
- 不修复当前切片外的全量测试与 lint 基线问题。

## 自审结论

该切片仅把已有的基础设施判断和报告组装移动到单用途服务。它降低 Route 与 PostgreSQL 实现的耦合，并通过最小能力注入、DI 契约和 Route 文本契约保持可测试性与兼容性。
