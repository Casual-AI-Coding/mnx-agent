# Token Refresh 机制设计

> 版本: 1.0
> 日期: 2026-04-08
> 状态: Approved

## 背景

当前系统 JWT access token 15分钟过期，用户需要频繁重新登录。系统已生成 refresh token 但未实现使用机制。

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 刷新策略 | 主动刷新 + 401 兜底 | 用户无感知，双重保障 |
| Refresh Token 存储 | httpOnly Cookie | 防 XSS 攻击，SameSite=Lax 防 CSRF |
| 主动刷新时机 | 过期前 3 分钟动态计算 | 刷新次数最少，不会过早 |
| 并发 401 处理 | 单次刷新 + 等待队列 | 避免重复刷新请求 |

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  App.tsx                                                        │
│  └─ <TokenRefreshProvider>                                      │
│     └─ useTokenRefresh() hook                                   │
│        ├─ parseTokenExpiry(accessToken) → Date                  │
│        ├─ setTimeout(refresh, timeUntilRefresh)                 │
│        └─ POST /api/auth/refresh (credentials: 'include')       │
├─────────────────────────────────────────────────────────────────┤
│  API Client (src/lib/api/client.ts)                             │
│  └─ 401 Interceptor                                             │
│     ├─ isRefreshing flag + waitingQueue                         │
│     ├─ POST /api/auth/refresh                                   │
│     ├─ 成功: 重试原请求                                          │
│     └─ 失败: logout + redirect /login                           │
├─────────────────────────────────────────────────────────────────┤
│  Auth Store (src/stores/auth.ts)                                │
│  ├─ accessToken: string | null (内存)                           │
│  ├─ user, isAuthenticated                                       │
│  └─ refreshToken 移除 (改为 cookie)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP + Cookie (credentials: 'include')
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
├─────────────────────────────────────────────────────────────────┤
│  Middleware (server/index.ts)                                   │
│  └─ cookieParser() - 新增                                       │
├─────────────────────────────────────────────────────────────────┤
│  Routes (server/routes/auth.ts)                                 │
│  ├─ POST /login                                                 │
│  │   └─ Set-Cookie: refreshToken; HttpOnly; Secure; SameSite   │
│  ├─ POST /refresh - 新增                                        │
│  │   ├─ req.cookies.refreshToken                                │
│  │   ├─ 验证 refresh token                                      │
│  │   ├─ 生成新 access + refresh token                           │
│  │   └─ Set-Cookie: refreshToken (rotation)                    │
│  ├─ POST /logout - 新增                                         │
│  │   └─ clearCookie('refreshToken')                             │
│  └─ GET /me, POST /change-password, PATCH /me (不变)            │
├─────────────────────────────────────────────────────────────────┤
│  UserService (server/services/user-service.ts)                  │
│  ├─ verifyRefreshToken(token) - 新增                            │
│  └─ generateAccessToken/RefreshToken (不变)                     │
└─────────────────────────────────────────────────────────────────┘
```

## 数据流

### 登录流程

```
POST /api/auth/login
  ↓
UserService.login()
  ├─ 验证用户名密码
  ├─ generateAccessToken() → 15m JWT
  ├─ generateRefreshToken() → 7d JWT
  └─ Response:
     ├─ Body: { success: true, data: { user, accessToken } }
     └─ Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; MaxAge=604800000

前端:
  ├─ authStore.login(user, accessToken) - accessToken 存内存
  └─ refreshToken 自动存入 cookie (JS 不可见)
```

### 主动刷新流程

```
App mounted
  ↓
useTokenRefresh()
  ├─ parseTokenExpiry(accessToken)
  │   └─ 解析 JWT payload.exp → Date
  ├─ timeUntilRefresh = exp - now - 3分钟
  └─ setTimeout(refresh, timeUntilRefresh)

定时器触发:
POST /api/auth/refresh (credentials: 'include')
  ├─ Cookie: refreshToken=xxx (自动发送)
  ↓
后端验证 refresh token
  ├─ 有效 → 生成新 access + refresh token
  ├─ Set-Cookie: refreshToken (rotation)
  └─ Body: { success: true, data: { accessToken } }

前端更新 accessToken
```

### 401 兜底流程

```
API 请求 → 401 响应
  ↓
Interceptor:
  ├─ 检查 isRefreshing
  │   ├─ false → isRefreshing=true, 发起 refresh
  │   └─ true → 加入 waitingQueue
  ├─ refresh 成功:
  │   ├─ 更新 accessToken
  │   ├─ isRefreshing=false
  │   ├─ 重试原请求
  │   └─ 执行 waitingQueue
  └─ refresh 失败:
      ├─ logout()
      └─ redirect /login
```

## Cookie 配置

```typescript
// 生产环境
res.cookie('refreshToken', token, {
  httpOnly: true,      // JS 不可读
  secure: true,        // 仅 HTTPS
  sameSite: 'lax',     // 防 CSRF
  path: '/api/auth',   // 作用域
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天
})

// 开发环境 (localhost)
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: false,       // HTTP 允许
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
```

## 前端 JWT 解析

```typescript
// src/lib/jwt.ts
export function parseTokenExpiry(token: string): Date | null {
  try {
    const [, payloadB64] = token.split('.')
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ? new Date(payload.exp * 1000) : null
  } catch {
    return null
  }
}

export function calculateRefreshTime(token: string): number {
  const expiry = parseTokenExpiry(token)
  if (!expiry) return 0
  const bufferMs = 3 * 60 * 1000  // 提前 3 分钟
  return Math.max(0, expiry.getTime() - Date.now() - bufferMs)
}
```

## API 接口

### POST /api/auth/login (修改)

**Request:**
```json
{ "username": "string", "password": "string" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id", "username", "role", ... },
    "accessToken": "eyJ..."
  }
}
```

**Set-Cookie:**
```
refreshToken=eyJ...; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; MaxAge=604800000
```

### POST /api/auth/refresh (新增)

**Request:**
- 无需 body
- 自动发送 cookie: `refreshToken`

**Response (成功):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ..."
  }
}
```

**Set-Cookie:**
```
refreshToken=eyJ...; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; MaxAge=604800000
```

**Response (失败):**
```json
{
  "success": false,
  "error": "Refresh token 无效或已过期"
}
```

### POST /api/auth/logout (新增)

**Request:**
- Header: `Authorization: Bearer <accessToken>`

**Response:**
```json
{ "success": true, "data": { "message": "已登出" } }
```

**Set-Cookie:**
```
refreshToken=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; MaxAge=0
```

## 错误处理

| 场景 | 处理 |
|------|------|
| Refresh token 过期 | 401 → logout |
| Refresh token 被篡改 | 401 → logout |
| Refresh API 网络错误 | 401 → logout |
| Access token 过期 | 主动刷新或 401 兜底 |
| 并发 refresh | 第一个发起，其他等待 |

## 安全考虑

1. **httpOnly Cookie**: JS 无法读取 refreshToken，防 XSS 窃取
2. **SameSite=Lax**: 跨站请求不携带 cookie，防 CSRF
3. **Secure=true**: 仅 HTTPS 传输（开发环境除外）
4. **Token Rotation**: 每次 refresh 生成新 refreshToken
5. **短期 Access Token**: 15分钟过期，降低被盗用风险
6. **Path 限制**: cookie 仅在 `/api/auth` 路径发送

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `package.json` | 修改 | 添加 cookie-parser 依赖 |
| `server/index.ts` | 修改 | 添加 cookieParser 中间件 |
| `server/routes/auth.ts` | 修改 | 修改 login，添加 refresh/logout |
| `server/services/user-service.ts` | 修改 | 添加 verifyRefreshToken 方法 |
| `src/stores/auth.ts` | 修改 | 移除 refreshToken，更新 login/logout |
| `src/lib/api/client.ts` | 修改 | 401 interceptor 刷新逻辑 |
| `src/lib/jwt.ts` | 新增 | parseTokenExpiry, calculateRefreshTime |
| `src/hooks/useTokenRefresh.ts` | 新增 | 主动刷新 hook |
| `src/hooks/index.ts` | 修改 | 导出新 hook |
| `src/App.tsx` | 修改 | 添加 TokenRefreshProvider |

## 测试策略

| 类型 | 内容 |
|------|------|
| 单元测试 | parseTokenExpiry, calculateRefreshTime |
| 单元测试 | UserService.verifyRefreshToken |
| 集成测试 | POST /auth/refresh 成功/失败 |
| 集成测试 | POST /auth/logout 清除 cookie |
| E2E 测试 | 登录 → 等待 → 主动刷新成功 |
| E2E 测试 | 401 → 刷新 → 重试成功 |
| E2E 测试 | Refresh token 过期 → logout |