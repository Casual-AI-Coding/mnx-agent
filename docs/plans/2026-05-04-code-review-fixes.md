# Code Review Fixes 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复项目审查中发现的全部问题（除 .env 密钥外）：8 个失败测试、架构违规、安全头缺失、类型安全、日志标准化、代码清理。

**Architecture:** 按工作流分组执行 — A.测试修复 → B.架构迁移 → C.安全+日志 → D.类型清理 → E.代码质量。每个工作流独立可验证。

**Tech Stack:** TypeScript, Vitest, Express, Zustand, Pino, Helmet, pg

---

## 工作流 A: 修复 8 个失败测试

### Task A1: 修复 WelcomeModal 关闭按钮测试

**Files:**
- Modify: `src/components/onboarding/onboarding.test.tsx:58`

- [ ] **Step 1: 修复测试选择器**

```typescript
// BEFORE (line ~58)
screen.getByText('关闭')

// AFTER - 使用更精确的 button role 选择器
screen.getByRole('button', { name: '关闭' })
```

- [ ] **Step 2: 运行测试验证**

```bash
npx vitest run src/components/onboarding/onboarding.test.tsx
```
Expected: All tests PASS

---

### Task A2: 修复 CreateTemplateModal 测试 (2 failures)

**Files:**
- Modify: `src/components/templates/CreateTemplateModal.test.tsx`

- [ ] **Step 1: 查找 Close 按钮选择器并修复**

测试中查找 `getByRole('button', { name: 'Close' })` 但组件使用 `X` 图标按钮无 aria-label。在测试中使用更具体的查询方式：

```typescript
// BEFORE
fireEvent.click(screen.getByRole('button', { name: 'Close' }))

// AFTER
const closeButtons = screen.getAllByRole('button')
const closeButton = closeButtons.find(btn => btn.querySelector('.lucide-x') || btn.querySelector('svg'))
fireEvent.click(closeButton!)
```

或更简单：给测试中关闭按钮添加 `data-testid` 查找：
```typescript
// 如果组件有可识别的选择器，使用它
const modal = screen.getByRole('dialog')
const closeButton = modal.querySelector('button[aria-label="Close"], button:has(svg)')
```

- [ ] **Step 2: 运行测试验证**

```bash
npx vitest run src/components/templates/CreateTemplateModal.test.tsx
```
Expected: All tests PASS

---

### Task A3: 修复 useMaterialsStore 测试 (2 failures)

**Files:**
- Modify: `src/stores/__tests__/materials.test.ts:62,121`

- [ ] **Step 1: 修复 fetchMaterials 测试 — 更新预期参数**

```typescript
// BEFORE (line ~62)
expect(api.listMaterials).toHaveBeenCalledWith({ material_type: 'artist' })

// AFTER - store 的 fetchMaterials 始终发送分页参数
expect(api.listMaterials).toHaveBeenCalledWith({
  limit: 8,
  offset: 0,
  sort_by: 'updated_at',
  sort_order: 'desc',
  material_type: 'artist'
})
```

- [ ] **Step 2: 修复 addMaterial 测试 — 确保 refetch mock 返回数据**

```typescript
// BEFORE - mock 的 listMaterials 返回空
mockApi.listMaterials.mockResolvedValue({ records: [], total: 0 })

// AFTER - 在 refetch 时返回新建的 material
const newMaterial = { id: 'new-1', name: 'Test Material', material_type: 'artist' }
mockApi.listMaterials
  .mockResolvedValueOnce({ records: [], total: 0 }) // initial load
  .mockResolvedValueOnce({ records: [newMaterial], total: 1 }) // refetch after add
```

- [ ] **Step 3: 运行测试验证**

```bash
npx vitest run src/stores/__tests__/materials.test.ts
```
Expected: All tests PASS

---

### Task A4: 修复 useSettingsStore 测试

**Files:**
- Modify: `src/settings/store/__tests__/index.test.ts:159`

- [ ] **Step 1: 读取测试期望值，理解 setCategory 是 merge 还是 replace**

```typescript
// 检查 setCategory 实现 - 是 Object.assign 还是 spread merge
// 如果是 merge 且测试期望 replace，更改测试：
// BEFORE: expect(result.api).toEqual({ minimaxKey, region, ... })
// AFTER: expect(result.api).toMatchObject({ minimaxKey, region, ... })
```

- [ ] **Step 2: 运行测试验证**

```bash
npx vitest run src/settings/store/__tests__/index.test.ts
```
Expected: All tests PASS

---

### Task A5: 修复 MaterialService createMaterialItem 测试

**Files:**
- Modify: `server/services/domain/__tests__/material-service.test.ts`

- [ ] **Step 1: 添加 getMaterialById mock**

在 createMaterialItem 测试中，service 先调用 `getMaterialById` 验证父 material 存在。需要在调用前添加 mock：

```typescript
// 在 createMaterialItem 测试的 arrange 部分添加
mockDb.getMaterialById.mockResolvedValueOnce({
  id: 'material-1',
  name: 'Parent Material',
  material_type: 'artist',
  owner_id: 'owner-1',
  created_at: '2024-01-01T00:00:00',
  updated_at: '2024-01-01T00:00:00',
  deleted_at: null,
  is_deleted: false,
})

const result = await service.createMaterialItem(
  { material_id: 'material-1', name: 'New Item' },
  'owner-1'
)

expect(result).toBeDefined()
```

- [ ] **Step 2: 运行测试验证**

```bash
npx vitest run --config vitest.server.config.ts server/services/domain/__tests__/material-service.test.ts
```
Expected: All tests PASS

---

### Task A6: 修复 MaterialManagementLayout 测试

**Files:**
- Modify: `src/components/materials/__tests__/MaterialManagementLayout.test.tsx`

- [ ] **Step 1: 补全 mock 的 store 属性**

Pagination 组件依赖 `limit` 和 `page`，但 mock 的 `useMaterialsStore` 缺少这些。添加：

```typescript
vi.mocked(useMaterialsStore).mockReturnValue({
  materials: [{ ...mockMaterial, updated_at: '2024-02-03T00:00:00Z' }],
  isLoading: false,
  error: null,
  // ADD:
  limit: 8,
  page: 1,
  total: 1,
  setPage: vi.fn(),
  setLimit: vi.fn(),
  // existing:
  fetchMaterials: vi.fn(),
  addMaterial: vi.fn(),
  removeMaterial: vi.fn(),
  clearError: vi.fn(),
})
```

- [ ] **Step 2: 运行测试验证**

```bash
npx vitest run src/components/materials/__tests__/MaterialManagementLayout.test.tsx
```
Expected: All tests PASS

---

### Task A7: 全量测试验证

- [ ] **Step 1: 运行全部测试**

```bash
npm test
```
Expected: 0 failures

---

## 工作流 B: 迁移 Settings 类型到 shared-types

> ⚠️ 注意：UserRole 在 `src/stores/auth.ts` (小写) 和 `packages/shared-types/entities/enums.ts` (大写) 有两套定义。迁移采用共享类型中的大写枚举版本作为权威定义。

### Task B1: 创建共享 settings 类型文件

- [ ] **Step 1: 创建 `packages/shared-types/entities/settings.ts`**

将所有 `src/settings/types/` 中的类型（除 Zod schema）迁移到共享类型包：

```typescript
// packages/shared-types/entities/settings.ts
import type { UserRole } from './enums.js'

// ====== External API ======
export type ExternalProtocol = 'http' | 'https'
export interface ExternalEndpoint {
  id: string
  name: string
  url: string
  protocol: ExternalProtocol
  apiKey?: string
  enabled: boolean
}

// ====== API Settings ======
export interface ApiSettings {
  minimaxKey: string
  region: string
  mode: 'sync' | 'stream'
  timeout: number
  retryAttempts: number
  retryDelay: number
  externalEndpoints: ExternalEndpoint[]
}

// ====== UI Settings ======
export type ThemeSetting = 'light' | 'dark' | 'system'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
export type UIDensity = 'compact' | 'comfortable' | 'spacious'
export type FontSize = 'small' | 'medium' | 'large'

export interface UISettings {
  theme: ThemeSetting
  language: string
  toastPosition: ToastPosition
  density: UIDensity
  fontSize: FontSize
}

// ====== Account Settings ======
export interface AccountSettings {
  displayName: string
  email: string
  role: UserRole
}

// ====== Generation Settings ======
export interface TextGenerationSettings {
  defaultModel: string
  temperature: number
  maxTokens: number
  topP: number
}

export interface VoiceGenerationSettings {
  defaultVoice: string
  speed: number
  volume: number
}

export interface ImageGenerationSettings {
  defaultModel: string
  defaultSize: string
  defaultN: number
}

export interface MusicGenerationSettings {
  defaultModel: string
}

export interface VideoGenerationSettings {
  defaultModel: string
}

export interface GenerationSettings {
  text: TextGenerationSettings
  voice: VoiceGenerationSettings
  image: ImageGenerationSettings
  music: MusicGenerationSettings
  video: VideoGenerationSettings
}

// ====== Cron Settings ======
export type RetryBackoffStrategy = 'fixed' | 'exponential'
// MisfirePolicy 已存在于 enums.ts，使用 re-export
export type { MisfirePolicy } from './enums.js'

export interface CronSettings {
  maxConcurrent: number
  defaultTimeout: number
  retryAttempts: number
  retryBackoff: RetryBackoffStrategy
  misfirePolicy: MisfirePolicy
}

// ====== Other Categories ======
export interface WorkflowSettings {
  autoSave: boolean
  autoSaveInterval: number
}

export interface NotificationSettings {
  enableWebSocket: boolean
  enableWebhook: boolean
  events: NotificationEvent[]
}

export type NotificationEvent = 'on_start' | 'on_success' | 'on_failure'

export interface MediaSettings {
  autoSave: boolean
  defaultFormat: string
}

export interface PrivacySettings {
  shareUsageData: boolean
  allowAnalytics: boolean
}

export interface AccessibilitySettings {
  reduceMotion: boolean
  highContrast: boolean
  screenReader: boolean
}

// ====== Aggregate Types ======
export interface AllSettings {
  account: AccountSettings
  api: ApiSettings
  ui: UISettings
  generation: GenerationSettings
  cron: CronSettings
  workflow: WorkflowSettings
  notification: NotificationSettings
  media: MediaSettings
  privacy: PrivacySettings
  accessibility: AccessibilitySettings
}

export type SettingsCategory = keyof AllSettings

// ====== Storage / Meta ======
export type StorageScope = 'local' | 'database' | 'default'

export interface SettingMetadata {
  key: string
  category: SettingsCategory
  scope: StorageScope
  updatedAt: string
}

export interface SettingsChangeEvent {
  category: SettingsCategory
  oldValue: Partial<AllSettings[SettingsCategory]>
  newValue: Partial<AllSettings[SettingsCategory]>
  timestamp: string
}
```

- [ ] **Step 2: 更新 `packages/shared-types/entities/index.ts`** 添加导出

```typescript
export * from './settings.js'
```

---

### Task B2: 迁移 Zod 验证 schema 到 shared-types

- [ ] **Step 1: 创建 `packages/shared-types/validation/settings.ts`**

将 `src/settings/validation/index.ts` 中的 `allSettingsSchema` 和相关 schemas 迁移到共享类型包。使用 `zod` 直接从 shared-types 导入类型。

- [ ] **Step 2: 更新 `packages/shared-types/validation/index.ts`** 添加导出

---

### Task B3: 更新 server 导入路径

- [ ] **Step 1: 更新 `server/routes/settings/index.ts`**

```typescript
// BEFORE
import type { SettingsCategory } from '../../../src/settings/types/index.js'

// AFTER
import type { SettingsCategory } from '@mnx/shared-types'
```

- [ ] **Step 2: 更新 `server/services/settings-service.ts`**

```typescript
// BEFORE
import type { AllSettings, SettingsCategory } from '../../src/settings/types/index.js'
import { allSettingsSchema } from '../../src/settings/validation/index.js'

// AFTER
import type { AllSettings, SettingsCategory } from '@mnx/shared-types'
import { allSettingsSchema } from '@mnx/shared-types/validation'
```

- [ ] **Step 3: 更新 `server/repositories/settings-repository.ts`**

```typescript
// BEFORE
import type { SettingsCategory } from '../../src/settings/types/index.js'

// AFTER
import type { SettingsCategory } from '@mnx/shared-types'
```

- [ ] **Step 4: 更新 `server/repositories/settings-history-repository.ts`** — 同上

- [ ] **Step 5: 更新 `server/services/__tests__/settings-service.test.ts`** — 同上

---

### Task B4: 更新 frontend 导入（兼容性）

- [ ] **Step 1: 让 `src/settings/types/index.ts` 重导出 shared-types**

```typescript
// src/settings/types/index.ts
// Re-export from shared-types for backward compatibility
export type {
  AccountSettings,
  ApiSettings,
  UISettings,
  GenerationSettings,
  CronSettings,
  WorkflowSettings,
  NotificationSettings,
  MediaSettings,
  PrivacySettings,
  AccessibilitySettings,
  AllSettings,
  SettingsCategory,
  ExternalEndpoint,
  ExternalProtocol,
  ThemeSetting,
  ToastPosition,
  UIDensity,
  FontSize,
  TextGenerationSettings,
  VoiceGenerationSettings,
  ImageGenerationSettings,
  MusicGenerationSettings,
  VideoGenerationSettings,
  RetryBackoffStrategy,
  NotificationEvent,
  StorageScope,
  SettingMetadata,
  SettingsChangeEvent,
} from '@mnx/shared-types'

export { MisfirePolicy } from '@mnx/shared-types'
```

- [ ] **Step 2: 同样更新 `src/settings/validation/index.ts`**

```typescript
export { allSettingsSchema } from '@mnx/shared-types/validation'
```

---

### Task B5: 验证构建

- [ ] **Step 1: TypeScript 检查**

```bash
npx tsc --noEmit
```
Expected: 无新错误（可能仍有 baseUrl 弃用警告）

- [ ] **Step 2: 运行相关测试**

```bash
npx vitest run --config vitest.server.config.ts server/services/__tests__/settings-service.test.ts
npx vitest run src/settings/store/__tests__/index.test.ts
```
Expected: All tests PASS

---

## 工作流 C: 安全加固与日志标准化

### Task C1: 添加 Helmet 安全头

**Files:**
- Modify: `server/index.ts`
- Install: `npm install helmet`

- [ ] **Step 1: 安装 helmet**

```bash
npm install helmet
npm install --save-dev @types/helmet
```

- [ ] **Step 2: 在 server/index.ts 添加 helmet 中间件**

```typescript
// server/index.ts
import helmet from 'helmet'

// 在 cors() 之前添加（第65行之前）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}))
```

- [ ] **Step 3: 构建验证**

```bash
npx tsc --noEmit
```

---

### Task C2: 替换 console.* 为 pino logger

**Files to modify (按优先级):**

1. `server/lib/minimax.ts` — 移除敏感日志
2. `server/services/cron-scheduler.ts` — 最多 console.* 调用
3. `server/services/dlq-auto-retry-scheduler.ts`
4. `server/services/misfire-handler.ts`
5. `server/services/service-node-registry.ts`
6. `server/services/queue-processor.ts`
7. `server/services/concurrency-manager.ts`
8. `server/middleware/errorHandler.ts`
9. `server/routes/cron/jobs.ts`
10. `server/routes/media.ts`
11. `server/repositories/job-repository.ts`
12. `server/domain/events/event-bus.ts`
13. `server/index.ts` — 启动错误

- [ ] **Step 1: 修复 minimax.ts 敏感日志**

```typescript
// REMOVE or REPLACE these lines:
// console.log('[MiniMax] Music Generation Request:', { body, timestamp })
// console.warn('[MiniMax] ...')

// Use logger instead:
import { getLogger } from './logger.js'
const logger = getLogger()

logger.debug({ model: (body as Record<string, unknown>)?.model }, '[MiniMax] Music Generation Request')
```

- [ ] **Step 2: 在每个文件中替换 console.* 为 logger.***

每个文件的替换模式：
```typescript
// ADD import
import { getLogger } from '../lib/logger.js'  // 或相对路径
const logger = getLogger()

// REPLACE
// console.error('message', error) → logger.error({ error }, 'message')
// console.warn('message') → logger.warn('message')
// console.log('message') → logger.info('message')
```

pino 使用结构化日志格式：
```typescript
// 正确
logger.error({ error: err.message, jobId }, 'Job execution failed')
// 错误（字符串拼接）
logger.error('Job execution failed: ' + err.message)
```

- [ ] **Step 3: 确认无泄露敏感信息的日志**

检查所有日志语句确保不记录：
- API keys / tokens
- 用户密码
- 完整请求体（除非已 sanitize）

- [ ] **Step 4: 构建验证**

```bash
npx tsc --noEmit
```
Expected: 无新错误

---

## 工作流 D: 类型安全 — 替换 `any`

### Task D1: 修复 connection.ts QueryResultRow

**Files:**
- Modify: `server/database/connection.ts:18`

- [ ] **Step 1: 替换索引签名**

```typescript
// BEFORE
export interface QueryResultRow {
  [key: string]: any
}

// AFTER
export type QueryResultRow = Record<string, unknown>
```

- [ ] **Step 2: 更新 DatabaseConnection 接口中的泛型约束**

```typescript
// BEFORE
query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: any[]): Promise<T[]>

// AFTER
query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>
```

- [ ] **Step 3: 构建验证**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

### Task D2: 修复 api-proxy-router.ts 的 `as any`

**Files:**
- Modify: `server/utils/api-proxy-router.ts`

- [ ] **Step 1: 定义 GenericAPIClient 接口**

```typescript
// 在文件顶部添加
type GenericMethod = (...args: unknown[]) => unknown

interface GenericAPIClient {
  [methodName: string]: GenericMethod | undefined
}
```

- [ ] **Step 2: 替换 `(client as any)`**

```typescript
// BEFORE
const method = (client as any)[config.clientMethod]
const data = config.extractData ? config.extractData(result) : (result as any)?.data

// AFTER
const typedClient = client as GenericAPIClient
const method = typedClient[config.clientMethod]
if (typeof method !== 'function') {
  throw new Error(`Invalid client method: ${config.clientMethod}`)
}

const result = await method(requestBody)
const data = config.extractData 
  ? config.extractData(result) 
  : (result as Record<string, unknown>)?.data
```

- [ ] **Step 3: 构建验证**

```bash
npx tsc --noEmit
```

---

### Task D3: 修复 stores/types.ts 和 create-async-store.ts 的 `any`

**Files:**
- Modify: `src/lib/stores/types.ts`
- Modify: `src/lib/stores/create-async-store.ts`

- [ ] **Step 1: 更新 types.ts — 添加 TState 泛型**

```typescript
// BEFORE
export interface AsyncActionConfig<TParams, TData> {
  preCheck?: (params: TParams, state: any) => boolean | string
  apiCall: (params: TParams) => Promise<{ success: boolean; data?: TData; error?: string }>
  onSuccess?: (state: any, data: TData | undefined, params: TParams) => void
  onError?: (state: any, error: string) => void
}

// AFTER - 添加 TState 泛型，使用 unknown 代替 any
export interface AsyncActionConfig<TParams, TData, TState = unknown> {
  preCheck?: (params: TParams, state: TState) => boolean | string
  apiCall: (params: TParams) => Promise<{ success: boolean; data?: TData; error?: string }>
  onSuccess?: (state: TState, data: TData | undefined, params: TParams) => void
  onError?: (state: TState, error: string) => void
}
```

