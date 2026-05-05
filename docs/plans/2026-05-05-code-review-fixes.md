# 代码审查问题修复 - 实现计划

> **对于 Agentic Workers:** 确保每个 Task 独立完成、验证通过后再进入下一步。使用 checkbox (`- [ ]`) 跟踪进度。
>
> **需求子技能:** 使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务实现此计划。

**目标:** 修复 2026-05-05 代码审查报告中的 10 项 P0-P3 问题，覆盖加密实现、安全加固、大文件拆分、工程改进。

**架构:** 分 4 批独立执行：A 批(安全核心) -> B 批(前端拆分) -> C 批(后端拆分) -> D 批(工程改进)。每批内按依赖排序，批间无依赖可并行规划。加密采用 AES-256-GCM，前端组件按功能域拆分，后端按 API 域/业务拆分。

**技术栈:** TypeScript + React 18 + Express + pino + PostgreSQL + Vitest + Node.js crypto + helmet

---

## A 批：安全核心（P0 + P1）

---

### Task A1: 创建加密工具模块

**文件:**
- 创建: `server/lib/crypto.ts`
- 创建: `server/lib/__tests__/crypto.test.ts`

- [ ] **Step 1: 编写加密模块的失败测试**

在 `server/lib/__tests__/crypto.test.ts` 中：

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, isEncrypted, ENCRYPTION_PREFIX } from '../crypto.js'

describe('crypto', () => {
  const plaintext = 'sk-minimax-api-key-12345'

  describe('encrypt', () => {
    it('应该返回带 enc: 前缀的密文', () => {
      const result = encrypt(plaintext)
      expect(result).toMatch(/^enc:/)
    })

    it('每次加密应产生不同的密文', () => {
      const r1 = encrypt(plaintext)
      const r2 = encrypt(plaintext)
      expect(r1).not.toEqual(r2)
    })

    it('空字符串应返回空字符串', () => {
      expect(encrypt('')).toBe('')
    })

    it('已有 enc: 前缀的值不应重复加密', () => {
      const encrypted = encrypt(plaintext)
      const reEncrypted = encrypt(encrypted)
      expect(reEncrypted).toEqual(encrypted)
    })
  })

  describe('decrypt', () => {
    it('应能解密加密的字符串', () => {
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('不包含 enc: 前缀的值应原样返回', () => {
      expect(decrypt(plaintext)).toBe(plaintext)
      expect(decrypt('')).toBe('')
    })

    it('篡改密文应抛出错误', () => {
      const encrypted = encrypt(plaintext)
      const tampered = encrypted.slice(0, -4) + 'abcd'
      expect(() => decrypt(tampered)).toThrow()
    })
  })

  describe('isEncrypted', () => {
    it('enc: 前缀的值返回 true', () => {
      expect(isEncrypted('enc:abc')).toBe(true)
    })

    it('无 enc: 前缀的值返回 false', () => {
      expect(isEncrypted('plaintext')).toBe(false)
      expect(isEncrypted('')).toBe(false)
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run server/lib/__tests__/crypto.test.ts`
Expected: 全部 FAIL（文件不存在或函数未定义）

- [ ] **Step 3: 实现加密模块**

在 `server/lib/crypto.ts` 中：

```typescript
import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
export const ENCRYPTION_PREFIX = 'enc:'

function getEncryptionKey(): Buffer {
  const keyHex = process.env.SETTINGS_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY 必须为 64 字符的 hex 字符串（32 字节）'
    )
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * 加密字符串，返回 `enc:{nonce}:{ciphertext}:{authTag}` 格式
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext
  if (isEncrypted(plaintext)) return plaintext

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`
}

/**
 * 解密字符串，非加密值直接返回
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext
  if (!isEncrypted(ciphertext)) return ciphertext

  const payload = ciphertext.slice(ENCRYPTION_PREFIX.length)
  const parts = payload.split(':')
  if (parts.length !== 3) {
    throw new Error('无效的加密数据格式')
  }

  const [ivB64, encrypted, authTagB64] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * 判断值是否已加密
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX)
}

/**
 * 检查加密密钥是否已配置（启动时调用，避免运行时崩溃）
 */
export function isEncryptionAvailable(): boolean {
  const keyHex = process.env.SETTINGS_ENCRYPTION_KEY
  return !!keyHex && keyHex.length === 64
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run server/lib/__tests__/crypto.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add server/lib/crypto.ts server/lib/__tests__/crypto.test.ts
git commit -m "feat(security): 添加 AES-256-GCM 加密工具模块"
```

---

### Task A2: SettingsService 集成加密解密

**文件:**
- 修改: `server/services/settings-service.ts`
- 修改: `server/services/__tests__/settings-service.test.ts`

- [ ] **Step 1: 编写集成测试**

在 `server/services/__tests__/settings-service.test.ts` 中，在现有的 describe 块内添加：

```typescript
import { encrypt, decrypt, isEncryptionAvailable } from '../../lib/crypto.js'

// Mock crypto 模块
vi.mock('../../lib/crypto.js', () => ({
  encrypt: vi.fn((v: string) => (v ? `enc:${v}` : '')),
  decrypt: vi.fn((v: string) => (v?.startsWith('enc:') ? v.slice(4) : v)),
  isEncrypted: vi.fn((v: string) => v?.startsWith('enc:')),
  isEncryptionAvailable: vi.fn(() => true),
}))

describe('敏感字段加密', () => {
  it('updateSettings 时应对 ENCRYPTED_FIELDS 进行加密', async () => {
    const mockRepo = {
      upsertSettings: vi.fn().mockResolvedValue(undefined),
      getSettingsByCategory: vi.fn().mockResolvedValue([]),
    } as any

    const service = new SettingsService(mockRepo)
    const updates: AllSettings = {
      ...defaultSettings,
      api: { minimaxKey: 'sk-secret-key', baseUrl: 'https://api.minimax.io', defaultModel: 'abab6.5s' },
      notification: { enabled: true, webhookSecret: 'wh-secret', webhookUrl: 'https://hooks.example.com' },
    }

    await service.updateSettings('user-1', updates, { source: 'test', ip: '127.0.0.1' })

    expect(encrypt).toHaveBeenCalledWith('sk-secret-key')
    expect(encrypt).toHaveBeenCalledWith('wh-secret')
  })

  it('getAllSettings 时应对 ENCRYPTED_FIELDS 进行解密', async () => {
    const mockRepo = {
      getSettingsByCategory: vi.fn().mockResolvedValue([
        {
          category: 'api',
          settings_json: JSON.stringify({ minimaxKey: 'enc:encrypted-key', baseUrl: '', defaultModel: '' }),
        },
        { category: 'notification', settings_json: JSON.stringify({ enabled: false, webhookSecret: 'enc:encrypted-wh', webhookUrl: '' }) },
      ]),
    } as any

    const service = new SettingsService(mockRepo)
    const settings = await service.getAllSettings('user-1')

    expect(decrypt).toHaveBeenCalledWith('enc:encrypted-key')
    expect(decrypt).toHaveBeenCalledWith('enc:encrypted-wh')
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run server/services/__tests__/settings-service.test.ts`
Expected: 新测试 FAIL（加密逻辑未实现）

- [ ] **Step 3: 在 SettingsService 中集成加密解密**

修改 `server/services/settings-service.ts`：

在文件顶部添加导入：

```typescript
import { encrypt, decrypt, isEncryptionAvailable } from '../lib/crypto.js'
```

在 `SettingsService` 类内添加私有方法：

```typescript
const ENCRYPTED_FIELDS = ['minimaxKey', 'webhookSecret']

private encryptSensitiveFields(settings: AllSettings): AllSettings {
  if (!isEncryptionAvailable()) return settings
  const result = { ...settings }
  for (const field of ENCRYPTED_FIELDS) {
    for (const category of Object.values(result)) {
      if (category && typeof category === 'object' && field in category) {
        ;(category as Record<string, unknown>)[field] = encrypt(String((category as Record<string, unknown>)[field] || ''))
      }
    }
  }
  return result
}

private decryptSensitiveFields(settings: AllSettings): AllSettings {
  if (!isEncryptionAvailable()) return settings
  const result = { ...settings }
  for (const field of ENCRYPTED_FIELDS) {
    for (const category of Object.values(result)) {
      if (category && typeof category === 'object' && field in category) {
        const value = String((category as Record<string, unknown>)[field] || '')
        ;(category as Record<string, unknown>)[field] = decrypt(value)
      }
    }
  }
  return result
}
```

在 `updateSettings` 方法中，在对 settings 做其他处理后、存储前添加：

```typescript
// 在存储前加密敏感字段
const encryptedSettings = this.encryptSensitiveFields(processedSettings)
// 然后用 encryptedSettings 替代原有的 settings 传给 repository
```

在 `getAllSettings` 和 `getSettingsByCategory` 方法中，在返回前添加：

```typescript
// 返回前解密敏感字段
return this.decryptSensitiveFields(mergedSettings)
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run server/services/__tests__/settings-service.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add server/services/settings-service.ts server/services/__tests__/settings-service.test.ts
git commit -m "feat(security): SettingsService 集成敏感字段 AES-256-GCM 加密解密"
```

---

### Task A3: 数据迁移 + 启动时自动加密已有明文

**文件:**
- 修改: `server/services/settings-service.ts`
- 创建/修改: `server/database/migrations/` - 不需要新 migration，启动时运行

- [ ] **Step 1: 添加迁移逻辑**

在 `SettingsService` 中添加 `migrateEncryptExistingData` 方法：

```typescript
/**
 * 启动时迁移：将数据库中已有的明文敏感字段加密存储
 * 幂等操作：已加密的字段不会被重复加密
 */
async migrateEncryptExistingData(): Promise<void> {
  if (!isEncryptionAvailable()) return

  const allSettings = await this.repository.getAllRawSettings()
  for (const setting of allSettings) {
    try {
      const parsed = JSON.parse(setting.settingsJson)
      let hasChanges = false

      for (const field of ENCRYPTED_FIELDS) {
        if (parsed[field] && !isEncrypted(parsed[field])) {
          parsed[field] = encrypt(parsed[field])
          hasChanges = true
        }
      }

      if (hasChanges) {
        await this.repository.rawUpdate(
          setting.userId,
          setting.category,
          JSON.stringify(parsed)
        )
      }
    } catch (e) {
      // 跳过解析失败的行，记录日志
      console.warn(`[SettingsService] 迁移加密失败: userId=${setting.userId}, category=${setting.category}`, e)
    }
  }
}

/**
 * 启动时初始化：执行数据迁移
 */
async initialize(): Promise<void> {
  await this.migrateEncryptExistingData()
}
```

如果 SettingsRepository 没有 `getAllRawSettings` 和 `rawUpdate` 方法，需要先添加：

在 `server/repositories/settings-repository.ts` 中添加：

```typescript
async getAllRawSettings(): Promise<Array<{ userId: string; category: string; settingsJson: string }>> {
  const result = await this.pool.query(
    `SELECT user_id, category, settings_json FROM user_settings WHERE is_deleted = false`
  )
  return result.rows.map((r: Record<string, unknown>) => ({
    userId: String(r.user_id),
    category: String(r.category),
    settingsJson: String(r.settings_json),
  }))
}

async rawUpdate(userId: string, category: string, settingsJson: string): Promise<void> {
  await this.pool.query(
    `UPDATE user_settings SET settings_json = $3, updated_at = NOW()
     WHERE user_id = $1 AND category = $2 AND is_deleted = false`,
    [userId, category, settingsJson]
  )
}
```

- [ ] **Step 2: 在应用启动时调用迁移**

在 `server/index.ts` 中，在 `app.listen()` 之前添加：

```typescript
// 启动时执行敏感数据加密迁移
const settingsService = getContainer().getSettingsService()
await settingsService.initialize()
```

- [ ] **Step 3: 运行构建 + 测试**

Run: `npm run build`
Run: `npx vitest run server/services/__tests__/settings-service.test.ts`
Expected: Build 成功 + 测试 PASS

- [ ] **Step 4: 提交**

```bash
git add server/services/settings-service.ts server/repositories/settings-repository.ts server/index.ts
git commit -m "feat(security): 添加启动时明文敏感数据加密迁移"
```

---

### Task A4: Body Limit 分级 + CSP 启用（W2+W3）

**文件:**
- 修改: `server/index.ts`

- [ ] **Step 1: 修改 server/index.ts**

修改 `server/index.ts` 第 74-79 行：

原代码：
```typescript
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
```

改为：
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:*'],
      mediaSrc: ["'self'", 'blob:'],
      fontSrc: ["'self'"],
    },
    reportOnly: true,
  },
  crossOriginEmbedderPolicy: false,
}))
// 默认 1MB body limit，文件上传路由单独设置
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
```

在文件上传路由（media routes）处添加更大的 limit：
```typescript
import express from 'express'

// 在 media 路由挂载前添加
const mediaUploadRouter = express.Router()
mediaUploadRouter.use(express.json({ limit: '50mb' }))
mediaUploadRouter.use(express.urlencoded({ extended: true, limit: '50mb' }))
// ... 继续挂载 media routes
app.use('/api', mediaUploadRouter)
```

- [ ] **Step 2: 运行构建验证**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add server/index.ts
git commit -m "fix(security): 降低 body limit 至 1MB 并启用 CSP report-only 模式"
```

---

### Task A5: cron-scheduler 替换 console 为 pino（W4）

**文件:**
- 修改: `server/services/cron-scheduler.ts`

- [ ] **Step 1: 替换 console.* 为 pino logger**

在 `server/services/cron-scheduler.ts` 中：

1. 在文件顶部添加导入：
```typescript
import logger from '../lib/logger.js'
```
（如果文件已经有其他导入，找到合适位置添加）

2. 在 `CronScheduler` 类中添加 logger 属性：
```typescript
private logger = logger.child({ component: 'CronScheduler' })
```

3. 替换所有 15 处 console.* 调用：

| 原代码 | 替换为 |
|--------|--------|
| `console.error('Failed to schedule job during init:', error)` | `this.logger.error(error, 'Failed to schedule job during init')` |
| `console.warn('Job skipped due to concurrency limit: ...')` | `this.logger.warn('Job skipped due to concurrency limit: %s', jobId)` |
| `console.error('Failed to send on_start notification:', error)` | `this.logger.error(error, 'Failed to send on_start notification')` |
| `console.error('Failed to send on_success notification:', error)` | `this.logger.error(error, 'Failed to send on_success notification')` |
| `console.error('Job failed with error:', error)` | `this.logger.error(error, 'Job execution failed')` |
| `console.error('Failed to update database after job failure:', error)` | `this.logger.error(error, 'Failed to update database after job failure')` |
| `console.error('Failed to send on_failure notification:', error)` | `this.logger.error(error, 'Failed to send on_failure notification')` |
| `console.warn('Job not found in scheduler: ...')` | `this.logger.warn('Job not found in scheduler: %s', jobId)` |
| `console.error('Error unscheduling job:', error)` | `this.logger.error(error, 'Error unscheduling job: %s', jobId)` |
| `console.warn('Job not found in database: ...')` | `this.logger.warn('Job not found in database: %s', jobId)` |
| `console.error('Failed to reschedule job:', error)` | `this.logger.error(error, 'Failed to reschedule job: %s', jobId)` |
| `console.error('Error stopping job:', error)` | `this.logger.error(error, 'Error stopping job: %s', jobId)` |
| `console.warn('Graceful shutdown timed out, jobs still closing: %d')` | `this.logger.warn('Graceful shutdown timed out, jobs still closing: %d', count)` |

- [ ] **Step 2: 运行构建验证**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add server/services/cron-scheduler.ts
git commit -m "fix(logging): cron-scheduler 替换 console.* 为 pino 结构化日志"
```

---

### Task A6: CORS 从环境变量读取 + Media Token 增强（W5+W7）

**文件:**
- 修改: `server/index.ts`
- 修改: `server/lib/media-token.ts`

- [ ] **Step 1: 修改 CORS 配置**

修改 `server/index.ts` 第 66-73 行的 CORS 配置：

```typescript
import { getConfig } from './config/index.js'

// 将硬编码的 CORS 改为从配置读取
app.use(cors({
  origin: getConfig().server.corsOrigins,
  credentials: true,
}))
```

- [ ] **Step 2: 增强 Media Token 安全**

在 `server/lib/media-token.ts` 中，增加 token 过期时间和单次使用支持：

```typescript
// 在现有 verifyMediaToken 函数附近
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 小时

interface MediaTokenPayload {
  mediaId: string
  createdAt: number
  oneTime?: boolean
}

export function verifyMediaToken(token: string): MediaTokenPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload: MediaTokenPayload = JSON.parse(decoded)

    // 检查 token 是否过期
    if (Date.now() - payload.createdAt > TOKEN_MAX_AGE_MS) {
      return null
    }

    // 检查单次使用（如果标记了 oneTime，则需要额外的验证逻辑）
    // 注意：单次使用的状态需要持久化到数据库，此处仅解析 payload
    return payload
  } catch {
    return null
  }
}
```

- [ ] **Step 3: 运行构建验证**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add server/index.ts server/lib/media-token.ts
git commit -m "fix(security): CORS 从环境变量读取 + Media Token 增加过期时间校验"
```

---

## B 批：前端组件拆分（P2 前端部分）

---

### Task B1: 拆分 TestRunPanel.tsx（834行 -> 4个文件）

**文件:**
- 创建: `src/components/ui/ProgressBar.tsx`
- 创建: `src/components/workflow/ExecutionSummary.tsx`
- 创建: `src/components/workflow/NodeResultItem.tsx`
- 修改: `src/components/workflow/TestRunPanel.tsx`

- [ ] **Step 1: 提取 ProgressBar 组件**

从 `src/components/workflow/TestRunPanel.tsx` 第 109-144 行提取 `ProgressBar` 到新文件 `src/components/ui/ProgressBar.tsx`。

读取原文件的 ProgressBar 实现（第 109-144 行左右的闭包组件），复制到新文件并添加导出和必要的 props 类型。

在 `TestRunPanel.tsx` 中替换为：
```typescript
import { ProgressBar } from '../ui/ProgressBar.js'
```

- [ ] **Step 2: 提取 ExecutionSummary 组件**

从 `TestRunPanel.tsx` 第 146-255 行提取 `ExecutionSummary` 到 `src/components/workflow/ExecutionSummary.tsx`。

同样导出并更新 TestRunPanel.tsx 的导入。

- [ ] **Step 3: 提取 NodeResultItem 组件**

从 `TestRunPanel.tsx` 第 257-455 行提取 `NodeResultItem` 到 `src/components/workflow/NodeResultItem.tsx`。

- [ ] **Step 4: 验证 TestRunPanel.tsx 行数 < 300**

Run: `wc -l src/components/workflow/TestRunPanel.tsx`
Expected: 输出 < 300

- [ ] **Step 5: 运行构建 + 测试**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/components/ui/ProgressBar.tsx
git add src/components/workflow/ExecutionSummary.tsx
git add src/components/workflow/NodeResultItem.tsx
git add src/components/workflow/TestRunPanel.tsx
git commit -m "refactor(frontend): 拆分 TestRunPanel 为 4 个独立组件"
```

---

### Task B2: 拆分 ImageGeneration.tsx（1258行 -> 5个文件）

**文件:**
- 创建: `src/pages/image-generation/ImagePromptCard.tsx`
- 创建: `src/pages/image-generation/ImageReferenceUpload.tsx`
- 创建: `src/pages/image-generation/ImageParametersCard.tsx`
- 创建: `src/pages/image-generation/ImageResultsPanel.tsx`
- 修改: `src/pages/ImageGeneration.tsx`

- [ ] **Step 1: 创建 image-generation 目录**

```bash
mkdir -p src/pages/image-generation
```

- [ ] **Step 2: 提取 ImagePromptCard（~110行）**

从 `ImageGeneration.tsx` 中提取第 550-594 行的提示词卡片 JSX。需要传递的 props：
```typescript
interface ImagePromptCardProps {
  title: string
  onTitleChange: (value: string) => void
  prompt: string
  onPromptChange: (value: string) => void
  templates: PromptTemplate[]
  onTemplateSelect: (template: PromptTemplate) => void
  t: (key: string) => string
}
```

- [ ] **Step 3: 提取 ImageReferenceUpload（~180行）**

从第 596-683 行提取参考图片上传 JSX。Props：
```typescript
interface ImageReferenceUploadProps {
  referenceImages: File[]
  referenceUrl: string
  onFileSelect: (files: File[]) => void
  onUrlChange: (url: string) => void
  onRemove: (index: number) => void
  t: (key: string) => string
}
```

- [ ] **Step 4: 提取 ImageParametersCard（~250行）**

从第 685-864 行提取参数配置 JSX。Props：
```typescript
interface ImageParametersCardProps {
  model: string
  onModelChange: (model: string) => void
  aspectRatio: string
  onAspectRatioChange: (ratio: string) => void
  numImages: number
  onNumImagesChange: (num: number) => void
  parallelCount: number
  onParallelCountChange: (num: number) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
  t: (key: string) => string
  // 高级设置子组件可内联或也提取
}
```

- [ ] **Step 5: 提取 ImageResultsPanel（~280行）**

从第 911-1227 行提取结果展示 JSX。Props：
```typescript
interface ImageResultsPanelProps {
  tasks: ImageTask[]
  activeTaskIndex: number
  onTaskSelect: (index: number) => void
  onDownload: (task: ImageTask, index: number) => void
  onPreview: (task: ImageTask, index: number) => void
  t: (key: string) => string
}
```

- [ ] **Step 6: 验证主组件行数**

Run: `wc -l src/pages/ImageGeneration.tsx`
Expected: 输出 < 300

- [ ] **Step 7: 运行构建 + 测试**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add src/pages/image-generation/ src/pages/ImageGeneration.tsx
git commit -m "refactor(frontend): 拆分 ImageGeneration 为 5 个组件（1258→子300行）"
```

---

### Task B3: 拆分 MusicGeneration.tsx（1093行 -> 5个文件）

**文件:**
- 创建: `src/pages/music-generation/LyricsEditorCard.tsx`
- 创建: `src/pages/music-generation/StylePromptCard.tsx`
- 创建: `src/pages/music-generation/MusicSettingsCard.tsx`
- 创建: `src/pages/music-generation/MusicCoverSettings.tsx`
- 修改: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 创建 music-generation 目录 + 提取 LyricsEditorCard**

```bash
mkdir -p src/pages/music-generation
```

提取第 574-631 行的歌词编辑器 JSX。Props 接口：
```typescript
interface LyricsEditorCardProps {
  title: string
  onTitleChange: (title: string) => void
  lyrics: string
  onLyricsChange: (lyrics: string) => void
  structureTags: string[]
  onStructureTagChange: (tags: string[]) => void
  lyricCount: { max: number; entered: number }
  t: (key: string) => string
}
```

- [ ] **Step 2: 提取 StylePromptCard（~150行）**

提取第 634-738 行的风格描述 JSX。

- [ ] **Step 3: 提取 MusicSettingsCard（~150行）**

提取第 742-907 行的参数配置 JSX。

- [ ] **Step 4: 提取 MusicCoverSettings（~200行）**

提取第 907-1048 行的翻唱设置 JSX。

- [ ] **Step 5: 验证 + 构建**

Run: `wc -l src/pages/MusicGeneration.tsx && npm run build`

- [ ] **Step 6: 提交**

```bash
git add src/pages/music-generation/ src/pages/MusicGeneration.tsx
git commit -m "refactor(frontend): 拆分 MusicGeneration 为 5 个组件（1093→子300行）"
```

---

### Task B4: 拆分剩余 11 个超 300 行组件

**文件清单:**
- `src/pages/AuditLogs.tsx` (680行) -> 提取 FilterBar + LogTable 组件
- `src/components/music/MusicTaskCard.tsx` (672行) -> 提取 PlayControls + ActionButtons
- `src/pages/ExternalApiLogs.tsx` (615行) -> 同 AuditLogs 模式
- `src/pages/VideoAgent.tsx` (589行) -> 提取 VideoInputForm + VideoHistoryList
- `src/pages/MediaManagement.tsx` (561行) -> 提取 MediaGrid + MediaUploader
- `src/pages/InvitationCodes/index.tsx` (546行) -> 提取 CodeTable + CreateDialog
- `src/components/layout/Sidebar.tsx` (528行) -> 提取 NavGroup + NavItem + UserSection
- `src/pages/LyricsGeneration.tsx` (526行) -> 类似 MusicGeneration 模式
- `src/pages/TextGeneration.tsx` (519行) -> 提取 PromptInput + TextResults
- `src/pages/WorkflowBuilder.tsx` (494行) -> 提取 CanvasPanel + ConfigPanel + Toolbar
- `src/components/materials/MaterialManagementLayout.tsx` (490行) -> 按布局区拆分

- [ ] **Step 1: 逐个拆分，每个组件参照 B1-B3 的模式**

对每个文件执行：
1. 识别逻辑子区域（表单区、结果区、配置区等）
2. 创建子组件文件并提取 JSX
3. 更新主文件导入
4. 验证主文件 < 300 行

- [ ] **Step 2: 每次拆分后运行构建验证**

Run: `npm run build`（在每次拆分后运行）

- [ ] **Step 3: 每拆完 3-4 个组件提交一次**

```bash
git add [changed files]
git commit -m "refactor(frontend): 拆分 [组件名] 至 300 行以内"
```

---

## C 批：后端文件拆分（P2 后端部分）

---

### Task C1: 拆分 minimax.ts（634行 -> 13个文件）

**文件:**
- 创建: `server/lib/minimax/` 目录下 13 个文件
- 修改: 不修改调用方（通过 index.ts barrel export 保持兼容）

- [ ] **Step 1: 创建目录 + 提取类型定义**

```bash
mkdir -p server/lib/minimax
```

创建 `server/lib/minimax/types.ts`：提取 `MiniMaxErrorResponse`、错误码映射、Region 类型等。

- [ ] **Step 2: 提取 client.ts（基类）**

`server/lib/minimax/client.ts`：提取 `MiniMaxClient` 类定义（constructor、HTTP 请求、错误处理），不含具体 API 方法。

- [ ] **Step 3: 按 API 域提取方法文件**

| 文件 | 内容 | 行数 |
|------|------|------|
| `text.ts` | `chatCompletion`, `chatCompletionStream` | ~80 |
| `voice.ts` | `textToAudioSync`, `textToAudioAsync`, `textToAudioAsyncStatus` | ~80 |
| `image.ts` | `imageGeneration` | ~50 |
| `music.ts` | `musicGeneration`, `lyricsGeneration`, `musicPreprocess` | ~90 |
| `video.ts` | `videoGeneration`, `videoGenerationStatus`, `videoAgentGenerate`, `videoAgentStatus` | ~100 |
| `files.ts` | `fileList`, `fileUpload`, `fileRetrieve`, `fileDelete` | ~80 |
| `voice-mgmt.ts` | `voiceList`, `voiceDelete`, `voiceClone`, `voiceDesign` | ~80 |
| `user.ts` | `getBalance`, `getCodingPlanRemains` | ~60 |

每个域文件导出函数，接收 `client: MiniMaxClient` 作为第一个参数。

- [ ] **Step 4: 创建 mock-client.ts**

`server/lib/minimax/mock-client.ts`：提取 `MockMiniMaxClient` 类。

- [ ] **Step 5: 创建 factory.ts**

`server/lib/minimax/factory.ts`：提取 `getMiniMaxClient()`, `createMiniMaxClientFromHeaders()`, `resetMiniMaxClient()`。

- [ ] **Step 6: 创建 index.ts barrel export**

`server/lib/minimax/index.ts`：统一导出，保持与原 `minimax.ts` 完全兼容的导出接口。

- [ ] **Step 7: 更新 minimax-client-factory.ts 的导入路径**

```typescript
// 从
import { MiniMaxClient, getMiniMaxClient, ... } from './minimax.js'
// 改为
import { MiniMaxClient, getMiniMaxClient, ... } from './minimax/index.js'
```

- [ ] **Step 8: 运行构建 + 测试**

Run: `npm run build && npx vitest run server/lib/__tests__/minimax.test.ts`
Expected: Build 成功 + 测试 PASS

- [ ] **Step 9: 提交**

```bash
git add server/lib/minimax/ server/lib/minimax-client-factory.ts
git commit -m "refactor(backend): 拆分 minimax.ts 为 13 个按 API 域组织的小文件"
```

---

### Task C2: 拆分 service-async.ts（1090行 -> ~10个文件）

**文件:**
- 创建: `server/database/services/` 目录下 ~8 个域 Service 文件
- 修改: 所有 downstream 消费者逐步更新导入

- [ ] **Step 1: 创建 database-service.ts 基类**

`server/database/database-service.ts`：提取连接池管理、14 个 Repository 初始化、`close()`、`getConnection()`、`transaction()` 等基础方法。

- [ ] **Step 2: 按业务域创建 Service 文件**

| 文件 | 方法 |
|------|------|
| `services/job-service.ts` | `createCronJob`, `getCronJobs`, `updateCronJob`, `deleteCronJob`, `toggleCronJobStatus`, `updateCronJobRunStats`, `createJobTag`, `getJobTags`, `createJobDependency`, `deleteJobDependency` |
| `services/task-service.ts` | `createTask`, `getTask`, `getTasksByJob`, `updateTaskStatus`, `getPendingTasks`, `getRunningTasks`, `countRunningTasks`, `createTaskBatch` |
| `services/log-service.ts` | `createExecutionLog`, `getExecutionLogsByTask`, `getRecentExecutionLogs`, `createAuditLog`, `getAuditLogs`, `getAuditLogStats`, `createExternalApiLog`, `getExternalApiLogs` |
| `services/workflow-service.ts` | Workflow Template/Version/Permission 相关方法 |
| `services/media-service.ts` | `createMediaRecord`, `getMediaRecords`, `getMediaById`, `updateMediaRecord`, `softDeleteMedia`, `hardDeleteMedia`, `toggleFavorite` |
| `services/dlq-service.ts` | `addToDeadLetterQueue`, `getDeadLetterQueue`, `retryDeadLetterQueueItem`, `removeFromDeadLetterQueue` |
| `services/material-service.ts` | `createMaterial`, `getMaterials`, `addMaterialItem`, `getMaterialItems` |
| `services/system-service.ts` | `getSystemConfig`, `setSystemConfig`, `trackCapacityUsage`, `getCapacityUsage`, webhook 相关, prompt 相关 |

- [ ] **Step 3: 更新 database/index.ts barrel export**

保持单例导出接口兼容：

```typescript
class DatabaseService {
  // 组合所有 domain services
  public jobService = new JobService(this.pool, this.repositories)
  public taskService = new TaskService(this.pool, this.repositories)
  public logService = new LogService(this.pool, this.repositories)
  // ...
}
```

- [ ] **Step 4: 逐步更新 57 个下游文件的导入路径**

每次更新 5-10 个文件，运行构建验证：

```typescript
// 旧导入
const db = getDatabase()
const job = await db.createCronJob(...)

// 新导入（方法调用变化）
const db = getDatabase()
const job = await db.jobService.createCronJob(...)
```

- [ ] **Step 5: 每次批量更新后运行构建**

Run: `npm run build`

- [ ] **Step 6: 分批提交**

```bash
git add [changed files]
git commit -m "refactor(backend): service-async 拆分为按业务域的独立 Service"
```

---

## D 批：工程改进（P3）

---

### Task D1: CORS origins 从环境变量读取

**文件:**
- 修改: `server/index.ts`

- [ ] **Step 1: 修改 CORS 配置**

确认已在 Task A6 完成（A6 中已包含此改动）。如果未完成：

```typescript
import { getConfig } from './config/index.js'

app.use(cors({
  origin: getConfig().server.corsOrigins,
  credentials: true,
}))
```

- [ ] **Step 2: 运行构建验证**

Run: `npm run build`

- [ ] **Step 3: 提交**（如果未被 A6 覆盖）

```bash
git add server/index.ts
git commit -m "fix(config): CORS origins 改为从环境变量读取"
```

---

### Task D2: 添加 API 版本前缀 `/api/v1`

**文件:**
- 修改: `server/index.ts`

- [ ] **Step 1: 添加版本化路由**

在 `server/index.ts` 中，将现有的 `app.use('/api', apiRouter)` 改为：

```typescript
// 版本化路由
app.use('/api/v1', apiRouter)

// 向后兼容（保留旧路径，标记弃用）
app.use('/api', (req, res, next) => {
  // 设置响应头提示弃用
  res.setHeader('Deprecation', 'true')
  res.setHeader('Sunset', 'Tue, 01 Jun 2027 00:00:00 GMT')
  next()
}, apiRouter)
```

- [ ] **Step 2: 运行构建验证**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add server/index.ts
git commit -m "feat(api): 添加 /api/v1 版本化路由前缀，保留 /api 向后兼容"
```

---

### Task D3: Repository 层提取动态 UPDATE 工具

**文件:**
- 创建: `server/repositories/base-repository.ts`
- 修改: 多选一个 Repository 文件作为迁移示例

- [ ] **Step 1: 创建 BaseRepository**

在 `server/repositories/base-repository.ts` 中：

```typescript
import { Pool } from 'pg'

export abstract class BaseRepository {
  constructor(protected pool: Pool) {}

  /**
   * 安全的动态 UPDATE 构建器
   * @param table - 表名（来自代码常量，非用户输入）
   * @param id - 记录 ID
   * @param fields - 要更新的字段键值对
   * @param allowedFields - 白名单，只允许更新这些字段
   */
  protected async dynamicUpdate(
    table: string,
    id: string,
    fields: Record<string, unknown>,
    allowedFields: string[]
  ): Promise<void> {
    const filteredFields = Object.entries(fields)
      .filter(([key]) => allowedFields.includes(key))

    if (filteredFields.length === 0) return

    const setClauses = filteredFields.map(
      (_, index) => `"${filteredFields[index][0]}" = $${index + 2}`
    )
    const values = filteredFields.map(([, value]) => value)

    await this.pool.query(
      `UPDATE "${table}" SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 AND is_deleted = false`,
      [id, ...values]
    )
  }
}
```

- [ ] **Step 2: 在一个 Repository 中验证此模式**

选择 `server/repositories/cron-job-repository.ts` 作为迁移示例，将其 UPDATE 方法改为继承 BaseRepository 并使用 `dynamicUpdate()`。

- [ ] **Step 3: 运行构建 + 测试**

Run: `npm run build && npx vitest run server/repositories/`
Expected: Build 成功 + 测试 PASS

- [ ] **Step 4: 提交**

```bash
git add server/repositories/base-repository.ts server/repositories/cron-job-repository.ts
git commit -m "refactor(backend): 提取 BaseRepository.dynamicUpdate 统一动态 UPDATE 构建"
```

---

## 验证清单

全部完成后运行：

```bash
# 1. TypeScript 类型检查 + 构建
npm run build

# 2. 测试覆盖率
npm run test:coverage

# 3. 检查是否还有 console.error/warn 在生产代码中
# （排除 node_modules, .test.ts, 迁移后的 cron-scheduler.ts 应该 0 结果）
rg "console\.(error|warn)" server/services/

# 4. 检查前端组件是否全部 ≤ 300 行
find src -name "*.tsx" -exec wc -l {} \; | awk '$1 > 300 {print}'

# 5. 检查是否有 any 类型在非测试代码中
rg "\bany\b" server/ src/ --include "*.ts" --include "*.tsx" -l | grep -v "\.test\." | grep -v "__tests__"
```

---

*Implementation Plan by Sisyphus — 2026-05-05*
