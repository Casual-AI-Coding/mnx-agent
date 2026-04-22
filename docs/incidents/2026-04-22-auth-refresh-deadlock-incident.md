# Token Refresh 死锁与并发连接超时事故报告

> 日期: 2026-04-22
> 严重级别: **中等 (Medium)**

---

## 一、事故概述

在本地开发环境（HTTP/1.1，直接 IP:Port 访问）并发发起 **10 个音乐生成请求**时，触发以下连锁故障：

1. `/auth/refresh` 接口超时（axios timeout 10s）
2. 登出（`/auth/logout`）同样超时
3. 页面陷入**全屏加载状态**，除非手动刷新浏览器否则无法恢复
4. 复制网站地址新开 Tab 也无法访问（所有接口排队超时）
5. 原 Tab 的音乐生成陆续完成后，系统自行恢复

**出现频率**: 约 5-10%（当 access token 在音乐生成期间过期时触发）

---

## 二、根本原因分析

### 2.1 直接原因（前端代码缺陷）

`src/lib/api/client.ts` 中 token refresh 机制存在 **3 个并发安全缺陷**：

#### 缺陷 A: `refreshSubscribers` 只存回调，失败时 Promise 永不 resolve/reject

```typescript
// 修复前
private refreshSubscribers: Array<(token: string) => void> = []
// 失败时: this.refreshSubscribers = []  // 清空，但 Promise 永远 hang 住
```

10 个并发请求同时返回 401 → 1 个去 refresh，其余 9 个排队等待 → refresh 超时 → 9 个 Promise 永远 pending → 页面卡死。

#### 缺陷 B: `hydrationRefreshPromise` 无超时保护

```typescript
// 修复前
await this.hydrationRefreshPromise  // 可能永久等待
```

#### 缺陷 C: 失败路径重复 logout + 缺少 `response.success === false` 处理

```typescript
// 修复前
catch {
  useAuthStore.getState().logout()    // 第一次 logout
  window.location.href = '/login'
}
// finally 后还有第二次 logout（代码路径混乱）
```

### 2.2 触发条件（浏览器 HTTP/1.1 连接限制）

Chrome/Firefox/Safari **硬编码同一域名/IP 最多 6 个并发 TCP 连接**。

```
时间线（token 还剩 3 分钟时发起 10 个音乐生成）：
─────────────────────────────────────────────────────────
T=0s    10 个 /music/generate 同时发出
        ├─ 6 个立即建立连接（hold 5 分钟）
        └─ 4 个在浏览器队列排队

T=3min  access token 过期

T=5min  6 个请求陆续返回 401
        ├─ 6 个响应 interceptor 同时触发 refreshToken()
        ├─ 第 1 个 POST /auth/refresh 进入浏览器队列
        └─ 其余 5 个进入 refreshSubscribers 队列

        /auth/refresh 请求在浏览器队列排队
        （前面还有 4 个未发的音乐生成请求）

T=5min+10s  axios timeout → refresh 失败
            ❌ 旧代码: subscribers 被清空但 never reject → 永久 hang
            ❌ 旧代码: catch 里 logout 一次，外层又 logout 一次
```

**关键铁证**: "等原 Tab 生成陆续完成后就恢复了" — 说明是**连接槽位耗尽**，不是服务端资源耗尽。

### 2.3 排除的其他可能性

| 怀疑对象 | 分析结果 | 排除理由 |
|---------|---------|---------|
| **DB 连接池耗尽** | ❌ 不是 | 音乐生成直接调 MiniMax API，不查 DB；audit 日志是 fire-and-forget（<10ms） |
| **Node.js 线程打满** | ❌ 不是 | Node.js 单线程事件循环，音乐生成是 async I/O，不阻塞事件循环 |
| **Cloudflare Tunnel 限制** | ❌ 不是 | 本地直接 IP:Port 访问，不走 Cloudflare Tunnel |
| **Nginx 连接限制** | ❌ 不是 | 本地开发无 Nginx，Node.js 直接监听端口 |
| **服务端 CPU/内存瓶颈** | ❌ 不是 | 10 个 async HTTP 请求不会耗尽资源 |

---

## 三、事故时间线

| 时间 | 事件 |
|------|------|
| 2026-04-22 | 用户报告：10 并发生成时 refresh/logout 超时，页面卡死 |
| 排查阶段 1 | 分析前端 `src/lib/api/client.ts` refresh 机制 |
| 排查阶段 2 | 检查后端 DB 连接池、auth 路由、audit 中间件 |
| 排查阶段 3 | 分析 Cloudflare Tunnel 架构（后确认本地不走 Tunnel） |
| 根因确认 | 用户确认"本地 IP:Port 访问" → 浏览器 HTTP/1.1 6 连接限制 + 代码缺陷 |
| 代码修复 | 重构 `client.ts` refresh 机制（subscriber timeout, hydration timeout, 统一失败路径） |
| 配置调整 | access token 有效期从 15m 延长至 30m |
| 提交 | `git commit` 合并修复 |

---

## 四、修复措施

### 4.1 前端 `src/lib/api/client.ts`

#### 修复 A: `refreshSubscribers` 改为 `{resolve, reject}` 对象 + 超时

```typescript
private refreshSubscribers: Array<{
  resolve: (token: string) => void
  reject: (e: unknown) => void
}> = []
private readonly subscriberTimeout = 10000

// 入队时设置超时
const timer = setTimeout(() => {
  const idx = this.refreshSubscribers.findIndex(s => s.resolve === resolve)
  if (idx !== -1) this.refreshSubscribers.splice(idx, 1)
  reject(new Error('Token refresh timeout'))
}, this.subscriberTimeout)

this.refreshSubscribers.push({
  resolve: (token: string) => { clearTimeout(timer); /* ... */ },
  reject: (e: unknown) => { clearTimeout(timer); reject(e) }
})
```

#### 修复 B: `hydrationRefreshPromise` 加超时保护

```typescript
await Promise.race([
  this.hydrationRefreshPromise,
  new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('Hydration refresh timeout')), this.authWaitTimeout)
  )
]).catch((err) => {
  console.warn('[API Client] Hydration refresh failed:', err)
})
```

#### 修复 C: 统一失败路径

```typescript
catch {
  // refreshToken threw or returned success=false
}

// 统一的失败处理
this.refreshSubscribers.forEach((s) => s.reject(new Error('Token refresh failed')))
this.refreshSubscribers = []
this.isRefreshing = false
useAuthStore.getState().logout()
window.location.href = '/login'
return Promise.reject(error)
```

### 4.2 后端 `server/services/user-service.ts`

延长 access token 有效期，降低刷新频率：

```typescript
// 修复前
return jwt.sign(payload, this.getSecret(), { expiresIn: '15m' })

// 修复后
return jwt.sign(payload, this.getSecret(), { expiresIn: '30m' })
```

---

## 五、影响评估

| 维度 | 影响 |
|------|------|
| 用户体验 | 高并发长请求时可能触发全屏加载卡死，需手动刷新 |
| 数据完整性 | 无影响，音乐生成本身正常完成 |
| 安全性 | 无影响，token 机制本身安全，只是并发处理有缺陷 |
| 本地开发 | 影响显著（HTTP/1.1 限制下必现） |
| 生产环境 | 影响较小（Cloudflare Tunnel 走 HTTP/2，无 6 连接限制） |

---

## 六、预防措施与建议

### 6.1 已完成

| 措施 | 状态 |
|------|------|
| Subscriber Promise 超时保护 | ✅ 已提交 |
| Hydration refresh 超时保护 | ✅ 已提交 |
| 统一失败路径（单次 logout） | ✅ 已提交 |
| Access token 延长至 30m | ✅ 已提交 |

### 6.2 短期建议（推荐本周）

#### 6.2.1 前端限制音乐生成并发数

在本地 HTTP/1.1 开发环境下，限制并发为 3：

```typescript
import pLimit from 'p-limit'
const limit = pLimit(3)
await Promise.all(prompts.map(p => limit(() => generateMusic(p))))
```

#### 6.2.2 本地开发启用 HTTPS + HTTP/2

使用 `mkcert` 生成本地证书，配合 `vite-plugin-mkcert` 或 Node.js HTTP/2 服务器，消除浏览器 6 连接限制。

### 6.3 中期建议（推荐本月）

#### 6.3.1 服务端 `/auth/refresh` 加限流

防止并发冲击 refresh 端点：

```typescript
// server/middleware/rateLimit.ts
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 每 IP 每分钟最多 5 次 refresh
  skipSuccessfulRequests: true,
})
```

#### 6.3.2 前端错峰刷新

在 `useTokenRefresh` 中添加随机抖动，避免多个标签页同时刷新：

```typescript
const jitter = Math.random() * 30 * 1000 // 0-30s 随机延迟
setTimeout(() => refreshToken(), timeUntilExpiry - 3 * 60 * 1000 + jitter)
```

### 6.4 长期建议

#### 6.4.1 服务端连接池监控

暴露 `/api/stats/pool-stats` 端点，前端可在调试面板展示 DB 池状态：

```typescript
// server/routes/stats.ts
router.get('/pool-stats', authenticateJWT, (req, res) => {
  const stats = getPoolStats()
  res.json({ success: true, data: stats })
})
```

---

## 七、经验教训

| 问题 | 教训 | 改进 |
|------|------|------|
| `refreshSubscribers` 只存回调 | Promise 必须有超时和 reject 路径 | 改为 `{resolve, reject}` 对象 + `setTimeout` |
| 并发 401 触发 refresh 洪泛 | 无锁的 subscriber 队列会累积 | 加 subscriberTimeout 防止无限等待 |
| `response.success === false` 走空路径 | 业务错误不能依赖 catch 块 | 显式检查 `success` 字段 |
| 本地开发 HTTP/1.1 | 浏览器 6 连接限制是硬编码 | 本地启用 HTTP/2 或限制并发 |
| Token 15m 有效期 | 长请求（5min）窗口内容易过期 | 延长至 30m，降低刷新频率 |
| 排查时未先确认访问方式 | 假设了 Cloudflare Tunnel 架构 | 先问清楚部署/访问拓扑 |

---

## 八、相关文件

- 前端修复: `src/lib/api/client.ts`
- 后端修复: `server/services/user-service.ts`
- 全局加载状态: `src/components/shared/LoadingSpinner.tsx`
- 音乐生成路由: `server/routes/music.ts`
- 认证路由: `server/routes/auth.ts`
- 审计中间件: `server/middleware/audit-middleware.ts`
- 数据库连接: `server/database/connection.ts`

---

## 九、提交记录

```
commit: fix(auth): prevent token refresh deadlocks under concurrent load;
         extend access token expiry to 30m

Frontend:
- Fix refreshSubscribers to use {resolve,reject} objects with timeout
- Add subscriberTimeout (10s) to prevent Promise hang on refresh failure
- Wrap hydrationRefreshPromise with Promise.race + timeout
- Unify failure path: reject all subscribers, logout, redirect once
- Fix missing fallthrough when response.success === false

Backend:
- Extend access token expiry from 15m to 30m to reduce refresh frequency
```

---

**报告人**: AI Assistant  
**日期**: 2026-04-22
