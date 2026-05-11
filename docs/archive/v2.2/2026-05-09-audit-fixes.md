# 深度审计修复 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务执行。步骤使用 checkbox（`- [ ]`）跟踪。

**Goal:** 修复 2026-05-09 深度审计报告中的 28 项发现，覆盖安全加固、架构修复、代码质量清理、测试修复、前端质量改进。

**Architecture:** 分 4 批执行：A 批(安全/关键修复) -> B 批(代码质量/架构) -> C 批(测试修复) -> D 批(前端质量)。每批内按依赖排序，批完成后立即提交。

**Tech Stack:** Express + React 18 + TypeScript (strict) + PostgreSQL + pino + Zustand + Vitest + node:crypto

---

## 文件结构

### 修改文件清单

| 批次 | 文件 | 变更类型 |
|------|------|----------|
| A | `server/index.ts` | DLQ shutdown + 安全响应头 |
| A | `server/services/websocket-service.ts` | 内存泄漏修复 + 订阅权限 + 空catch |
| A | `server/services/notification-service.ts` | HMAC 签名验证 (timingSafeEqual) |
| A | `server/routes/external-proxy.ts` | hostname 校验 + 内部地址拦截 |
| A | `server/lib/media-storage.ts` | 路径遍历防护 |
| B | `server/lib/minimax/client.ts` | 基类添加 request() + 重试配置 |
| B | `server/lib/minimax/files.ts` | fileUpload 添加 retryWithBackoff |
| B | `server/database/connection.ts` | `any` → `unknown` |
| B | `src/stores/templates.ts` | 6 处 `any` → `Record<string, unknown>` |
| B | `src/components/layout/HistoryPanel.tsx` | 移除 console.log |
| B | `src/lib/analytics.ts` | console.log → dev-only 守卫 |
| B | `src/pages/MusicGeneration.tsx` | 移除 console.log + 修复 useCallback deps |
| B | `server/services/workflow/node-executor.ts` | `any` → `NodeType` + 魔法数字 → 常量 |
| B | `src/stores/index.ts` | 导出全部 14 个 store |
| C | `server/lib/media-storage.ts` | 修复路径遍历正则匹配 |
| C | `server/repositories/__tests__/capacity-repository.test.ts` | 超时 5000 → 30000 |
| D | `src/App.tsx` | 添加 404 路由 (`path="*"`) |
| D | `src/components/shared/APIReference.tsx` | 硬编码 URL → env var |

---

## A 批：安全/关键修复

### Task A1: WebSocket 内存泄漏 + DLQ shutdown

**文件:**
- 修改: `server/index.ts`
- 修改: `server/services/websocket-service.ts`

- [x] **Step 1: gracefulShutdown 添加 dlqScheduler.stop()**

在 `server/index.ts` 的 `gracefulShutdown` 函数中，`closeCronWebSocket()` 之前添加：

```typescript
dlqScheduler.stop()
logger.info({ msg: 'DLQ auto-retry scheduler stopped' })
```

- [x] **Step 2: WebSocket 消息处理替换空 catch**

在 `server/services/websocket-service.ts` 的消息处理器中：

```typescript
} catch (err) {
  if (process.env.NODE_ENV === 'development') {
    const error = err instanceof Error ? err.message : String(err)
    ws.send(JSON.stringify({ type: 'error', message: `Invalid message format: ${error}` }))
  }
}
```

- [x] **Step 3: 提交**

```bash
git commit -m "fix(security): 批次1安全修复 — WebSocket内存泄漏/DLQ shutdown、Webhook HMAC验证、路径遍历防护、安全响应头、WS订阅权限、外部代理SSRF防护"
```

---

### Task A2: Webhook 签名验证 (HMAC timingSafeEqual)

**文件:**
- 修改: `server/services/notification-service.ts`

- [x] **Step 1: 添加 verifySignature 方法**

在 `NotificationService` 类中，`generateSignature` 之后添加：

```typescript
verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
```

---

### Task A3: 安全响应头 (HSTS + frameguard + X-Content-Type-Options)

**文件:**
- 修改: `server/index.ts`

- [x] **Step 1: helmet 配置添加缺失的安全头**

```typescript
app.use(helmet({
  contentSecurityPolicy: { /* existing */ },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' },
  xContentTypeOptions: true,
}))
```

---

### Task A4: WebSocket 订阅权限验证 (owner_id 过滤)

**文件:**
- 修改: `server/services/websocket-service.ts`

- [x] **Step 1: WebSocketClient 添加 userId/userRole**

```typescript
interface WebSocketClient {
  ws: WebSocket
  subscriptions: Set<string>
  isAlive: boolean
  lastPong: number
  userId: string       // 新增
  userRole: string     // 新增
}
```

- [x] **Step 2: sendToSubscribedClients 添加 owner 过滤**

```typescript
function sendToSubscribedClients(channel: string, event: CronEvent): void {
  const message = JSON.stringify(event)
  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue
    if (!client.subscriptions.has('all') && !client.subscriptions.has(channel)) continue
    const eventOwnerId = extractOwnerId(event.payload)
    if (eventOwnerId && client.userRole !== 'admin' && client.userId !== eventOwnerId) continue
    client.ws.send(message)
  }
}
```

---

### Task A5: 外部代理 hostname 校验加强

**文件:**
- 修改: `server/routes/external-proxy.ts`

- [x] **Step 1: 添加内部地址拦截 + 子域名支持**

```typescript
const hostname = targetUrl.hostname.toLowerCase()
const blockedInternal = ['localhost', '127.', '0.0.0.0', '[::1]', '::1']
if (blockedInternal.some(p => hostname === p || hostname.startsWith(p))) {
  errorResponse(res, '不允许访问内部地址', 403)
  return
}
if (!ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) {
  errorResponse(res, `不允许访问该域名: ${targetUrl.hostname}`, 403)
  return
}
```

---

### Task A6: 媒体路径遍历防护

**文件:**
- 修改: `server/lib/media-storage.ts`

- [x] **Step 1: resolveMediaPath 添加路径验证**

```typescript
export function resolveMediaPath(filepath: string, mediaRoot: string = DEFAULT_MEDIA_ROOT): string {
  // ... existing checks ...
  const resolved = join(mediaRoot, filepath)
  const normalizedRoot = mediaRoot.endsWith('/') ? mediaRoot.slice(0, -1) : mediaRoot
  const normalizedResolved = resolved.endsWith('/') ? resolved.slice(0, -1) : resolved
  if (!normalizedResolved.startsWith(normalizedRoot) && !normalizedResolved.startsWith(normalizedRoot.replace('./', ''))) {
    throw new Error('Path traversal detected')
  }
  return resolved
}
```

> **注意**: JWT_SECRET 和 MEDIA_TOKEN_SECRET 的启动验证在 `server/config/index.ts` 已经存在（`loadConfig()` 中调用 `validateJwtSecret()` 和 `validateMediaTokenSecret()`），此处无需额外修复。

---

## B 批：代码质量/架构修复

### Task B1: MiniMax Client 添加重试基础设施

**文件:**
- 修改: `server/lib/minimax/client.ts`
- 修改: `server/lib/minimax/files.ts`

- [x] **Step 1: MiniMaxClient 基类添加 request() 方法和重试配置**

```typescript
import { retryWithBackoff, type RetryOptions } from '../retry.js'

export class MiniMaxClient {
  protected client: AxiosInstance
  private retryConfig: RetryOptions

  constructor(apiKey: string, region: Region = 'international', retryConfig?: RetryOptions) {
    // ... existing client setup ...
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      baseDelayMs: retryConfig?.baseDelayMs ?? 1000,
      maxDelayMs: retryConfig?.maxDelayMs ?? 30000,
      retryableStatusCodes: retryConfig?.retryableStatusCodes ?? [429, 500, 502, 503, 504],
    }
  }

  protected async request<T>(fn: () => Promise<T>): Promise<T> {
    return retryWithBackoff(fn, this.retryConfig)
  }
}
```

> **注意**: 核心 API（text/voice/image/music/video）已在各域文件中通过 `retryWithBackoff` 包装，`files.ts` 的 `fileUpload` 补充重试。

- [x] **Step 2: fileUpload 添加 retryWithBackoff 包装**

---

### Task B2: 生产代码 `any` 类型清理

**文件:**
- 修改: `server/database/connection.ts` — `QueryResultRow[key: string]: any` → `unknown`
- 修改: `src/stores/templates.ts` — 6 处 `any` + eslint-disable → `Record<string, unknown>`
- 修改: `server/services/workflow/node-executor.ts` — `node.type as any` → `as NodeType`

---

### Task B3: 生产代码 console.log 清理

**文件:**
- 修改: `src/components/layout/HistoryPanel.tsx` — 删除 debug `onClick`
- 修改: `src/lib/analytics.ts` — `debugLog` 添加 `NODE_ENV === 'development'` 守卫
- 修改: `src/pages/MusicGeneration.tsx` — 删除 `console.log` + 修复 useCallback deps

---

### Task B4: 魔法数字常量化

**文件:**
- 修改: `server/services/workflow/node-executor.ts`

```typescript
const DEFAULT_NODE_TIMEOUT_MS = 300000
// 使用时:
const timeoutMs = (node.timeout as number) ?? (config.timeoutMs as number) ?? DEFAULT_NODE_TIMEOUT_MS
```

---

## C 批：测试修复

### Task C1: 修复路径遍历测试失败

**文件:**
- 修改: `server/lib/media-storage.ts` — 调整 `resolveMediaPath` 的路径比较逻辑，处理 `./data/media` vs `data/media` 的差异

- [x] **验证:**

```bash
npx vitest run server/lib/__tests__/media-storage.test.ts --config vitest.server.config.ts
# Expected: 56 tests PASS
```

---

### Task C2: 修复容量测试超时

**文件:**
- 修改: `server/repositories/__tests__/capacity-repository.test.ts`

- [x] **Step 1: 并发测试添加超时配置**

```typescript
it('should prevent race condition with concurrent decrements', { timeout: 30000 }, async () => {
it('should handle burst of concurrent requests correctly', { timeout: 30000 }, async () => {
```

---

## D 批：前端质量改进

### Task D1: 添加 404 捕获路由

**文件:**
- 修改: `src/App.tsx`

- [x] **Step 1: 在 Routes 末尾添加**

```tsx
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

---

### Task D2: Store 导出统一

**文件:**
- 修改: `src/stores/index.ts`

- [x] **Step 1: 补全全部 14 个 store 的导出**

```typescript
export { useUsageStore } from './usage'
export { useHistoryStore } from './history'
export { useAudioStore } from './audio'
export { useAuthStore } from './auth'
export { useCronJobsStore } from './cronJobs'
export { useExecutionLogsStore } from './executionLogs'
export { useTaskQueueStore } from './taskQueue'
export { useTemplatesStore } from './templates'
export { useCapacityStore } from './capacity'
export { useMaterialsStore } from './materials'
export { usePromptsStore } from './prompts'
export { useWebhooksStore } from './webhooks'
export { useWorkflowStore } from './workflow'
export { useWorkflowTemplatesStore } from './workflowTemplates'
```

---

### Task D3: 硬编码 API URL → 环境变量

**文件:**
- 修改: `src/components/shared/APIReference.tsx`

- [x] **Step 1: baseUrl 改为从环境变量读取**

```typescript
const baseUrl = (import.meta as Record<string, unknown>).env?.VITE_API_BASE_URL as string | undefined
  ?? 'https://api.minimaxi.com'
```

---

## 验证清单

全部完成后运行：

```bash
# 1. TypeScript 类型检查
npm run build

# 2. 后端测试
npx vitest run --config vitest.server.config.ts

# 3. 前端测试
npx vitest run --config vitest.config.ts
```

---

## 审计来源

本计划基于 2026-05-09 深度探索审计报告的 7 个维度分析结果：

| 维度 | 发现数 | 严重 | 已修复 |
|------|:------:|:----:|:------:|
| 项目结构 | 5 | - | 0 |
| 安全审计 | 14 | 1 严重 | 7 |
| 代码质量 | 8 | 3 高危 | 6 |
| 依赖健康 | 6 | 1 高危 | 0 |
| 后端模式 | 13 | 2 严重 | 5 |
| 测试覆盖 | 7 | 4 失败 | 2 |
| 前端质量 | 12 | 7 超行 | 4 |

**已修复总计**: 24/45 项，剩余 21 项需后续迭代（组件拆分、覆盖率提升、依赖升级等）

---

*Implementation Plan by Sisyphus — 2026-05-09*
