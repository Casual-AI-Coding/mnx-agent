# API Design Standards

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

## 1. REST 设计原则

### 1.1 资源命名

| 规则 | 示例 |
|------|------|
| 复数名词 | `/api/media-records`（不是 `/api/media-record`） |
| kebab-case | `/api/cron-jobs`（不是 `cronJobs`） |
| 无动词 | 动词用 HTTP 方法表达 |

### 1.2 HTTP 方法对应

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 获取资源（不修改） | `GET /api/cron-jobs` |
| POST | 创建资源 | `POST /api/cron-jobs` |
| PUT | 全量更新 | `PUT /api/cron-jobs/:id` |
| PATCH | 部分更新 | `PATCH /api/cron-jobs/:id` |
| DELETE | 删除资源 | `DELETE /api/cron-jobs/:id` |

---

## 2. 路由命名约定

### 2.1 命名规则

- 全部小写，用 `-` 分隔
- 资源用复数名词
- 嵌套层级不超过 2 层

### 2.2 常用路由示例

```
GET    /api/cron-jobs
POST   /api/cron-jobs
GET    /api/cron-jobs/:id
PATCH  /api/cron-jobs/:id
DELETE /api/cron-jobs/:id
POST   /api/cron-jobs/:id/run
POST   /api/cron-jobs/:id/toggle
GET    /api/cron-jobs/:id/logs
```

---

## 3. 请求/响应规范

### 3.1 成功响应

```typescript
// 单条数据
{ success: true, data: {...} }

// 列表数据
{
  success: true,
  data: [...],
  total: 42,      // 总数
  page: 1,       // 当前页
  limit: 20       // 每页数量
}
```

### 3.2 错误响应

```typescript
{ success: false, error: "错误信息" }
```

### 3.3 错误码映射（MiniMax API）

| MiniMax 错误码 | HTTP 状态码 |
|----------------|------------|
| 1002 | 429 Rate Limit |
| 1008 | 402 Payment Required |
| 其他 | 500 Internal Error |

---

## 4. 分页规范

### 4.1 请求参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码（1-based） |
| limit | number | 20 | 每页数量（max 100） |

### 4.2 响应包含

```typescript
{
  success: true,
  data: [...],
  total: 42,    // 总记录数
  page: 1,     // 当前页
  limit: 20     // 每页数量
}
```

---

## 5. 版本控制

### 5.1 版本号规则

| 变更类型 | 版本递增 |
|----------|----------|
| 破坏性变更 | MAJOR++（如 1.0 → 2.0） |
| 向后兼容新增 | MINOR++（如 1.0 → 1.1） |
| 向后兼容修复 | PATCH++（如 1.0.0 → 1.0.1） |

### 5.2 破坏性变更示例

- 删除端点
- 修改响应结构
- 改变必需参数
- 修改参数类型

---

## 6. 内部 API 免限流

内部服务间调用不使用限流：

```
/api/media
/api/files
/api/cron
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |