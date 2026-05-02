# ADR-0002: 长耗时请求改为异步任务+轮询模式

## Status

Accepted

---

## Context

OpenAI Image2 图片生成功能需要调用外部 API（通过 `/api/external-proxy`），该请求可能耗时 30-120 秒。

**问题**：
- Cloudflare 免费版限制 HTTP 请求超时为 100 秒（524 错误）
- 前端直接等待长耗时请求会导致连接超时失败
- 用户体验差：长时间等待后突然失败，无法重试

**约束**：
- 不能绕过 Cloudflare（必须通过 CDN）
- 不能延长 Cloudflare 超时（免费版限制）
- 需要保持用户体验：提交后能查看进度、支持重试

---

## Decision

**方案：异步任务提交 + 前端轮询**

将同步代理请求拆分为两步：
1. **提交任务**：`POST /api/external-proxy/submit` 立即返回 taskId
2. **轮询状态**：前端定期调用 `GET /api/external-proxy/status/:taskId` 获取结果

**替代方案**：
- **WebSocket 实时通知**：实现复杂，需要维护连接状态，当前阶段不必要
- **Server-Sent Events**：仍需长连接，同样受 Cloudflare 超时限制
- **增大重试次数**：治标不治本，每次重试仍会超时

**选择轮询的原因**：
- 实现简单，前后端改动最小
- 天然支持断线重连（前端刷新后可继续轮询）
- 与现有架构兼容（复用 external_api_logs 表）

---

## Consequences

### Positive
- 解决 Cloudflare 100 秒超时问题
- 前端可展示任务进度和状态
- 支持任务失败后重试
- 后端可控制并发任务数，防止资源滥用

### Negative
- 增加前端复杂度（轮询逻辑、状态管理）
- 用户体验略有延迟（轮询间隔内无法感知进度）
- 需要额外的数据库字段存储任务状态

### Risks
- 轮询风暴：前端频繁请求可能增加服务器压力
  - 缓解：限制轮询次数和间隔
- 任务堆积：用户提交过多任务导致队列过长
  - 缓解：限制每用户并发任务数

---

## Metadata

| Field | Value |
|------|-------|
| Date | 2026-05-03 |
| Status | Accepted |
| Decider | AI Assistant |
| Related | OpenAI Image2 异步任务重构 |
