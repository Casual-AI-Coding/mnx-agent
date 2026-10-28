# 生产环境验证清单（工作流 / 定时任务 / DLQ）

> 对应需求：R-006 | 更新：2026-10-29
> 自动化部分：`npx vitest run --config vitest.server.config.ts server/__tests__/production-readiness.test.ts`（4 链路全绿）
> 手工部分按下表逐项勾选，全部通过方可视为投产就绪。

## A. 部署前检查

- [ ] 数据库迁移执行完毕（`db.init()` 幂等，migration 至 041+）
- [ ] 环境变量就绪：`DB_*`、`MINIMAX_API_KEY`（未配置时为 mock 客户端，真实调用必失败）、`JWT_SECRET`
- [ ] `system_config` 关键项确认：`proxy.allowed_hosts`（外部代理白名单）、`ratelimit.service_rpm`（可选覆盖）
- [ ] 备份链路可用：`server/services/backup-service.ts` 的本地/云端快照手工跑一次
- [ ] 反向代理 / WebSocket 升级配置正确（SSE 与 WS 通道）

## B. 功能链路验证（部署后）

- [ ] **定时任务**：创建真实 cron 任务（近期触发一次）→ 执行日志出现记录 → `execution_log_details` 有节点明细
- [ ] **任务队列**：任务从 `task_queue` 被消费 → 状态流转 pending → completed/failed
- [ ] **失败流转**：故意制造失败（无效参数）→ 重试耗尽后进入死信队列 → DLQ 页可见且未解决计数 +1
- [ ] **DLQ 重试**：单条重试 → 新队列任务生成 → 原条目 `resolution='retried'` → 计数回落
- [ ] **工作流**：Builder 测试运行（dryRun）通过 → 真实运行一次线性模板 → 日志与媒体产物落库
- [ ] **通知联动**：失败任务 / DLQ 事件出现在通知中心；错误 Toast 即时弹出
- [ ] **运营统计**：仪表盘指标卡 / 服务分布 / DLQ 计数与数据库实况一致（对照 `/api/stats/operations`）

## C. 隔离与安全验证

- [ ] 两个普通用户互不可见对方的任务 / DLQ / 执行日志（owner 隔离）
- [ ] admin/super 可见全局视图，统计口径一致
- [ ] 管理端点（/api/admin/*）对普通用户返回 403
- [ ] 审计日志记录管理操作且 trace_id 贯通

## D. 观测与回滚

- [ ] 健康检查：`/api/stats/operations` 的 health 板块 database=true、连接池 non-null
- [ ] 结构化日志按 trace_id 可检索（R-013）
- [ ] Sentry 事件上报可达（R-014，可选）
- [ ] 回滚方案：上一版本镜像 + 数据库迁移前快照；DLQ/任务表数据在版本间兼容

## E. 验证记录

| 日期 | 环境 | 验证人 | 结果 | 备注 |
|------|------|--------|------|------|
| 2026-10-29 | 本地测试库（自动化 4 链路） | CI（vitest） | ✅ 全绿 | 顺带修复 DLQ owner_id 缺失缺陷 |
| | | | | |
