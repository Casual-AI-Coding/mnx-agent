# R-024 OpenAI Image-2 外部调试实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「外部调试 / OpenAI Image-2」页面，实现浏览器直连 OpenAI 兼容图片生成接口、后端外部调用日志创建/更新、base64 图片预览，以及成功后自动上传并保存媒体记录。

**Architecture:** 前端页面负责配置 Base URL、Bearer Token、图片参数并直接请求 `${baseUrl}/v1/images/generations`，后端只接收脱敏请求摘要和响应摘要。后端扩展现有 `external_api_logs` 写接口与更新接口，复用已有媒体上传链路保存前端从 base64 转出的图片文件。导航与路由独立新增，不继续扩大 MiniMax `ImageGeneration.tsx`。

**Tech Stack:** React 18、TypeScript、Vite、Vitest、Testing Library、Express、Zod、PostgreSQL、multer、Tailwind CSS、React Router、Sonner。

---

## 文件结构与职责

- `docs/plans/2026-04-25-r-024-openai-image-2-external-debug.md` - 本实现计划。
- `docs/specs/2026-04-25-r-024-openai-image-2-external-debug-design.md` - 已确认设计规格。
- `packages/shared-types/entities/external-api-log.ts` - 扩展外部调用日志状态与创建/更新类型。
- `server/validation/external-api-logs-schemas.ts` - 新增创建/更新日志 Zod schema，并拒绝 base64 与敏感字段进入日志。
- `server/repositories/external-api-log.repository.ts` - 新增按 ID 更新日志结果方法，统计支持 `pending`。
- `server/repositories/__tests__/external-api-log.repository.test.ts` - 覆盖 pending 创建、成功更新、失败更新与统计。
- `server/routes/external-api-logs.ts` - 新增 `POST /api/external-api-logs` 与 `PATCH /api/external-api-logs/:id`。
- `server/routes/__tests__/external-api-logs.test.ts` - 覆盖鉴权、owner 隔离、脱敏边界与 base64 拒绝。
- `server/routes/media.ts` - 让 `/api/media/upload` 接收 multipart metadata JSON 并写入媒体记录。
- `src/lib/api/external-api-logs.ts` - 新增前端创建/更新日志 API client。
- `src/lib/api/media.ts` - 让 `uploadMedia()` 支持 metadata。
- `src/lib/openai-image-2.ts` - 新增纯函数：请求体摘要、响应摘要、base64 转 Blob、Object URL 结果构建、固定路径拼接。
- `src/lib/__tests__/openai-image-2.test.ts` - 覆盖纯函数与敏感字段过滤。
- `src/hooks/useFormPersistence.ts` - 新增 `DEBUG_FORM_KEYS.OPENAI_IMAGE_2`。
- `src/pages/OpenAIImage2.tsx` - 新增外部 OpenAI Image-2 调试页面。
- `src/pages/__tests__/OpenAIImage2.test.tsx` - 覆盖页面主流程、清除密钥、自动上传、失败路径。
- `src/App.tsx` - 新增页面懒加载与 `/external-debug/openai-image-2` 路由。
- `src/components/layout/Sidebar.tsx` - 新增一级菜单「外部调试」与二级菜单「OpenAI Image-2」。

---

### Task 1: 扩展外部调用日志类型与校验

**Files:**
- Modify: `packages/shared-types/entities/external-api-log.ts`
- Modify: `server/validation/external-api-logs-schemas.ts`
- Test: `server/validation/__tests__/external-api-logs-schemas.test.ts`

- [ ] **Step 1: 先新增 schema 失败测试**

Create `server/validation/__tests__/external-api-logs-schemas.test.ts` if it does not exist, then add these cases:

```ts
import { describe, expect, it } from 'vitest'
import {
  createExternalApiLogSchema,
  updateExternalApiLogSchema,
  externalApiStatusEnum,
} from '../external-api-logs-schemas'

describe('external api log schemas', () => {
  it('accepts pending status for browser-created logs', () => {
    expect(externalApiStatusEnum.parse('pending')).toBe('pending')
  })

  it('creates an openai image_generation log without secret fields', () => {
    const parsed = createExternalApiLogSchema.parse({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      request_params: {
        model: 'gpt-image-2',
        size: '1376x2048',
        quality: 'high',
        background: 'auto',
        output_format: 'png',
        moderation: 'auto',
        image_count: 1,
      },
      request_body: JSON.stringify({ prompt: '一张电影感人像海报，暖色光照，细节丰富' }),
      trace_id: 'trace-openai-image-2',
    })

    expect(parsed.status).toBe('pending')
    expect(parsed.service_provider).toBe('openai')
  })

  it('rejects secrets and base64 payloads in log creation', () => {
    expect(() => createExternalApiLogSchema.parse({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      request_params: { authorization: 'Bearer sk-secret' },
    })).toThrow()

    expect(() => createExternalApiLogSchema.parse({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      response_body: 'iVBORw0KGgoAAAANSUhEUgAA'.repeat(20),
    })).toThrow()
  })

  it('updates a log with response summary only', () => {
    const parsed = updateExternalApiLogSchema.parse({
      status: 'success',
      duration_ms: 1432,
      response_body: JSON.stringify({
        created: 1770000000,
        model: 'gpt-image-2',
        image_count: 1,
        usage: { total_tokens: 120 },
      }),
    })

    expect(parsed.status).toBe('success')
    expect(parsed.duration_ms).toBe(1432)
  })
})
```

- [ ] **Step 2: 运行 schema 测试并确认失败**

Run: `npm run test:server -- server/validation/__tests__/external-api-logs-schemas.test.ts`

Expected: FAIL，原因是 `pending`、`createExternalApiLogSchema` 或 `updateExternalApiLogSchema` 尚未实现。

- [ ] **Step 3: 扩展共享类型**

In `packages/shared-types/entities/external-api-log.ts`, change status and add update data type:

```ts
export type ExternalApiStatus = 'pending' | 'success' | 'failed'

export interface UpdateExternalApiLog {
  response_body?: string
  status?: ExternalApiStatus
  error_message?: string
  duration_ms?: number
}
```

Ensure `ExternalApiStats.by_status` can hold all statuses:

```ts
by_status: Record<ExternalApiStatus, number>
```

- [ ] **Step 4: 实现创建/更新 schema 与敏感内容拦截**

In `server/validation/external-api-logs-schemas.ts`, update status and add helpers:

```ts
export const externalApiStatusEnum = z.enum(['pending', 'success', 'failed'])

const forbiddenLogKeyPattern = /authorization|api[_-]?key|token|secret|cookie|password/i
const base64ImagePattern = /(?:data:image\/[a-zA-Z0-9.+-]+;base64,)?[A-Za-z0-9+/]{120,}={0,2}/

const rejectSensitiveLogContent = (value: unknown): boolean => {
  const visit = (input: unknown): boolean => {
    if (typeof input === 'string') {
      return !base64ImagePattern.test(input) && !/^Bearer\s+/i.test(input)
    }
    if (Array.isArray(input)) return input.every(visit)
    if (input && typeof input === 'object') {
      return Object.entries(input).every(([key, nested]) => !forbiddenLogKeyPattern.test(key) && visit(nested))
    }
    return true
  }
  return visit(value)
}

const safeJsonTextSchema = z.string().max(4096).refine((value) => {
  if (base64ImagePattern.test(value) || /Bearer\s+/i.test(value)) return false
  try {
    return rejectSensitiveLogContent(JSON.parse(value))
  } catch {
    return true
  }
}, '日志内容不能包含密钥、Bearer Token 或 base64 图片数据')
```

Add exported body schemas:

```ts
export const createExternalApiLogSchema = z.object({
  service_provider: serviceProviderEnum,
  api_endpoint: z.string().min(1).max(100),
  operation: z.string().min(1).max(50),
  request_params: z.record(z.string(), z.unknown()).optional().refine(
    (value) => value === undefined || rejectSensitiveLogContent(value),
    '请求参数不能包含密钥、Bearer Token 或 base64 图片数据'
  ),
  request_body: safeJsonTextSchema.optional(),
  response_body: safeJsonTextSchema.optional(),
  status: externalApiStatusEnum.default('pending'),
  error_message: z.string().max(2000).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  trace_id: z.string().max(32).optional(),
})

export const updateExternalApiLogSchema = z.object({
  response_body: safeJsonTextSchema.optional(),
  status: externalApiStatusEnum.optional(),
  error_message: z.string().max(2000).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
}).refine(
  (value) => value.status !== undefined || value.response_body !== undefined || value.error_message !== undefined || value.duration_ms !== undefined,
  '至少提供一个更新字段'
)
```

- [ ] **Step 5: 运行 schema 测试确认通过**

Run: `npm run test:server -- server/validation/__tests__/external-api-logs-schemas.test.ts`

Expected: PASS。

---

### Task 2: 扩展外部调用日志仓储更新能力

**Files:**
- Modify: `server/repositories/external-api-log.repository.ts`
- Modify: `server/repositories/__tests__/external-api-log.repository.test.ts`

- [ ] **Step 1: 写仓储失败测试**

Add tests in `server/repositories/__tests__/external-api-log.repository.test.ts`:

```ts
it('creates browser initiated pending logs', async () => {
  const created = await repository.create({
    service_provider: 'openai',
    api_endpoint: 'POST /v1/images/generations',
    operation: 'image_generation',
    request_params: { model: 'gpt-image-2', image_count: 1 },
    request_body: JSON.stringify({ prompt: '一张电影感人像海报，暖色光照，细节丰富' }),
    status: 'pending',
    user_id: 'user-openai-1',
    trace_id: 'trace-openai-image-2',
  })

  const found = await repository.getById(String(created.id))

  expect(found?.status).toBe('pending')
  expect(found?.service_provider).toBe('openai')
  expect(found?.user_id).toBe('user-openai-1')
})

it('updates a pending log to success summary', async () => {
  const created = await repository.create({
    service_provider: 'openai',
    api_endpoint: 'POST /v1/images/generations',
    operation: 'image_generation',
    status: 'pending',
    user_id: 'user-openai-1',
  })

  const updated = await repository.updateResult(String(created.id), {
    status: 'success',
    duration_ms: 1200,
    response_body: JSON.stringify({ image_count: 1, usage: { total_tokens: 120 } }),
  })

  expect(updated?.status).toBe('success')
  expect(updated?.duration_ms).toBe(1200)
  expect(updated?.response_body).toContain('image_count')
})

it('counts pending logs in stats', async () => {
  await repository.create({
    service_provider: 'openai',
    api_endpoint: 'POST /v1/images/generations',
    operation: 'image_generation',
    status: 'pending',
    user_id: 'user-openai-1',
  })

  const stats = await repository.getStats({ user_id: 'user-openai-1' })

  expect(stats.by_status.pending).toBeGreaterThanOrEqual(1)
})
```

- [ ] **Step 2: 运行仓储测试确认失败**

Run: `npm run test:server -- server/repositories/__tests__/external-api-log.repository.test.ts`

Expected: FAIL，原因是 `updateResult` 不存在或 `pending` 统计不存在。

- [ ] **Step 3: 实现仓储更新方法**

In `server/repositories/external-api-log.repository.ts`, import the new type and add:

```ts
import type { UpdateExternalApiLog } from '../../packages/shared-types/entities/external-api-log.js'

async updateResult(id: string, data: UpdateExternalApiLog): Promise<ExternalApiLog | null> {
  const fields: string[] = []
  const values: unknown[] = []

  const addField = (column: string, value: unknown) => {
    values.push(value)
    fields.push(`${column} = $${values.length}`)
  }

  if (data.response_body !== undefined) addField('response_body', data.response_body)
  if (data.status !== undefined) addField('status', data.status)
  if (data.error_message !== undefined) addField('error_message', data.error_message)
  if (data.duration_ms !== undefined) addField('duration_ms', data.duration_ms)

  if (fields.length === 0) return this.getById(id)

  values.push(id)
  const result = await this.db.query(
    `UPDATE external_api_logs SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  )

  if (result.rows.length === 0) return null
  return rowToExternalApiLog(result.rows[0])
}
```

- [ ] **Step 4: 让统计默认包含 pending**

Update stats initialization in `getStats()`:

```ts
const stats: ExternalApiStats = {
  total_calls: 0,
  success_rate: 0,
  avg_duration_ms: 0,
  by_provider: {},
  by_operation: {},
  by_status: { pending: 0, success: 0, failed: 0 },
  recent_errors: [],
}
```

Ensure status row assignment keeps unknown database strings out of the typed object by checking known values before assignment.

- [ ] **Step 5: 运行仓储测试确认通过**

Run: `npm run test:server -- server/repositories/__tests__/external-api-log.repository.test.ts`

Expected: PASS。

---

### Task 3: 新增外部调用日志写入路由

**Files:**
- Modify: `server/routes/external-api-logs.ts`
- Test: `server/routes/__tests__/external-api-logs.test.ts`

- [ ] **Step 1: 新增路由失败测试**

Create or extend `server/routes/__tests__/external-api-logs.test.ts` with supertest cases covering:

```ts
it('creates an openai external api log for the authenticated user', async () => {
  const response = await request(app)
    .post('/api/external-api-logs')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      request_params: { model: 'gpt-image-2', image_count: 1 },
      request_body: JSON.stringify({ prompt: '一张电影感人像海报，暖色光照，细节丰富' }),
    })
    .expect(201)

  expect(response.body.success).toBe(true)
  expect(response.body.data.status).toBe('pending')
  expect(response.body.data.user_id).toBe(testUserId)
})

it('updates only the owner log', async () => {
  const created = await createLogForUser('owner-user')

  await request(app)
    .patch(`/api/external-api-logs/${created.id}`)
    .set('Authorization', `Bearer ${otherUserToken}`)
    .send({ status: 'success', duration_ms: 100 })
    .expect(404)

  await request(app)
    .patch(`/api/external-api-logs/${created.id}`)
    .set('Authorization', `Bearer ${ownerUserToken}`)
    .send({
      status: 'success',
      duration_ms: 100,
      response_body: JSON.stringify({ image_count: 1, usage: { total_tokens: 120 } }),
    })
    .expect(200)
})

