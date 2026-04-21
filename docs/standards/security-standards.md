# Security Standards

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

## 1. 认证与授权

### 1.1 JWT 认证

所有 `/api/*` 端点需要 JWT Bearer token，`/api/auth` 除外：

```typescript
// 请求头
Authorization: Bearer <access_token>

// 验证中间件
import { authMiddleware } from '@/middleware/auth.js'
router.use('/api', authMiddleware)
```

### 1.2 角色权限

| 角色 | 调试台 | 管理功能 | 查看他人数据 | 用户管理 | 邀请码管理 |
|------|--------|----------|-------------|----------|-----------|
| user | ✅ | ❌ | ❌ | ❌ | ❌ |
| pro | ✅ | ✅ | ❌ | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ | ❌ | ❌ |
| super | ✅ | ✅ | ✅ | ✅ | ✅ |

### 1.3 数据隔离

所有数据资源通过 `owner_id` 隔离：

```typescript
// 查询时过滤
const ownerId = buildOwnerFilter(req).params[0]
const jobs = await db.getAllCronJobs(ownerId)

// 创建时注入
const ownerId = getOwnerIdForInsert(req) ?? undefined
const job = await db.createCronJob(data, ownerId)
```

---

## 2. 输入验证

### 2.1 Zod Validation

所有请求必须用 Zod schema 验证：

```typescript
import { z } from 'zod'

export const createCronJobSchema = z.object({
  name: z.string().min(1).max(100),
  cronExpression: z.string(),
  enabled: z.boolean().default(true),
})

router.post('/', validateBody(createCronJobSchema), handler)
```

### 2.2 参数化查询

所有 SQL 查询必须使用参数化查询防 SQL 注入：

```typescript
// ✅ 正确
await db.query('SELECT * FROM cron_jobs WHERE id = $1', [id])

// ❌ 禁止
await db.query(`SELECT * FROM cron_jobs WHERE id = '${id}'`)
```

---

## 3. 敏感信息处理

### 3.1 禁止记录的内容

| 内容 | 原因 |
|------|------|
| Token / API Key | 泄露风险 |
| Password | 安全风险 |
| 用户敏感数据 | 隐私合规 |

```typescript
// ✅ 正确：记录脱敏信息
logger.info({ userId, action: 'login' }, 'User logged in')

// ❌ 禁止：记录敏感信息
logger.info({ token: accessToken }, 'Login') // 禁止
```

### 3.2 密码存储

- 必须使用 bcrypt 哈希
- 不得明文存储
- 不得记录密码

### 3.3 API Key 管理

- 存储：环境变量（`process.env.API_KEY`）
- 代码中不硬编码
- 不提交到 Git

---

## 4. 审计日志

### 4.1 自动记录

所有 POST / PUT / PATCH / DELETE 操作自动记录：

```typescript
import { auditLog } from '@/services/audit-service.js'

// 自动中间件
router.use(auditLog)
```

### 4.2 记录内容

| 字段 | 来源 |
|------|------|
| user_id | JWT token 提取 |
| action | HTTP 方法 + 路由 |
| resource | 资源类型 |
| resource_id | 资源 ID |
| timestamp | 请求时间 |

### 4.3 访问控制

- 普通用户只能查看自己的审计日志
- admin/super 可查看所有日志

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |