# ADR-0005: 路由业务逻辑提取到 Service 层

## Status

Accepted

---

## Context

2026-05-09 架构审查发现多条路由文件违反项目既定的分层架构（Route → DomainService → Repository）：

| 文件 | 行数 | 违规内容 |
|------|------|----------|
| `server/routes/media.ts` | 638 | `/recoverable`、`/recover/:logId` 包含数据恢复逻辑，`OPERATION_MEDIA_MAP` 重复定义两次 |
| `server/routes/external-proxy.ts` | 466 | `executeAsyncTask`（165 行）含图片处理、base64 解码、媒体保存 |

**AGENTS.md 明确规定**：Route → Domain Service → Repository 单向依赖，Repository 禁止包含业务逻辑。

**原因**：
- 这些路由在项目早期功能快速迭代时自然增长
- 业务逻辑内联到路由层减少了初始文件数量
- 缺乏明确的 Service 提取时机约定

---

## Decision

**方案：提取路由中的业务逻辑到独立的 Domain Service，分步执行**

### Step 1: MediaRecoveryService（从 `media.ts` 提取）
- 提取 `/recoverable` 和 `/recover/:logId` 的数据恢复逻辑
- 消除重复的 `OPERATION_MEDIA_MAP`
- 位置：`server/services/domain/media-recovery.service.ts`

### Step 2: ExternalProxyService（从 `external-proxy.ts` 提取）
- 提取 `executeAsyncTask` 及其辅助函数
- 将异步任务执行、图片处理逻辑封装为可测试单元
- 位置：`server/services/domain/external-proxy.service.ts`

### 实施原则
- **增量提取**：每次提取后立即验证（测试通过 + 构建成功）
- **行为保留**：提取过程中不改变功能行为，仅移动代码
- **测试优先**：新 Service 必须有对应的单元测试

**替代方案**：
- **保持现状**：继续允许路由膨胀，降低长期可维护性
- **大爆炸重构**：一次性提取所有逻辑，风险高
- **引入 Controller 层**：增加抽象层，当前项目规模不需要

---

## Consequences

### Positive
- 路由文件更薄（<200 行目标），职责单一
- 业务逻辑可独立测试（不依赖 Express req/res）
- 消除 `OPERATION_MEDIA_MAP` 重复定义
- `executeAsyncTask` 可复用（如被 cron job 调用）

### Negative
- 增加文件数量和导入路径
- 需要编写新的 Service 测试

### Risks
- 低。提取过程不影响 API 契约，路由签名不变

---

## Metadata

| Field | Value |
|------|------|
| Date | 2026-05-09 |
| Status | Accepted |
| Decider | Sisyphus (AI Code Review) |
| Reviewed by | oGsLP |
