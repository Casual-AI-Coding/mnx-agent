# Token 认证系统实现文档

## 概述

本文档详细说明 Mnx-Agent 系统中的 Token 认证实现原理和工作机制。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Auth Store (Zustand)                                            │
│  ├─ user: AuthUser | null         (持久化到 localStorage)        │
│  ├─ isAuthenticated: boolean      (持久化到 localStorage)        │
│  └─ accessToken: string | null    (仅内存，不持久化)             │
├─────────────────────────────────────────────────────────────────┤
│  useTokenRefresh Hook                                            │
│  ├─ 主动刷新：过期前 3 分钟自动刷新                                │
│  ├─ 页面重载：检测到已登录但无 token → 从 cookie 刷新              │
│  └─ 并发控制：isRefreshingRef 防止重复刷新                        │
├─────────────────────────────────────────────────────────────────┤
│  API Client Interceptor                                          │
│  ├─ 401 响应 → 触发 token 刷新                                    │
│  ├─ 刷新队列：等待中的请求在刷新完成后重试                          │
│  └─ 刷新失败 → 登出并跳转登录页                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (withCredentials: true)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Express)                         │
├─────────────────────────────────────────────────────────────────┤
│  Cookie Parser Middleware                                        │
│  └─ 解析 httpOnly cookie 中的 refreshToken                       │
├─────────────────────────────────────────────────────────────────┤
│  Auth Routes                                                     │
│  ├─ POST /api/auth/login                                         │
│  │   └─ 返回 accessToken + 设置 refreshToken cookie              │
│  ├─ POST /api/auth/register                                      │
│  │   └─ 注册成功后自动登录                                        │
│  ├─ POST /api/auth/refresh                                       │
│  │   └─ 验证 refreshToken cookie → 返回新 accessToken            │
│  ├─ POST /api/auth/logout                                        │
│  │   └─ 清除 refreshToken cookie                                 │
│  └─ GET /api/auth/me                                             │
│      └─ 返回当前用户信息                                          │
├─────────────────────────────────────────────────────────────────┤
│  UserService                                                     │
│  ├─ generateAccessToken()   → JWT, 15分钟过期                    │
│  ├─ generateRefreshToken()  → JWT, 7天过期                       │
│  └─ verifyRefreshToken()    → 验证并解析 refreshToken            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token 类型与生命周期

### Access Token

| 属性 | 值 |
|------|-----|
| 类型 | JWT |
| 过期时间 | 15 分钟 |
| 存储位置 | 内存 (Zustand store) |
| 用途 | API 请求认证 |
| 携带方式 | Authorization: Bearer `<token>` |

**为什么不持久化到 localStorage？**
- 防止 XSS 攻击窃取 token
- JavaScript 无法访问 httpOnly cookie，但可以访问 localStorage
- 即使 token 泄露，15 分钟后自动失效

### Refresh Token

| 属性 | 值 |
|------|-----|
| 类型 | JWT |
| 过期时间 | 7 天 |
| 存储位置 | httpOnly Cookie |
| 用途 | 获取新的 Access Token |
| Cookie 属性 | httpOnly, secure(生产), sameSite=lax |

**Cookie 配置说明：**
```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,                              // JavaScript 无法访问
  secure: process.env.NODE_ENV === 'production', // 仅 HTTPS (生产环境)
  sameSite: 'lax',                             // 防止 CSRF
  path: '/api/auth',                           // 仅 auth 路由发送
  maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 天
})
```

---

## 工作流程

### 1. 登录流程

```
用户输入用户名密码
        │
        ▼
POST /api/auth/login
        │
        ▼
┌───────────────────────────────────┐
│ 后端验证用户名密码                  │
│ ├─ 成功: 生成 accessToken + refreshToken
│ └─ 失败: 返回 401 错误             │
└───────────────────────────────────┘
        │
        ▼ (成功)
┌───────────────────────────────────┐
│ 响应:                              │
│ ├─ Body: { user, accessToken }    │
│ └─ Cookie: refreshToken (httpOnly)│
└───────────────────────────────────┘
        │
        ▼
前端存储:
├─ localStorage: user, isAuthenticated
├─ 内存: accessToken
└─ Cookie: refreshToken (浏览器自动管理)
```

### 2. 正常使用流程

```
用户访问页面
        │
        ▼
useTokenRefresh hook 检查 token 状态
        │
        ├─ token 有效且未接近过期 → 设置定时刷新
        │
        ├─ token 即将过期 (< 3分钟) → 立即刷新
        │
        └─ token 已过期 → 登出
        │
        ▼
定时器在过期前 3 分钟触发刷新
        │
        ▼
POST /api/auth/refresh (携带 refreshToken cookie)
        │
        ▼
后端验证 refreshToken → 返回新 accessToken
        │
        ▼
前端更新 accessToken，继续使用
```

### 3. 页面刷新/重载流程

```
页面刷新
        │
        ▼
Zustand 从 localStorage 恢复状态:
├─ user: 已保存的用户信息
├─ isAuthenticated: true
└─ accessToken: null (未持久化)
        │
        ▼
useTokenRefresh hook 初始化
        │
        ▼
检测: isAuthenticated === true && accessToken === null
        │
        ▼
自动调用 POST /api/auth/refresh
        │
        ▼
后端从 httpOnly cookie 读取 refreshToken
        │
        ├─ 有效 → 返回新 accessToken
        └─ 无效/过期 → 前端登出
        │
        ▼
用户无感知恢复登录状态
```

### 4. API 请求 401 处理流程

```
API 请求 → 401 Unauthorized
        │
        ▼
检查是否正在刷新
        │
        ├─ 是 → 加入等待队列
        │
        └─ 否 → 开始刷新流程
        │           │
        │           ▼
        │   POST /api/auth/refresh
        │           │
        │           ├─ 成功 → 更新 token → 重试等待队列中的请求
        │           │
        │           └─ 失败 → 登出所有用户 → 跳转登录页
        │
        ▼
请求成功返回
```

### 5. 登出流程

```
用户点击登出
        │
        ▼
Header.tsx: handleLogout()
        │
        ▼
POST /api/auth/logout (携带 accessToken)
        │
        ▼
后端清除 refreshToken cookie
        │
        ▼
前端清除本地状态:
├─ accessToken = null
├─ user = null
└─ isAuthenticated = false
        │
        ▼
跳转到登录页
```

---

## 刷新策略

### 主动刷新 (Proactive Refresh)

**触发时机**: Token 过期前 3 分钟

**计算逻辑**:
```typescript
// src/lib/jwt.ts
export function calculateRefreshTime(token: string, bufferMs: number): number {
  const expiryTime = parseTokenExpiry(token)  // JWT exp 字段
  const now = Date.now()
  const timeUntilExpiry = expiryTime - now
  return timeUntilExpiry - bufferMs
}

// src/hooks/useTokenRefresh.ts
const refreshIn = calculateRefreshTime(token, 3 * 60 * 1000)  // 3 分钟缓冲

if (refreshIn <= 0) {
  // 已进入缓冲期，立即刷新
  performRefresh()
} else {
  // 设置定时器
  setTimeout(() => performRefresh(), refreshIn)
}
```

**缓冲时间设计原因**:
- 网络延迟预留时间
- 避免用户操作时正好遇到 token 过期
- 3 分钟足够完成刷新且不会过早

### 被动刷新 (Reactive Refresh)

**触发时机**: API 请求返回 401

**实现**: Axios Interceptor

```typescript
// src/lib/api/client.ts
if (error.response?.status === 401 && !originalRequest._retry) {
  if (!this.isRefreshing) {
    this.isRefreshing = true
    
    try {
      const response = await refreshToken()
      const newToken = response.data.accessToken
      updateAccessToken(newToken)
      
      // 重试等待队列中的请求
      this.refreshSubscribers.forEach(callback => callback(newToken))
      this.refreshSubscribers = []
      
      return apiClient(originalRequest)  // 重试原请求
    } catch {
      logout()
      window.location.href = '/login'
    } finally {
      this.isRefreshing = false
    }
  }
  
  // 加入等待队列
  return new Promise(resolve => {
    this.refreshSubscribers.push(token => {
      originalRequest.headers.Authorization = `Bearer ${token}`
      resolve(apiClient(originalRequest))
    })
  })
}
```

---

## 安全考虑

### 1. XSS 防护

**策略**: accessToken 不存储在 localStorage

```
❌ 错误做法:
localStorage.setItem('accessToken', token)
// XSS 攻击可以读取 localStorage

✅ 正确做法:
// accessToken 仅存储在内存
useAuthStore.setState({ accessToken: token })
// XSS 无法直接访问 React 状态
```

### 2. CSRF 防护

**策略**: Cookie 设置 `sameSite: 'lax'`

```
sameSite: 'lax' 效果:
├─ 同站请求: 发送 cookie ✓
├─ 跨站导航: 发送 cookie ✓
└─ 跨站 AJAX: 不发送 cookie ✗ (防止 CSRF)
```

### 3. Token 类型验证

**策略**: 不同类型的 token 使用不同的签名/验证方法

```typescript
// server/services/user-service.ts
static verifyAccessToken(token: string): JwtPayload | null {
  // 只验证 access token
  const decoded = jwt.verify(token, JWT_SECRET)
  if (decoded.type !== 'access') return null
  return decoded
}

static verifyRefreshToken(token: string): JwtPayload | null {
  // 只验证 refresh token
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET)
  if (decoded.type !== 'refresh') return null
  return decoded
}
```

### 4. Token 轮换

**策略**: 每次刷新时生成新的 refreshToken

```typescript
// server/routes/auth.ts
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken
  
  // 验证旧 token
  const payload = UserService.verifyRefreshToken(refreshToken)
  
  // 生成新 token
  const newAccessToken = userService.generateAccessToken(payload)
  const newRefreshToken = userService.generateRefreshToken(payload)
  
  // 设置新 cookie (旧 cookie 被覆盖)
  res.cookie('refreshToken', newRefreshToken, { ... })
  
  res.json({ accessToken: newAccessToken })
}))
```

**好处**:
- 减少 token 泄露的影响范围
- 被盗的旧 token 无法再次使用

---

## 已知限制

### 1. 浏览器 Tab 休眠

**现象**: 当浏览器 Tab 处于非活动状态时，`setTimeout` 会暂停

**影响**: 
- 用户离开 15+ 分钟后返回
- 定时刷新未触发，token 已过期
- 需要重新登录

**解决方案** (未来优化):
```typescript
// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // 页面激活时检查 token 状态
    checkAndRefreshToken()
  }
})
```

### 2. 电脑睡眠/唤醒

**现象**: 电脑睡眠期间计时器暂停

**影响**: 同上

**解决方案**: 页面激活时检查 token 状态

### 3. 网络中断

**现象**: 刷新请求失败

**当前行为**: 登出用户

**改进建议**: 区分网络错误和认证错误
```typescript
try {
  await refreshToken()
} catch (error) {
  if (isNetworkError(error)) {
    // 网络错误：提示用户稍后重试
    showToast('网络连接失败，请检查网络')
  } else {
    // 认证错误：登出
    logout()
  }
}
```

---

## 配置参数

| 参数 | 当前值 | 说明 | 文件位置 |
|------|--------|------|----------|
| Access Token 过期时间 | 15 分钟 | 安全性与用户体验的平衡 | `server/services/user-service.ts:241` |
| Refresh Token 过期时间 | 7 天 | 减少重新登录频率 | `server/services/user-service.ts:245` |
| 刷新缓冲时间 | 3 分钟 | 预留网络延迟时间 | `src/hooks/useTokenRefresh.ts:19` |
| Cookie maxAge | 7 天 | 与 Refresh Token 一致 | `server/routes/auth.ts:52` |
| Cookie sameSite | lax | CSRF 防护 | `server/routes/auth.ts:51` |
| Cookie secure | 生产环境 true | HTTP 防护 | `server/routes/auth.ts:50` |

---

## 调试技巧

### 查看 Token 内容

```javascript
// 在浏览器控制台
const token = useAuthStore.getState().accessToken
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token payload:', payload)
console.log('Expires at:', new Date(payload.exp * 1000))
```

### 查看 Cookie

```javascript
// 在浏览器控制台 (无法直接访问 httpOnly cookie)
// 需要在 Network 面板查看请求头中的 Cookie

// 或使用后端日志
console.log('Refresh token from cookie:', req.cookies.refreshToken)
```

### 手动触发刷新

```javascript
// 在浏览器控制台
const { accessToken } = useAuthStore.getState()
console.log('Current token expires at:', new Date(JSON.parse(atob(accessToken.split('.')[1])).exp * 1000))

// 手动刷新
await refreshToken()
console.log('New token:', useAuthStore.getState().accessToken)
```

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `server/routes/auth.ts` | 认证路由：登录、注册、刷新、登出 |
| `server/services/user-service.ts` | 用户服务：token 生成与验证 |
| `server/index.ts` | Cookie parser 中间件 |
| `src/stores/auth.ts` | 认证状态管理 |
| `src/hooks/useTokenRefresh.ts` | Token 刷新 Hook |
| `src/lib/api/auth.ts` | 认证 API 客户端 |
| `src/lib/api/client.ts` | API 拦截器：401 处理 |
| `src/lib/jwt.ts` | JWT 工具函数 |
| `src/components/layout/Header.tsx` | 登出逻辑 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-04-09 | 初始实现：httpOnly cookie + 主动刷新 + 401 兜底 |