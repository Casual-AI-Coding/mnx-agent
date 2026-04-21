# Troubleshooting Guide

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

## 1. 数据库问题

### 1.1 Media 文件未显示？

检查 `media_records` 表是否存在：

```bash
psql -h localhost -U mnx_agent_server -d mnx_agent -c "\dt"
```

如果表不存在，重启服务器触发 migration。

### 1.2 数据库连接失败

检查环境变量：

```bash
DATABASE_URL=postgresql://user:password@host:5432/mnx_agent
```

确认 PostgreSQL 服务运行中。

---

## 2. API 问题

### 2.1 "请求次数过多"

**原因**：外部 MiniMax API 限流

**解决**：等待 15 分钟后重试

### 2.2 "API Key 无效"

**原因**：API Key 配置错误或过期

**解决**：
1. 检查环境变量 `MINIMAX_API_KEY`
2. 确认 Key 在 MiniMax 控制台有效

---

## 3. 上传问题

### 3.1 CORS 错误

**场景**：图片上传失败，浏览器报 CORS 错误

**解决**：使用 `/api/media/upload-from-url` 端点

后端代理下载，避免跨域。

---

## 4. 测试问题

### 4.1 Mock 不生效

**检查**：

```typescript
vi.mock('@/lib/api/client', () => ({
  internalAxios: { get: vi.fn(), post: vi.fn() }
}))
```

Mock 必须在文件顶部，在任何导入之前。

### 4.2 测试失败

检查 mock 设置：
- 文件路径是否正确
- 模块名称是否匹配
- mock 放在 `beforeEach`

---

## 5. 构建问题

### 5.1 TypeScript 错误

运行诊断：

```bash
npx tsc --noEmit
```

### 5.2 构建失败

检查依赖：

```bash
npm install
npm run build
```

---

## 6. 常见错误码映射

| MiniMax 错误码 | HTTP 状态 | 说明 |
|----------------|----------|------|
| 1002 | 429 | Rate Limit |
| 1008 | 402 | Payment Required |
| 1003 | 401 | Invalid API Key |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |