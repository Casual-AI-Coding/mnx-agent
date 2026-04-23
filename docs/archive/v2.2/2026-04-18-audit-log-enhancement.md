# R-004 审计日志补充 - 实现计划

> 需求详情见 `@docs/roadmap/requirement-pools.md`

## 需求概述

| 字段 | 值 |
|------|------|
| ID | R-004 |
| 版本 | v2.1 |
| 优先级 | P1 |
| 分类 | Security |

### 需求范围

1. **HTTP请求审计增强**（统一表 `audit_logs`）:
   - 入参 `query_params`（结构化 JSONB）
   - 出参 `response_body`（截断 4KB）
   - Trace ID 预留字段

2. **外部 API 调用审计**（新表 `external_api_logs`）:
   - 记录 MiniMax、OpenAI 等外部服务调用
   - 存储 API 路径（如 `POST /v1/text/chatcompletion_v2`）
   - 支持 `service_provider` 区分不同服务商
   - 响应体截断 4KB

3. **Trace ID 预留**: 
   - 仅预留字段，v2.4 实现逻辑（R-013）

### 用户决策

- **HTTP 审计**: 统一表 `audit_logs`，新增字段
- **外部调用审计**: 新建表 `external_api_logs`（分表存储）
- **用户信息传递**: 请求上下文透传（AuditContext service）
- **响应体截断**: 4KB
- **Trace ID**: 方案B（v2.1 仅预留字段）
- **前端菜单**: 区分「HTTP 审计日志」「外部调用日志」

---

## 数据库设计

### 1. HTTP 审计表增强（audit_logs）

```sql
-- Migration: audit_logs_enhancement
ALTER TABLE audit_logs ADD COLUMN query_params JSONB DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN response_body TEXT DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN trace_id VARCHAR(32) DEFAULT NULL;
```

### 2. 外部调用日志表（external_api_logs）

```sql
-- Migration: create_external_api_logs_table
CREATE TABLE external_api_logs (
  id SERIAL PRIMARY KEY,
  service_provider VARCHAR(20) NOT NULL,  -- 'minimax', 'openai', 'deepseek' 等
  api_endpoint VARCHAR(100) NOT NULL,     -- 'POST /v1/text/chatcompletion_v2'
  operation VARCHAR(50) NOT NULL,         -- 'chat_completion'
  request_params JSONB,                   -- 请求参数（脱敏）
  response_body TEXT,                     -- 响应体（截断 4KB）
  status VARCHAR(20) NOT NULL,            -- 'success' / 'failed'
  error_message TEXT,
  duration_ms INTEGER,
  user_id INTEGER,
  trace_id VARCHAR(32),                   -- 预留 v2.4
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_external_api_logs_user_id ON external_api_logs(user_id);
CREATE INDEX idx_external_api_logs_service_provider ON external_api_logs(service_provider);
CREATE INDEX idx_external_api_logs_created_at ON external_api_logs(created_at);
```

---

## 技术方案

### 1. AuditContext Service

**用途**: 请求上下文传递 user_id、trace_id 等信息

**文件**: `server/services/audit-context.service.ts`（新增）

```typescript
// AuditContext service
export class AuditContext {
  private static current: AuditContext | null = null
  
  userId: number | null
  traceId: string | null  // v2.4 填充
  
  static setCurrent(context: AuditContext) {
    AuditContext.current = context
  }
  
  static getCurrent(): AuditContext | null {
    return AuditContext.current
  }
  
  static clear() {
    AuditContext.current = null
  }
}

// Express middleware 设置上下文
export function auditContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id ?? null
  AuditContext.setCurrent(new AuditContext(userId, null))
  
  res.on('finish', () => {
    AuditContext.clear()
  })
  
  next()
}
```

### 2. HTTP 审计增强

**文件**: `server/middleware/audit-middleware.ts`

**修改内容**:
1. 添加 `req.query` 捕获 → `query_params`
2. 使用 `res.json` hook 捕获响应体 → `response_body`
3. 截断响应体至 4KB
4. 扩展跳过路径列表

**新增跳过路径（9个）**:

| 路径 | 原因 |
|------|------|
| `/api/media/:id/favorite` | 个人偏好，无业务影响 |
| `/api/settings/preferences` | 用户偏好设置，非安全敏感 |
| `/api/settings/display` | 显示设置，纯个人偏好 |
| `/api/settings/theme` | 主题设置，无安全意义 |
| `/api/cron/jobs/:id/tags` | 标签添加，无业务影响 |
| `/api/cron/jobs/:id/tags/:tag` | 标签删除，低价值 |
| `/api/text/chat/stream` | 流式响应，响应体不可截断 |
| `/api/capacity/refresh` | 后台触发，高频低价值 |
| `/api/auth/refresh` | Token刷新，高频操作 |