it('rejects base64 image payloads in log writes', async () => {
  await request(app)
    .post('/api/external-api-logs')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      response_body: 'iVBORw0KGgoAAAANSUhEUgAA'.repeat(20),
    })
    .expect(400)
})
```

Use existing route-test auth helpers if present in the repository. If no helper exists, create local token fixtures using the same JWT secret pattern used by current server tests.

- [ ] **Step 2: 运行路由测试确认失败**

Run: `npm run test:server -- server/routes/__tests__/external-api-logs.test.ts`

Expected: FAIL，原因是 POST/PATCH 尚未实现。

- [ ] **Step 3: 实现 POST 创建接口**

In `server/routes/external-api-logs.ts`, import `validate`, schemas, `createdResponse`, and repository. Add before `GET /:id`:

```ts
router.post('/', validate(createExternalApiLogSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const repository = new ExternalApiLogRepository(db.getConnection())
  const userId = req.user?.userId

  if (!userId) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const body = createExternalApiLogSchema.parse(req.body)
  const record = await repository.create({
    service_provider: body.service_provider,
    api_endpoint: body.api_endpoint,
    operation: body.operation,
    request_params: body.request_params,
    request_body: body.request_body,
    response_body: body.response_body,
    status: body.status,
    error_message: body.error_message,
    duration_ms: body.duration_ms,
    trace_id: body.trace_id,
    user_id: userId,
  })

  createdResponse(res, record)
}))
```

- [ ] **Step 4: 实现 PATCH 更新接口并保持 owner 隔离**

Add route:

```ts
router.patch('/:id', validate(updateExternalApiLogSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const repository = new ExternalApiLogRepository(db.getConnection())
  const current = await repository.getById(req.params.id)

  if (!current) {
    errorResponse(res, 'External API log not found', 404)
    return
  }

  const role = req.user?.role
  const userId = req.user?.userId
  const canUpdate = role === 'super' || role === 'admin' || current.user_id === userId
  if (!canUpdate) {
    errorResponse(res, 'External API log not found', 404)
    return
  }

  const updated = await repository.updateResult(req.params.id, req.body)
  if (!withEntityNotFound(updated, res, 'External API log')) return

  successResponse(res, updated)
}))
```

- [ ] **Step 5: 运行路由测试确认通过**

Run: `npm run test:server -- server/routes/__tests__/external-api-logs.test.ts`

Expected: PASS。

---

### Task 4: 让媒体上传支持 metadata

**Files:**
- Modify: `server/routes/media.ts`
- Modify: `src/lib/api/media.ts`
- Test: `server/routes/__tests__/media-upload.test.ts`

- [ ] **Step 1: 写媒体上传 metadata 失败测试**

Add a server route test that posts multipart form data:

```ts
it('stores metadata from multipart media upload', async () => {
  const metadata = {
    source: 'openai-image-2',
    service_provider: 'openai',
    operation: 'image_generation',
    external_api_log_id: 42,
  }

  const response = await request(app)
    .post('/api/media/upload')
    .set('Authorization', `Bearer ${userToken}`)
    .field('type', 'image')
    .field('source', 'image_generation')
    .field('metadata', JSON.stringify(metadata))
    .attach('file', Buffer.from([137, 80, 78, 71]), 'openai-image-2.png')
    .expect(201)

  expect(response.body.success).toBe(true)
  expect(response.body.data.metadata).toMatchObject(metadata)
})
```

- [ ] **Step 2: 运行媒体测试确认失败**

Run: `npm run test:server -- server/routes/__tests__/media-upload.test.ts`

Expected: FAIL，原因是 `/media/upload` 未写入 metadata。

- [ ] **Step 3: 后端解析 multipart metadata**

In `server/routes/media.ts`, update `/upload`:

```ts
let metadata: Record<string, unknown> | undefined
if (typeof req.body.metadata === 'string' && req.body.metadata.trim().length > 0) {
  try {
    const parsed = JSON.parse(req.body.metadata)
    if (isPlainRecord(parsed)) {
      metadata = parsed
    } else {
      errorResponse(res, 'metadata must be a JSON object', 400)
      return
    }
  } catch {
    errorResponse(res, 'metadata must be valid JSON', 400)
    return
  }
}

const record = await db.create({
  filename,
  original_name: req.file.originalname,
  filepath,
  type,
  mime_type: req.file.mimetype,
  size_bytes,
  source,
  metadata,
}, ownerId)
```

Add a local helper near the route definitions:

```ts
const mediaTypeSchema = z.enum(['audio', 'image', 'video', 'music', 'lyrics'])
const mediaSourceSchema = z.enum(['voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation', 'lyrics_generation'])

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
```

Before saving the file, parse `type` and `source`:

```ts
const typeResult = mediaTypeSchema.safeParse(req.body.type)
if (!typeResult.success) {
  errorResponse(res, 'type must be a supported media type', 400)
  return
}

const sourceResult = mediaSourceSchema.safeParse(req.body.source)
if (!sourceResult.success) {
  errorResponse(res, 'source must be a supported media source', 400)
  return
}

const type = typeResult.data
const source = sourceResult.data
```

- [ ] **Step 4: 前端 uploadMedia 支持 metadata**

In `src/lib/api/media.ts`, change signature and form data append:

```ts
export async function uploadMedia(
  blob: Blob,
  filename: string,
  type: MediaType,
  source?: MediaSource,
  metadata?: Record<string, unknown>
): Promise<ApiResponse<MediaRecord>> {
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('type', type)
  if (source) formData.append('source', source)
  if (metadata) formData.append('metadata', JSON.stringify(metadata))

  const response = await internalAxios.post<ApiResponse<MediaRecord>>('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
```

- [ ] **Step 5: 运行媒体测试确认通过**

Run: `npm run test:server -- server/routes/__tests__/media-upload.test.ts`

Expected: PASS。

---

### Task 5: 新增前端 OpenAI Image-2 工具函数与 API client

**Files:**
- Create: `src/lib/openai-image-2.ts`
- Create: `src/lib/__tests__/openai-image-2.test.ts`
- Modify: `src/lib/api/external-api-logs.ts`

- [ ] **Step 1: 写工具函数失败测试**

Create `src/lib/__tests__/openai-image-2.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  base64ToBlob,
  buildOpenAIImage2Url,
  createOpenAIImage2RequestSummary,
  createOpenAIImage2ResponseSummary,
  parseOpenAIImage2Response,
} from '../openai-image-2'

describe('openai image-2 helpers', () => {
  it('builds fixed image generation path from configurable base url', () => {
    expect(buildOpenAIImage2Url('https://mikuapi.org/')).toBe('https://mikuapi.org/v1/images/generations')
  })

  it('converts base64 png into a blob', async () => {
    const blob = base64ToBlob('iVBORw0KGgo=', 'image/png')

    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('creates request summary without token or base64', () => {
    const summary = createOpenAIImage2RequestSummary({
      model: 'gpt-image-2',
      prompt: '一张电影感人像海报，暖色光照，细节丰富',
      n: 1,
      size: '1376x2048',
      quality: 'high',
      background: 'auto',
      output_format: 'png',
      moderation: 'auto',
    })

    expect(JSON.stringify(summary)).not.toContain('Bearer')
    expect(summary.image_count).toBe(1)
  })

  it('creates response summary without image base64', () => {
    const summary = createOpenAIImage2ResponseSummary({
      created: 1770000000,
      model: 'gpt-image-2',
      size: '1376x2048',
      quality: 'high',
      data: [{ b64_json: 'iVBORw0KGgo='.repeat(30) }],
      usage: { total_tokens: 120 },
    })

    const serialized = JSON.stringify(summary)
    expect(summary.image_count).toBe(1)
    expect(serialized).not.toContain('iVBORw0KGgo=')
  })

  it('parses unknown json into a typed response without type assertions', () => {
    const parsed = parseOpenAIImage2Response({
      created: 1770000000,
      model: 'gpt-image-2',
      data: [{ b64_json: 'iVBORw0KGgo=' }],
    })

    expect(parsed.model).toBe('gpt-image-2')
    expect(parsed.data?.[0]?.b64_json).toBe('iVBORw0KGgo=')
  })
})
```

- [ ] **Step 2: 运行前端工具测试确认失败**

Run: `npm run test -- src/lib/__tests__/openai-image-2.test.ts`

Expected: FAIL，原因是工具文件尚未存在。

- [ ] **Step 3: 实现工具函数**

Create `src/lib/openai-image-2.ts`:

```ts
export interface OpenAIImage2RequestBody {
  model: string
  prompt: string
  n: number
  size: string
  quality: string
  background: string
  output_format: string
  moderation: string
}

export interface OpenAIImage2ResponseDataItem {
  b64_json?: string
  base64?: string
}

export interface OpenAIImage2ResponseBody {
  created?: number
  data?: OpenAIImage2ResponseDataItem[]
  background?: string
  output_format?: string
  quality?: string
  size?: string
  model?: string
  usage?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const readNumber = (record: Record<string, unknown>, key: string): number | undefined => {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

export function parseOpenAIImage2Response(value: unknown): OpenAIImage2ResponseBody {
  if (!isRecord(value)) return {}
  const rawData = Array.isArray(value.data) ? value.data : []
  const data = rawData
    .filter(isRecord)
    .map((item) => ({
      b64_json: readString(item, 'b64_json'),
      base64: readString(item, 'base64'),
    }))

  return {
    created: readNumber(value, 'created'),
    data,
    background: readString(value, 'background'),
    output_format: readString(value, 'output_format'),
    quality: readString(value, 'quality'),
    size: readString(value, 'size'),
    model: readString(value, 'model'),
    usage: isRecord(value.usage) ? value.usage : undefined,
  }
}

export function buildOpenAIImage2Url(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/v1/images/generations`
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',').at(-1) ?? '' : base64
  const binary = window.atob(cleanBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

export function extractImageBase64List(response: OpenAIImage2ResponseBody): string[] {
  return (response.data ?? [])
    .map((item) => item.b64_json ?? item.base64)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export function createOpenAIImage2RequestSummary(body: OpenAIImage2RequestBody): Record<string, unknown> {
  return {
    model: body.model,
    prompt_length: body.prompt.length,
    image_count: body.n,
    size: body.size,
    quality: body.quality,
    background: body.background,
    output_format: body.output_format,
    moderation: body.moderation,
  }
}

export function createOpenAIImage2ResponseSummary(response: OpenAIImage2ResponseBody): Record<string, unknown> {
  return {
    created: response.created,
    model: response.model,
    size: response.size,
    quality: response.quality,
    background: response.background,
    output_format: response.output_format,
    image_count: extractImageBase64List(response).length,
    usage: response.usage,
  }
}
```

- [ ] **Step 4: 扩展前端 external-api-logs client**

In `src/lib/api/external-api-logs.ts`, extend status and add functions:

```ts
export type ExternalApiStatus = 'pending' | 'success' | 'failed'

export interface CreateExternalApiLogInput {
  service_provider: ServiceProvider
  api_endpoint: string
  operation: string
  request_params?: Record<string, unknown>
  request_body?: string
  response_body?: string
  status?: ExternalApiStatus
  error_message?: string
  duration_ms?: number
  trace_id?: string
}

export interface UpdateExternalApiLogInput {
  response_body?: string
  status?: ExternalApiStatus
  error_message?: string
  duration_ms?: number
}

export async function createExternalApiLog(input: CreateExternalApiLogInput): Promise<ApiResponse<ExternalApiLog>> {
  const response = await internalAxios.post<ApiResponse<ExternalApiLog>>('/external-api-logs', input)
  return response.data
}

export async function updateExternalApiLog(id: number, input: UpdateExternalApiLogInput): Promise<ApiResponse<ExternalApiLog>> {
  const response = await internalAxios.patch<ApiResponse<ExternalApiLog>>(`/external-api-logs/${id}`, input)
  return response.data
}
```

- [ ] **Step 5: 运行工具测试确认通过**

Run: `npm run test -- src/lib/__tests__/openai-image-2.test.ts`

Expected: PASS。

---

### Task 6: 新增 OpenAI Image-2 页面主流程

**Files:**
- Create: `src/pages/OpenAIImage2.tsx`
- Create: `src/pages/__tests__/OpenAIImage2.test.tsx`
- Modify: `src/hooks/useFormPersistence.ts`

- [ ] **Step 1: 增加缓存键**

In `src/hooks/useFormPersistence.ts`, add:

```ts
OPENAI_IMAGE_2: 'openai-image-2',
```

- [ ] **Step 2: 写页面失败测试**

Create `src/pages/__tests__/OpenAIImage2.test.tsx` with mocked API clients and fetch:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OpenAIImage2 from '../OpenAIImage2'

vi.mock('@/lib/api/external-api-logs', () => ({
  createExternalApiLog: vi.fn(),
  updateExternalApiLog: vi.fn(),
}))

vi.mock('@/lib/api/media', () => ({
  uploadMedia: vi.fn(),
}))

describe('OpenAIImage2', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('creates log, calls external api, updates log, and auto uploads media', async () => {
    const { createExternalApiLog, updateExternalApiLog } = await import('@/lib/api/external-api-logs')
    const { uploadMedia } = await import('@/lib/api/media')

    vi.mocked(createExternalApiLog).mockResolvedValue({ success: true, data: { id: 42, status: 'pending' } })
    vi.mocked(updateExternalApiLog).mockResolvedValue({ success: true, data: { id: 42, status: 'success' } })
    vi.mocked(uploadMedia).mockResolvedValue({ success: true, data: { id: 'media-1', filename: 'openai-image-2.png' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        created: 1770000000,
        model: 'gpt-image-2',
        data: [{ b64_json: 'iVBORw0KGgo=' }],
        usage: { total_tokens: 120 },
      }),
    }))

    const user = userEvent.setup()
    render(<OpenAIImage2 />)

    await user.clear(screen.getByLabelText('Bearer Token'))
    await user.type(screen.getByLabelText('Bearer Token'), 'sk-test-token')
    await user.clear(screen.getByLabelText('提示词'))
    await user.type(screen.getByLabelText('提示词'), '一张电影感人像海报，暖色光照，细节丰富')
    await user.click(screen.getByRole('button', { name: '生成图片' }))

    await waitFor(() => expect(createExternalApiLog).toHaveBeenCalled())
    expect(fetch).toHaveBeenCalledWith('https://mikuapi.org/v1/images/generations', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-test-token' }),
    }))
    await waitFor(() => expect(updateExternalApiLog).toHaveBeenCalledWith(42, expect.objectContaining({ status: 'success' })))
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled())
    expect(JSON.stringify(vi.mocked(updateExternalApiLog).mock.calls)).not.toContain('iVBORw0KGgo=')
  })

  it('clears bearer token from local storage and form state', async () => {
    const user = userEvent.setup()
    render(<OpenAIImage2 />)

    await user.type(screen.getByLabelText('Bearer Token'), 'sk-test-token')
    await user.click(screen.getByRole('button', { name: '清除密钥' }))

    expect(screen.getByLabelText('Bearer Token')).toHaveValue('')
    expect(window.localStorage.getItem('form-persistence:openai-image-2')).not.toContain('sk-test-token')
  })
})
```

- [ ] **Step 3: 运行页面测试确认失败**

Run: `npm run test -- src/pages/__tests__/OpenAIImage2.test.tsx`

Expected: FAIL，原因是页面尚未存在。

- [ ] **Step 4: 实现页面状态与表单**

Create `src/pages/OpenAIImage2.tsx` with these local types and defaults:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks/useFormPersistence'
import { createExternalApiLog, updateExternalApiLog } from '@/lib/api/external-api-logs'
import { uploadMedia } from '@/lib/api/media'
import {
  base64ToBlob,
  buildOpenAIImage2Url,
  createOpenAIImage2RequestSummary,
  createOpenAIImage2ResponseSummary,
  extractImageBase64List,
  type OpenAIImage2RequestBody,
  type OpenAIImage2ResponseBody,
} from '@/lib/openai-image-2'

interface OpenAIImage2FormData {
  baseUrl: string
  bearerToken: string
  prompt: string
  model: string
  n: number
  size: string
  quality: string
  background: string
  outputFormat: string
  moderation: string
  imageTitle: string
}

type OpenAIImage2Status = 'idle' | 'creating-log' | 'generating' | 'updating-log' | 'saving-media' | 'success' | 'failed'

interface OpenAIImage2Result {
  objectUrl: string
  blob: Blob
  mediaId?: string
  logId?: number
}

const defaultForm: OpenAIImage2FormData = {
  baseUrl: 'https://mikuapi.org',
  bearerToken: '',
  prompt: '一张电影感人像海报，暖色光照，细节丰富',
  model: 'gpt-image-2',
  n: 1,
  size: '1376x2048',
  quality: 'high',
  background: 'auto',
  outputFormat: 'png',
  moderation: 'auto',
  imageTitle: 'openai-image-2',
}
```

- [ ] **Step 5: 实现生成、日志更新、自动保存媒体**

Inside the component, implement `handleGenerate()` with this exact sequence:

```tsx
const requestBody: OpenAIImage2RequestBody = {
  model: form.model,
  prompt: form.prompt,
  n: form.n,
  size: form.size,
  quality: form.quality,
  background: form.background,
  output_format: form.outputFormat,
  moderation: form.moderation,
}

setStatus('creating-log')
const startedAt = performance.now()
const createLogResponse = await createExternalApiLog({
  service_provider: 'openai',
  api_endpoint: 'POST /v1/images/generations',
  operation: 'image_generation',
  request_params: createOpenAIImage2RequestSummary(requestBody),
  request_body: JSON.stringify({ prompt: form.prompt }),
})

if (!createLogResponse.success || !createLogResponse.data) {
  throw new Error(createLogResponse.error ?? '创建外部调用日志失败')
}

const logId = createLogResponse.data.id
setStatus('generating')
const externalResponse = await fetch(buildOpenAIImage2Url(form.baseUrl), {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${form.bearerToken}`,
  },
  body: JSON.stringify(requestBody),
})

const responseJson = parseOpenAIImage2Response(await externalResponse.json())
const durationMs = Math.round(performance.now() - startedAt)

if (!externalResponse.ok) {
  await updateExternalApiLog(logId, {
    status: 'failed',
    duration_ms: durationMs,
    error_message: JSON.stringify(responseJson).slice(0, 2000),
  })
  throw new Error('OpenAI Image-2 生成失败')
}

