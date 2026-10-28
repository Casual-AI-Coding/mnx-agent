# 工作流 / 定时任务 / 死信队列 运维使用指南

> 对应需求：R-006 工作流/DLQ 投产验证 | 更新：2026-10-29
> 自动化验证：`npx vitest run --config vitest.server.config.ts server/__tests__/production-readiness.test.ts`

---

## 1. 工作流引擎

### 1.1 概念

- **模板（Workflow Template）**：节点 + 边的 DAG 定义，存于 `workflow_templates`（含版本表 `workflow_versions`）。
- **节点类型**：action（服务调用）、condition（条件分支）、loop（迭代）、transform（数据变换）等，执行器注册于 `node-executor-registry.ts`。
- **执行**：引擎按拓扑序分层并行执行；执行过程落 `execution_logs` + `execution_log_details`（每节点输入/输出/错误/耗时）。

### 1.2 校验链（投产预检）

保存/运行前的三道闸门（`server/services/workflow/`）：

1. `parseWorkflowJson` — JSON → 图结构；
2. `validateWorkflow` — 结构校验（重复节点 id、悬空引用等）；
3. `buildExecutionOrder` — 拓扑排序，**环在此阶段被拒绝**。

### 1.3 操作入口

- **页面**：`/workflow-builder`（编排 + 测试运行）、`/workflow-templates`（流程管理）、`/workflow-marketplace`（模板市场）。
- **测试运行**：Builder 内的测试执行走 `dryRun` 通道，可用 mock 响应替代真实 API 调用。
- **暂停/恢复/取消**：`POST /api/cron/executions/:id/pause|resume|cancel`（运行中 execution 支持信号中断）。

---

## 2. 定时任务（Cron）

### 2.1 创建要点

| 字段 | 说明 |
|------|------|
| `cron_expression` | 标准 5 段 cron，创建时校验合法性 |
| `misfire_policy` | 错过触发时间的补偿策略（misfire-handler） |
| `timeout_ms` | 单次执行超时上限 |
| `is_active` | 暂停 = false，不会删除历史 |

### 2.2 执行链路

```
CronScheduler（node-cron 触发）
  → QueueProcessor（任务入 task_queue，重试策略 retry-manager）
    → TaskExecutor（服务调用 / 工作流执行）
      → execution_logs（每次执行一条，含 tasks_executed/succeeded/failed）
      → 失败且重试耗尽 → dead_letter_queue
```

### 2.3 日常运维

- **页面**：`/cron`（任务/队列/执行日志三个 Tab）。
- **手动重试队列任务**：`POST /api/cron/queue/:id/retry`。
- **自动重试 DLQ**：`dlq-auto-retry-scheduler` 可按策略自动重试死信（见 DLQ 页设置）。
- **监控**：失败任务与 DLQ 变化实时推送通知中心；聚合视图见仪表盘「最近失败任务 / 死信队列」卡片与 `/api/stats/operations`。

---

## 3. 死信队列（DLQ）

### 3.1 进入条件

任务 `retry_count >= max_retries` 仍失败时，由 `moveToDeadLetter` 转入（原任务从 `task_queue` 删除，`original_task_id` 保留溯源）。

### 3.2 处理动作

| 动作 | API | 效果 |
|------|-----|------|
| 重试 | `POST /api/cron/dlq/:id/retry` | 生成新队列任务，原条目标记 `resolution='retried'` |
| 删除 | `DELETE /api/cron/dlq/:id` | 标记 `resolution='deleted'`（软解决，保留记录） |
| 列表 | `GET /api/cron/dlq` | 未解决条目（`resolved_at IS NULL`），按失败时间倒序 |

### 3.3 未解决计数口径

`countUnresolvedDeadLetters(ownerId)` 统计 `resolved_at IS NULL` 的条目数，仪表盘 DLQ 卡片与 `/operations` 聚合使用同一口径。

> **Owner 归属说明**：DLQ 条目的 `owner_id` 取自原任务（`data.owner_id` 优先），保证重试与列表隔离；跨 owner 不可见（投产验证测试「链路四」覆盖）。

---

## 4. 常见故障排查

| 现象 | 排查顺序 |
|------|----------|
| 任务反复进 DLQ | 外部调用日志（上游错误码 → 帮助中心错误码速查表）→ 容量/余额 → 任务 payload 参数 |
| 工作流执行卡住 | 执行日志节点明细（暂停/取消端点）→ 并发管理器排队情况 |
| 定时任务不触发 | 任务 is_active → cron 表达式与时区 → misfire 策略 → CronScheduler 日志 |
| 统计数字对不上 | `execution_logs` 与 `execution_log_details` 一一对应；分布按节点类型聚合（无明细的执行不计数） |

---

## 5. 投产验证清单

见 [production-validation-checklist.md](./production-validation-checklist.md)。