**跳过路径配置**:

使用**精确路径匹配 + 正则**避免误跳过：

```typescript
// 精确跳过路径（不含参数）
const EXACT_SKIP_PATHS = [
  '/cron/health',
  '/ws',
  '/api/health',
  '/api/text/chat/stream',
  '/api/capacity/refresh',
  '/api/auth/refresh',
  '/api/settings/preferences',
  '/api/settings/display',
  '/api/settings/theme',
]

// 正则跳过路径（含动态参数）
const REGEX_SKIP_PATHS = [
  /^\/api\/media\/[^/]+\/favorite$/,      // /api/media/:id/favorite
  /^\/api\/cron\/jobs\/[^/]+\/tags$/,      // /api/cron/jobs/:id/tags
  /^\/api\/cron\/jobs\/[^/]+\/tags\/[^/]+$/, // /api/cron/jobs/:id/tags/:tag
]

function shouldSkipAudit(path: string): boolean {
  if (EXACT_SKIP_PATHS.includes(path)) return true
  if (REGEX_SKIP_PATHS.some(regex => regex.test(path))) return true
  return false
}
```

```typescript
// 响应体捕获模式
const originalJson = res.json.bind(res)
res.json = (body: any) => {
  const truncatedBody = truncateResponseBody(body, 4096)
  res.locals.auditResponseBody = truncatedBody
  return originalJson(body)
}

// 截断函数
function truncateResponseBody(body: any, maxSize: number): string {
  const str = typeof body === 'string' ? body : JSON.stringify(body)
  if (str.length > maxSize) {
    return str.substring(0, maxSize) + '...[truncated]'
  }
  return str
}
```

### 3. 外部 API 调用审计

**文件**: `server/services/external-api-audit.service.ts`（新增）

**Wrapper 模式**:

```typescript
// 外部 API 审计 wrapper（入库）
export function withExternalApiAudit<T extends (...args: any[]) => Promise<any>>(
  serviceProvider: string,
  apiEndpoint: string,
  operation: string,
  fn: T
): T {
  return async (...args: Parameters<T>) => {
    const startTime = Date.now()
    const context = AuditContext.getCurrent()
    const sanitizedParams = sanitizeSensitiveData(args)
    
    try {
      const result = await fn(...args)
      await logExternalApiCall({
        serviceProvider,
        apiEndpoint,
        operation,
        requestParams: sanitizedParams,
        responseBody: truncateResponseBody(result, 4096),
        status: 'success',
        durationMs: Date.now() - startTime,
        userId: context?.userId ?? null
      })
      return result
    } catch (error) {
      await logExternalApiCall({
        serviceProvider,
        apiEndpoint,
        operation,
        requestParams: sanitizedParams,
        errorMessage: error.message,
        status: 'failed',
        durationMs: Date.now() - startTime,
        userId: context?.userId ?? null
      })
      throw error
    }
  } as T
}

// 外部 API 日志 wrapper（仅 console log，不入库）
export function withExternalApiLog<T extends (...args: any[]) => Promise<any>>(
  serviceProvider: string,
  apiEndpoint: string,
  operation: string,
  fn: T
): T {
  return async (...args: Parameters<T>) => {
    const startTime = Date.now()
    const context = AuditContext.getCurrent()
    
    logger.info('[ExternalAPI] %s %s - operation: %s, user_id: %s, started', 
      serviceProvider, apiEndpoint, operation, context?.userId)
    
    try {
      const result = await fn(...args)
      logger.info('[ExternalAPI] %s %s - operation: %s, duration_ms: %d, status: success',
        serviceProvider, apiEndpoint, operation, Date.now() - startTime)
      return result
    } catch (error) {
      logger.error('[ExternalAPI] %s %s - operation: %s, duration_ms: %d, error: %s',
        serviceProvider, apiEndpoint, operation, Date.now() - startTime, error.message)
      throw error
    }
  } as T
}
```

### 4. MiniMax API 方法包裹

**文件**: `server/lib/minimax.ts`

**审计策略分类**:

| 类型 | 数量 | 处理方式 |
|------|------|----------|
| **生成/操作接口** | 14 | 入库 `external_api_logs` |
| **查询接口** | 8 | 仅 console log，不入库 |

#### 入库的生成/操作接口（14个）

| 方法 | api_endpoint | operation |
|------|-------------|-----------|
| chatCompletion | `POST /v1/text/chatcompletion_v2` | `chat_completion` |
| chatCompletionStream | `POST /v1/text/chatcompletion_v2` | `chat_completion_stream` |
| textToAudioSync | `POST /v1/t2a_v2` | `text_to_audio_sync` |
| textToAudioAsync | `POST /v1/t2a_async_v2` | `text_to_audio_async` |
| imageGeneration | `POST /v1/image_generation` | `image_generation` |
| musicGeneration | `POST /v1/music_generation` | `music_generation` |
| musicPreprocess | `POST /v1/music_cover_preprocess` | `music_preprocess` |
| videoGeneration | `POST /v1/video_generation` | `video_generation` |
| videoAgentGenerate | `POST /v1/video_template_generation` | `video_agent_generate` |
| fileUpload | `POST /v1/files/upload` | `file_upload` |
| fileDelete | `POST /v1/files/delete` | `file_delete` |
| voiceDelete | `POST /v1/delete_voice` | `voice_delete` |
| voiceClone | `POST /v1/voice_clone` | `voice_clone` |
| voiceDesign | `POST /v1/voice_design` | `voice_design` |

#### 仅日志的查询接口（8个）

| 方法 | api_endpoint | operation |
|------|-------------|-----------|
| textToAudioAsyncStatus | `GET /v1/t2a_async_v2` | `text_to_audio_async_status` |
| videoGenerationStatus | `GET /v1/query/video_generation` | `video_generation_status` |
| videoAgentStatus | `GET /v1/query/video_template_generation` | `video_agent_status` |
| fileList | `GET /v1/files/list` | `file_list` |
| fileRetrieve | `GET /v1/files/retrieve` | `file_retrieve` |
| voiceList | `POST /v1/get_voice` | `voice_list` |
| getBalance | `GET /v1/user/balance` | `get_balance` |
| getCodingPlanRemains | `GET /v1/api/openplatform/coding_plan/remains` | `get_coding_plan_remains` |

**包裹示例**:

```typescript
// MiniMaxClient 修改

// 1. 生成/操作接口（入库）
async chatCompletion(body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/text/chatcompletion_v2',
    'chat_completion',
    async () => {
      return retryWithBackoff(async () => {
        const response = await this.client.post('/v1/text/chatcompletion_v2', body)
        return response.data
      })
    }
  )()
}

// 2. 查询接口（仅日志）
async videoGenerationStatus(taskId: string): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/query/video_generation',
    'video_generation_status',
    async () => {
      const response = await this.client.get(`/v1/query/video_generation?task_id=${taskId}`)
      return response.data
    }
  )()
}

async getBalance(): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/user/balance',
    'get_balance',
    async () => {
      const response = await this.client.get('/v1/user/balance')
      return response.data
    }
  )()
}
```

### 5. 敏感数据脱敏

**当前 SENSITIVE_FIELDS**:
```typescript
['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'cookie']
```

**新增字段**（按实际需求）:
```typescript
['model', 'voice_id', 'file_id', 'prompt', 'text'] // 文本内容可能敏感
```

---

## 前端设计

### 菜单结构调整

```
审计日志（父菜单）
├── HTTP 审计日志（audit_logs）
└── 外部调用日志（external_api_logs）
```

### HTTP 审计日志页面

**文件**: `src/pages/Admin/AuditLogs.tsx`

**新增功能**:
- 详情弹窗显示 `query_params`（JSON 格式化）
- 详情弹窗显示 `response_body`（截断提示）

### 外部调用日志页面

**文件**: `src/pages/Admin/ExternalApiLogs.tsx`（新增）

**功能**:
- 筛选: `service_provider`（minimax/openai/其他）
- 筛选: `status`（success/failed）
- 筛选: 时间范围
- 详情弹窗显示:
  - API 路径（`api_endpoint`）
  - 请求参数（脱敏后）
  - 响应体（截断）
  - 执行时长

---

## 任务分解

### Task 1: 数据库迁移

**文件**: 
- `server/database/schema-pg.ts`
- `server/database/migrations-async.ts`
- `shared-types/entities/audit-log.ts`
- `shared-types/entities/external-api-log.ts`（新增）

**步骤**:
1. `audit_logs` 表添加 3 个字段
2. 创建 `external_api_logs` 表
3. 添加索引
4. 更新 TypeScript 类型定义

### Task 2: AuditContext Service

**文件**: 
- `server/services/audit-context.service.ts`（新增）
- `server/app.ts`（添加中间件）

**步骤**:
1. 创建 AuditContext service
2. 实现 auditContextMiddleware
3. 在 app.ts 注册中间件

### Task 3: HTTP 审计增强

**文件**: 
- `server/middleware/audit-middleware.ts`

**步骤**:
1. 添加 query_params 捕获
2. 实现 res.json hook 捕获响应体
3. 实现 truncateResponseBody 函数
4. 修改日志写入逻辑

### Task 4: 外部 API 审计 Service

**文件**: 
- `server/services/external-api-audit.service.ts`（新增）
- `server/repositories/external-api-log.repository.ts`（新增）

**步骤**:
1. 创建 external-api-audit.service.ts
2. 实现 withExternalApiAudit wrapper
3. 实现 logExternalApiCall 函数
4. 创建 repository 处理数据库写入
5. 扩展敏感数据脱敏列表

### Task 5: MiniMax API 包裹

**文件**: 
- `server/lib/minimax.ts`

**步骤**:
1. 导入 withExternalApiAudit
2. 包裹所有 22 个 API 方法
3. 保持原有错误处理逻辑

### Task 6: 外部调用日志路由

**文件**: 
- `server/routes/external-api-logs.ts`（新增）

**步骤**:
1. 列表查询（分页、筛选）
2. 详情查询
3. 用户隔离（非管理员只能看自己的日志）

### Task 7: 前端 HTTP 审计页面

**文件**: 
- `src/pages/Admin/AuditLogs.tsx`
- `src/lib/api/audit.ts`

**步骤**:
1. 更新 API 类型定义
2. 详情弹窗显示 query_params、response_body
3. JSON 格式化显示

### Task 8: 前端外部调用日志页面

**文件**: 
- `src/pages/Admin/ExternalApiLogs.tsx`（新增）
- `src/lib/api/external-api-logs.ts`（新增）
- `src/components/AdminSidebar.tsx`（菜单调整）

**步骤**:
1. 创建 ExternalApiLogs.tsx
2. 实现筛选功能（service_provider、status、时间）
3. 详情弹窗显示完整信息
4. 更新 AdminSidebar 菜单结构

### Task 9: 测试验证

**文件**: 
- `server/middleware/audit-middleware.test.ts`
- `server/services/external-api-audit.service.test.ts`
- `server/lib/minimax.test.ts`

**步骤**:
1. 测试 query_params 捕获
2. 测试响应体截断
3. 测试 AuditContext 传递
4. 测试外部 API 审计日志生成
5. 测试敏感数据脱敏

---

## 实现顺序

```
Phase 1: 数据层
├── Task 1: 数据库迁移
└── Task 2: AuditContext Service

Phase 2: 后端核心
├── Task 3: HTTP 审计增强
├── Task 4: 外部 API 审计 Service
└── Task 5: MiniMax API 包裹

Phase 3: API 路由
└── Task 6: 外部调用日志路由

Phase 4: 前端
├── Task 7: HTTP 审计页面
└── Task 8: 外部调用日志页面

Phase 5: 验证
└── Task 9: 测试验证
```

---

## 验收标准

- [ ] `audit_logs` 表新增 3 个字段：query_params, response_body, trace_id
- [ ] HTTP 审计记录 query_params 和 response_body（截断 4KB）
- [ ] `external_api_logs` 表创建成功
- [ ] MiniMax 生成/操作接口（14个）生成外部调用日志（入库）
- [ ] MiniMax 查询接口（8个）仅 console log（不入库）
- [ ] AuditContext 正确传递 user_id
- [ ] 敏感数据脱敏生效
- [ ] 前端菜单区分「HTTP 审计日志」「外部调用日志」
- [ ] 外部调用日志页面支持筛选和详情查看
- [ ] 所有测试通过

---

## Trace ID 与 v2.4 协调

**方案**: v2.1 仅预留字段，v2.4 实现逻辑

| 版本 | Trace ID 状态 |
|------|--------------|
| v2.1 | 字段存在（audit_logs + external_api_logs），默认 NULL |
| v2.4 | 填充值，实现分布式追踪 |

**v2.4 可能需要的额外字段**:
- `span_id VARCHAR(32)`
- `parent_span_id VARCHAR(32)`
- `AuditContext.traceId` 填充逻辑

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-18 | 创建实现计划，明确 Trace ID 预留方案 |
| 2026-04-18 | 重大调整：外部调用审计分表存储；新增 AuditContext service；新增 service_provider/api_endpoint 字段；前端菜单区分 |
| 2026-04-18 | 审计策略分类：生成/操作接口（14个）入库，查询接口（8个）仅 console log；新增 withExternalApiLog wrapper| 2026-04-18 | 新增 9 个跳过路径：favorite、preferences、display、theme、tags、stream、refresh、auth/refresh；使用精确匹配+正则避免误跳过 |