setStatus('updating-log')
await updateExternalApiLog(logId, {
  status: 'success',
  duration_ms: durationMs,
  response_body: JSON.stringify(createOpenAIImage2ResponseSummary(responseJson)),
})

const firstBase64 = extractImageBase64List(responseJson)[0]
if (!firstBase64) throw new Error('响应中没有可展示的 base64 图片')

const blob = base64ToBlob(firstBase64, 'image/png')
const objectUrl = URL.createObjectURL(blob)
setStatus('saving-media')

const mediaResponse = await uploadMedia(blob, `${form.imageTitle || 'openai-image-2'}.png`, 'image', 'image_generation', {
  source: 'openai-image-2',
  service_provider: 'openai',
  operation: 'image_generation',
  external_api_log_id: logId,
  model: form.model,
  prompt_summary: form.prompt.slice(0, 120),
  size: form.size,
  quality: form.quality,
  background: form.background,
  output_format: form.outputFormat,
  usage: responseJson.usage,
})

setResult({ objectUrl, blob, logId, mediaId: mediaResponse.data?.id })
setStatus('success')
toast.success('图片生成成功，已自动保存到媒体库')
```

Wrap the sequence in `try/catch`, set `failed` status on errors, and show `toast.error(message)`.

- [ ] **Step 6: 实现 UI 与 Object URL 清理**

Render these visible controls with accessible labels used by tests:

```tsx
<PageHeader title="OpenAI Image-2" description="浏览器直连外部 OpenAI 兼容图片生成接口" />
<input aria-label="Base URL" value={form.baseUrl} onChange={(event) => updateForm({ baseUrl: event.target.value })} />
<input aria-label="Bearer Token" type="password" value={form.bearerToken} onChange={(event) => updateForm({ bearerToken: event.target.value })} />
<button type="button" onClick={clearBearerToken}>清除密钥</button>
<textarea aria-label="提示词" value={form.prompt} onChange={(event) => updateForm({ prompt: event.target.value })} />
<button type="button" disabled={!canGenerate}>生成图片</button>
{result && <img src={result.objectUrl} alt="OpenAI Image-2 生成结果" />}
```

Add cleanup:

```tsx
useEffect(() => {
  return () => {
    if (result?.objectUrl) URL.revokeObjectURL(result.objectUrl)
  }
}, [result?.objectUrl])
```

- [ ] **Step 7: 运行页面测试确认通过**

Run: `npm run test -- src/pages/__tests__/OpenAIImage2.test.tsx`

Expected: PASS。

---

### Task 7: 接入路由与侧边栏菜单

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `src/components/layout/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: 写侧边栏失败测试**

Add a test that renders the sidebar with a pro user and expects:

```tsx
expect(screen.getByText('外部调试')).toBeInTheDocument()
expect(screen.getByRole('link', { name: /OpenAI Image-2/ })).toHaveAttribute('href', '/external-debug/openai-image-2')
```

- [ ] **Step 2: 运行侧边栏测试确认失败**

Run: `npm run test -- src/components/layout/__tests__/Sidebar.test.tsx`

Expected: FAIL，原因是菜单尚未存在。

- [ ] **Step 3: App 新增懒加载与路由**

In `src/App.tsx`, add:

```tsx
const OpenAIImage2 = lazy(() => import('@/pages/OpenAIImage2'))
```

Add route near other debug/monitoring routes:

```tsx
<Route path="external-debug/openai-image-2" element={
  <RouteWithErrorBoundary pageName="OpenAI Image-2">
    <OpenAIImage2 />
  </RouteWithErrorBoundary>
} />
```

- [ ] **Step 4: Sidebar 新增外部调试 section**

In `src/components/layout/Sidebar.tsx`, add a menu section:

```ts
{
  id: 'external-debug',
  label: '外部调试',
  icon: Globe,
  minRole: 'pro',
  items: [
    { path: '/external-debug/openai-image-2', label: 'OpenAI Image-2', icon: Image, minRole: 'pro' },
  ],
}
```

If `getStoredExpanded()` uses default expanded sections, include:

```ts
return { debug: true, 'external-debug': true }
```

- [ ] **Step 5: 运行侧边栏测试确认通过**

Run: `npm run test -- src/components/layout/__tests__/Sidebar.test.tsx`

Expected: PASS。

---

### Task 8: 集成验证与回归检查

**Files:**
- Review: all files modified above
- Review: `docs/specs/2026-04-25-r-024-openai-image-2-external-debug-design.md`

- [ ] **Step 1: 运行后端相关测试**

Run: `npm run test:server -- server/validation/__tests__/external-api-logs-schemas.test.ts server/repositories/__tests__/external-api-log.repository.test.ts server/routes/__tests__/external-api-logs.test.ts server/routes/__tests__/media-upload.test.ts`

Expected: PASS，且失败时只修复本计划引入的问题。

- [ ] **Step 2: 运行前端相关测试**

Run: `npm run test -- src/lib/__tests__/openai-image-2.test.ts src/pages/__tests__/OpenAIImage2.test.tsx src/components/layout/__tests__/Sidebar.test.tsx`

Expected: PASS。

- [ ] **Step 3: 运行 TypeScript 与构建**

Run: `npm run build`

Expected: PASS，输出包含 TypeScript build 和 Vite build 成功信息。

- [ ] **Step 4: 运行覆盖率命令**

Run: `npm run test:coverage`

Expected: PASS，后端覆盖率不低于项目硬阈值 80%。

- [ ] **Step 5: 人工核对安全边界**

检查以下内容全部成立：

```md
- Bearer Token 只存在于 `src/pages/OpenAIImage2.tsx` 的浏览器表单状态、本地缓存和 `fetch` 请求头。
- `createExternalApiLog` 与 `updateExternalApiLog` 的入参不包含 token、authorization、api key、cookie、password。
- `updateExternalApiLog` 的 `response_body` 只包含 summary，不包含 `b64_json`、`base64` 或 `data:image/png;base64,` 前缀开头的图片数据。
- `/api/media/upload` 接收的是 Blob/File multipart 文件，不是把 base64 字符串写入日志。
- 普通用户不能 PATCH 其他用户的 external api log。
```

- [ ] **Step 6: 检查 git diff**

Run: `git diff -- docs/specs/2026-04-25-r-024-openai-image-2-external-debug-design.md docs/plans/2026-04-25-r-024-openai-image-2-external-debug.md packages/shared-types/entities/external-api-log.ts server src`

Expected: diff 只包含 R-024 相关类型、日志、媒体上传、OpenAI Image-2 页面、路由、侧边栏、测试与文档计划改动。

---

## 执行顺序建议

1. Task 1-3 先完成后端日志能力，形成可测试的创建/更新边界。
2. Task 4 完成媒体 metadata 链路，确保自动保存能关联外部调用日志。
3. Task 5 完成前端纯函数和 API client，降低页面复杂度。
4. Task 6 完成新页面主流程。
5. Task 7 接入路由和导航。
6. Task 8 做完整验证。

---

## 自检记录

- 规格覆盖：本计划覆盖外部调试菜单、可配置 Base URL、固定 `/v1/images/generations`、Bearer Token 本地缓存与清除、浏览器直连、后端日志创建/更新、base64 不入日志、base64 解码预览、成功后自动上传媒体、metadata 关联日志、用户隔离、测试验收。
- 占位扫描：计划不包含待补内容标记，所有任务均给出明确文件、代码形状、命令和预期结果。
- 类型一致性：日志状态统一为 `pending | success | failed`；前端请求体使用 `output_format` 发给外部 API，表单字段使用 `outputFormat`；媒体记录 source 字段继续使用现有 `image_generation`，OpenAI 来源写入 metadata 的 `source: openai-image-2`。
