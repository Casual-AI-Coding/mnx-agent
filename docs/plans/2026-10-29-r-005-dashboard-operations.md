# R-005 Dashboard 运营总览 实现计划

> 状态：已完成（2026-10-29） | 版本：v3.2.0

## 需求回顾

将首页从快捷入口升级为运营总览：API 使用量、配额状态、失败率、平均耗时、
最近失败任务、DLQ 摘要、容量风险、系统健康状态和常用操作入口。

需求来源：`docs/roadmap/requirement-pools.md` R-005（UX / P2 / v3.2）

## 设计决策

1. **单一聚合端点**：`GET /api/stats/operations` 一次返回六个板块
   （执行统计 / 服务分布 / 最近失败 / DLQ / 容量 / 系统健康），
   避免首页串行发六个请求。
2. **板块独立降级**：六个板块 `Promise.all` 并发查询，单一板块失败返回
   `{ error }`，不阻塞整体 —— 运营总览的可用性优先于完整性。
3. **容量风险基于本地快照**：读 `capacity_tracking` 表（CapacityService.getAll），
   不触发外部 MiniMax API 调用；剩余配额 < 20% 判定为风险。
4. **Route → Domain Service → Repository**：新建 `DashboardService`
   只编排领域服务，不直接写 SQL；注册为 `DASHBOARD_SERVICE` 单例。
5. **owner 隔离**：执行统计 / 失败任务 / DLQ 按请求者 owner_id 过滤；
   容量与系统健康为全局视图（与既有 `/api/capacity`、`/api/stats/pool-stats` 口径一致）。
6. **前端组件化**：Dashboard.tsx 保持 300 行上限，运营总览拆为四个组件；
   WS job/task 事件到达自动刷新，辅以手动刷新按钮。

## Wave 划分

| Wave | 内容 | 提交 |
|------|------|------|
| 1 | 服务端：DashboardService + getRecentFailed/countUnresolved + /operations 端点 + 测试 | `feat(stats)` |
| 2 | 前端：api client 扩展 + 四组件 + Dashboard 重构 + 组件测试 | `feat(dashboard)` |
| 3 | 文档：计划 / roadmap / CHANGELOG / 版本号 | `docs` |

## 变更文件清单

### 服务端

- `server/services/domain/dashboard.service.ts`（新增）— 运营总览聚合服务
- `server/services/domain/interfaces/dashboard.interface.ts`（新增）— IDashboardService + 板块类型
- `server/repositories/log-repository.ts` — 新增 `getRecentFailed(limit, ownerId)`
- `server/repositories/deadletter-repository.ts` — 新增 `countUnresolved(ownerId)`
- `server/services/domain/log.service.ts` / `task.service.ts` — 透传新方法
- `server/services/domain/interfaces/log.interface.ts` / `task.interface.ts` — 接口扩展
- `server/service-registration/` — DASHBOARD_SERVICE token / 单例注册 / getter
- `server/routes/stats.ts` — `GET /operations`
- 测试：`dashboard.service.test.ts`（5 用例）、`stats-operations.test.ts`（3 集成用例，幂等种子）

### 前端

- `src/lib/api/stats.ts` — `getOperationsOverview` + 板块类型
- `src/components/dashboard/OperationsCards.tsx` — 四指标卡（失败率 > 20% 红色告警）
- `src/components/dashboard/SystemHealthStrip.tsx` — 健康 / DLQ / 容量风险三卡
- `src/components/dashboard/ServiceDistribution.tsx` — 服务占比条形
- `src/components/dashboard/RecentFailures.tsx` — 最近失败明细
- `src/components/dashboard/RecentActivityCard.tsx` — 最近活动（自 Dashboard 抽取）
- `src/pages/Dashboard.tsx` — 运营总览编排（246 行）
- 测试：`dashboard-operations.test.tsx`（10 用例）

## 验证清单

- [x] `npx tsc --noEmit`（前端 + 服务端）零错误
- [x] `npx vitest run --config vitest.server.config.ts` 164 文件 / 2211 用例全绿
- [x] `npx vitest run` 前端 245 文件 / 3009 用例全绿
- [x] `npm run build` 通过
- [x] 新增/改动文件 ESLint 无错误无警告（仓库存量 lint 债务不在本批次范围）
- [x] stats 路由契约测试（只经 LogService/聚合服务，不直连 DatabaseService）保持通过

## 后续（不属于本批次）

- R-022 用量监控完善：TokenMonitor 复用 `/operations` 的容量与执行统计板块
- R-016 全局通知中心：通知 store 订阅同一批 WS 事件