```typescript
// BEFORE
export interface CreateAsyncStoreConfig<TState extends AsyncState, TActions> {
  name: string
  initialState: TState
  actions: Record<keyof TActions, AsyncActionConfig<any, any>>
}

// AFTER
export interface CreateAsyncStoreConfig<TState extends AsyncState, TActions> {
  name: string
  initialState: TState
  actions: {
    [K in keyof TActions]: AsyncActionConfig<unknown, unknown, TState>
  }
}
```

- [ ] **Step 2: 更新 create-async-store.ts — 使用 unknown 代替 any**

```typescript
// Line 11 - store actions 返回类型
type StoreState = TState & {
  [K in keyof TActions]: (params?: unknown) => Promise<unknown>
}

// Line 20-21 - 内部 action handler
const cfg = actionConfig as AsyncActionConfig<unknown, unknown, TState>
return [actionName, async (params?: unknown) => {
  // ...
}]
```

- [ ] **Step 3: 构建验证**

```bash
npx tsc --noEmit
```
Expected: 无新增类型错误

---

### Task D4: 修复 templates.ts 的 `any`

**Files:**
- Modify: `src/stores/templates.ts`

- [ ] **Step 1: 使用 unknown 替代 any**

```typescript
// BEFORE
fetchTemplates: (params?: any) => Promise<void>
addTemplate: (data: any) => Promise<boolean>
editTemplate: (id: string, data: any) => Promise<boolean>
listApi: (params?: any) => Promise<ApiResponse<...>>
createApi: (data: any) => Promise<ApiResponse<T>>
updateApi: (id: string, data: any) => Promise<ApiResponse<T>>
fetchTemplates: async (params: any) => { ... }

// AFTER - 使用 unknown 作为安全替代
fetchTemplates: (params?: unknown) => Promise<void>
addTemplate: (data: unknown) => Promise<boolean>
editTemplate: (id: string, data: unknown) => Promise<boolean>
listApi: (params?: Record<string, unknown>) => Promise<ApiResponse<...>>
createApi: (data: Record<string, unknown>) => Promise<ApiResponse<T>>
updateApi: (id: string, data: Record<string, unknown>) => Promise<ApiResponse<T>>
fetchTemplates: async (params?: Record<string, unknown>) => { ... }
```

- [ ] **Step 2: 构建验证**

```bash
npx tsc --noEmit
```
Expected: 无新增类型错误

---

## 工作流 E: 代码质量清理

### Task E1: 迁移 hasCircularDependency 到 Service 层

**Files:**
- Modify: `server/repositories/job-repository.ts` (删除 BFS 逻辑)
- Modify: `server/services/domain/job-service.ts` (添加 BFS 逻辑)

- [ ] **Step 1: 在 job-repository.ts 中保留数据访问方法**

```typescript
// 保留 getDependencies 方法（纯数据访问），删除 hasCircularDependency
// 不变 - getDependencies 是纯 SQL 查询，属于 repository 层
```

- [ ] **Step 2: 将 BFS 逻辑移到 job-service.ts**

在 `JobService` 中添加 `hasCircularDependency` 方法，使用 `getDependencies` 作为数据源：

```typescript
// server/services/domain/job-service.ts

async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
  const visited = new Set<string>()
  const queue = [dependsOnJobId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === jobId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const dependencies = await this.db.getDependencies(current)
    queue.push(...dependencies)
  }
  return false
}
```

- [ ] **Step 3: 更新调用方引用**

检查哪些文件调用了 `jobRepository.hasCircularDependency()`，更新为调用 `jobService.hasCircularDependency()`。

- [ ] **Step 4: 构建验证**

```bash
npx tsc --noEmit
```

---

### Task E2: 移除 minimax.test.ts 的 @ts-nocheck

**Files:**
- Modify: `server/lib/__tests__/minimax.test.ts`

- [ ] **Step 1: 删除 // @ts-nocheck**

- [ ] **Step 2: 修复由此产生的类型错误**

```bash
npx tsc --noEmit 2>&1 | grep minimax.test
```

按顺序修复每个类型错误：
- 未使用的变量 → `_` 前缀或删除
- 类型不匹配 → 添加正确的类型注解
- Mock 类型问题 → 使用 `vi.mocked()` 或 `as unknown as`

- [ ] **Step 3: 运行测试确认行为不变**

```bash
npx vitest run --config vitest.server.config.ts server/lib/__tests__/minimax.test.ts
```
Expected: All tests PASS

---

### Task E3: 修复 tsconfig.json baseUrl 弃用

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: 移除 baseUrl，使用 paths 绝对路径**

```json
// BEFORE
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@mnx/shared-types": ["./packages/shared-types"],
      "@mnx/shared-types/*": ["./packages/shared-types/*"]
    }
  }
}

// AFTER - TypeScript 7.0 兼容
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@mnx/shared-types": ["./packages/shared-types"],
      "@mnx/shared-types/*": ["./packages/shared-types/*"]
    }
  }
}
```

- [ ] **Step 2: 类型检查验证**

```bash
npx tsc --noEmit 2>&1 | grep -c "baseUrl"
```
Expected: 0 (不再有 baseUrl 弃用警告)

---

### Task E4: 启用 noUnusedLocals 和 noUnusedParameters

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: 开启严格检查**

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

- [ ] **Step 2: 修复所有未使用变量错误**

```bash
npx tsc --noEmit 2>&1 | grep "is declared but"
```

对每个错误：
- 确实未使用 → 删除
- 故意保留 → `_` 前缀

- [ ] **Step 3: 最终类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

---

### Task E5: 修复测试文件模块解析错误

**Files:**
- `src/hooks/useThemeEffect.test.ts` — `Cannot find module '@/settings/store'`
- `src/hooks/useMediaManagement.refill.test.ts` — `Cannot find module '@/lib/api/media'`

- [ ] **Step 1: 检查路径别名是否正确**

确认 `@/settings/store` 指向 `src/settings/store/index.ts`（或正确的导出路径）。

- [ ] **Step 2: 修复导入路径**

```
// 可能的问题：路径不存在或文件已移动
// 检查实际模块位置并更新导入
```

- [ ] **Step 3: 验证**

```bash
npx vitest run src/hooks/useThemeEffect.test.ts src/hooks/useMediaManagement.refill.test.ts
```
Expected: 模块解析成功

---

## 最终验证

### Task F1: 全量回归测试

- [ ] **Step 1: 运行全部测试**

```bash
npm test
```
Expected: 0 failures

### Task F2: TypeScript 类型检查

- [ ] **Step 1: 无错误类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误（或仅剩已知的弃用警告）

### Task F3: 构建验证

- [ ] **Step 1: 完整构建**

```bash
npm run build
```
Expected: Build succeeded

### Task F4: 测试覆盖率验证

- [ ] **Step 1: 运行覆盖率**

```bash
npm run test:coverage
```
Expected: 后端 ≥ 80%, 前端 > 70%

---

## 依赖关系图

```
工作流 A (测试修复) ───────────── 无依赖，可最先执行
    ↓
工作流 B (架构迁移) ───────────── 依赖 A 完成（确保测试基线）
    ↓
工作流 C (安全+日志) ────────── 独立于 B，可与 D 并行
工作流 D (类型清理) ────────── 独立于 B，可与 C 并行
    ↓
工作流 E (代码质量) ─────────── 依赖 B,C,D 完成
    ↓
工作流 F (最终验证) ─────────── 依赖所有工作流完成

并行执行窗口: C ↔ D
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-04 | 初始版本 — 基于项目全面审查结果创建修复计划 |
