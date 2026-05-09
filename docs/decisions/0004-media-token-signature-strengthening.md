# ADR-0004: 媒体下载 Token 签名算法升级为完整 HMAC-SHA256

## Status

Accepted

---

## Context

媒体下载使用签名的临时 token 绕过全局 JWT 认证（`index.ts:100`）。当前实现（`server/lib/media-token.ts:38-41`）：

```typescript
const hmac = createHmac('sha256', secret)
  .update(data)
  .digest('hex')
  .slice(0, 32)  // ⚠️ 截断至 128-bit
```

**问题**：
1. 签名被 `.slice(0, 32)` 截断为 128-bit（SHA256 输出为 256-bit）
2. 若 `MEDIA_TOKEN_SECRET` 为弱密钥（如少于 32 字节随机值），攻击者可暴力破解
3. Token 格式 `base64url(JSON payload).signature` 将签名以 hex 字符串拼接，验证时需再截断匹配

**风险等级**：P0（token 伪造可下载任意媒体文件）

**当前设计意图**：缩短 URL 长度。token 作为 query parameter 传递给 `/media/:id/download?token=...`。

---

## Decision

**方案：使用完整 HMAC-SHA256 签名（256-bit），优化 token 编码格式**

具体改动：
1. `.slice(0, 32)` → 移除截断，使用完整 64 字符 hex digest
2. Token 格式从 `base64url(data).hex_sig_32` → `base64url(data + sig_buffer)` 将签名以二进制拼接后整体 base64url 编码，减少长度膨胀

**替代方案**：
- **仅移除截断**：简单但 token 长度增加 ~32 字符
- **改用 JWT 格式**：引入 jsonwebtoken 依赖，过度设计
- **完全移除 token，改用 JWT 认证**：破坏 CDN 直连下载等场景

**选择理由**：在安全性和 URL 长度之间取得平衡。二进制拼接后 base64url 编码比 hex 表示更紧凑。

---

## Consequences

### Positive
- 签名强度从 128-bit 提升至 256-bit，暴力破解不可行
- Token 长度增加可控（约 15-20 字符）
- API 接口不变（`generateMediaToken` / `verifyMediaToken` 签名不变）

### Negative
- 已有 token 全部失效（验证逻辑变更），需重新生成
- URL 长度略有增加

### Risks
- 低。已生成 token 自然过期或被重新请求替代

---

## Metadata

| Field | Value |
|------|------|
| Date | 2026-05-09 |
| Status | Accepted |
| Decider | Sisyphus (AI Code Review) |
| Reviewed by | oGsLP |
