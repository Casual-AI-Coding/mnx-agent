# ADR-0003: external-proxy 路由强制 JWT 认证

## Status

Accepted

---

## Context

2026-05-09 安全审查发现：

`server/routes/external-proxy.ts` 的三个端点（`POST /`、`POST /submit`、`GET /status/:taskId`）**均缺少 JWT 认证中间件**。虽然 `/api/*` 全局中间件（`index.ts:98-102`）对大多数路由强制 JWT，但 `external-proxy` 路由器在 `index.ts:150` 挂载时未传递 `authenticateJWT`：

```typescript
// ❌ 缺 JWT
app.use(prefix + '/external-proxy', externalProxyRouter)

// ✅ 正确示例
app.use(prefix + '/external-api-logs', authenticateJWT, externalApiLogsRouter)
```

**风险**：未认证用户可通过代理路由消耗 API 配额、发起对外请求，属于 P0 级安全漏洞。

**约束**：
- `GET /status/:taskId` 的 taskId 为 UUID，猜测难度高但不构成有效防护
- 内部 `req.user?.userId` 检查存在但不强制执行
- ADR-0002 引入的异步轮询模式使得此端点更容易被滥用

---

## Decision

**方案：在 `index.ts` 挂载时添加 `authenticateJWT` 中间件**

```typescript
app.use(prefix + '/external-proxy', authenticateJWT, externalProxyRouter)
```

**替代方案**：
- **在路由文件内部逐端点添加**：重复代码多，容易遗漏新端点
- **保留现状 + IP 白名单**：仅延缓问题，不适合动态 IP 环境
- **完全移除代理功能**：会破坏 OpenAI Image2 等核心功能

**选择外层挂载的理由**：
- 统一认证：与 `external-api-logs`、`users` 等路由一致
- 最小改动：一行代码，零侵入现有路由逻辑
- 向前兼容：后续新增端点自动受保护

---

## Consequences

### Positive
- 消除 P0 安全漏洞，所有代理请求强制认证
- 与其他路由认证模式一致，降低维护者认知负担
- 用户体验不变（正常用户已登录）

### Negative
- 自动化测试脚本需携带有效 JWT token

### Risks
- 无。路由内部 `req.user?.userId` 的 `?.` 可选链在强制认证后不再需要（保留也无害）

---

## Metadata

| Field | Value |
|------|------|
| Date | 2026-05-09 |
| Status | Accepted |
| Decider | Sisyphus (AI Code Review) |
| Reviewed by | oGsLP |
