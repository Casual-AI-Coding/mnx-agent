# OpenAI Image2 异步重构设计文档

## 问题背景

当前 OpenAI Image2 生成功能存在两个 Cloudflare 相关问题：

1. **接口超时**：`/external-proxy` 同步等待外部 API 响应，Cloudflare 120s 限制导致 524 超时
2. **上传大小限制**：前端通过 `/api/media/upload` 上传图片，Cloudflare 413 限制（15MB+ 图片失败）

## 设计目标

1. 避免 Cloudflare 超时：将同步代理改为异步任务模式
2. 避免上传限制：后端直接保存图片，不经过前端上传
3. 保持用户体验：轮询模式展示生成进度

## 架构设计

### 整体流程

```
前端                    后端                    外部 API
  |                      |                        |
  |-- submit task ------>|                        |
  |<-- taskId -----------|                        |
  |                      |-- async call --------->|
  |                      |                        |
  |-- poll status ------>|                        |
  |<-- processing -------|                        |
  |                      |<-- response -----------|
  |                      |-- save image           |
  |                      |-- create media record  |
  |-- poll status ------>|                        |
  |<-- completed + mediaId + previewUrl ----------|
```

### 数据库扩展

扩展 `external_api_logs` 表，添加以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| task_status | VARCHAR(20) | 任务状态：sync/pending/processing/completed/failed |
| result_media_id | VARCHAR(36) | 关联的 media_records.id |
| result_data | JSONB | API 响应数据（图片 URL、usage 等） |

**状态流转**：
- `sync`：旧模式，同步请求（向后兼容）
- `pending`：任务已提交，等待处理
- `processing`：正在调用外部 API
- `completed`：任务完成，图片已保存
- `failed`：任务失败

### 后端接口设计

#### 1. 提交异步任务

**接口**：`POST /api/external-proxy/submit`

**请求体**：
```typescript
interface AsyncTaskSubmitRequest {
  url: string                    // 外部 API URL
  method?: 'GET' | 'POST'       // HTTP 方法，默认 POST
  headers?: Record<string, string>  // 请求头
  body?: unknown                 // 请求体
  
  // 任务元数据
  service_provider: string       // 服务提供商，如 'openai'
  operation: string              // 操作类型，如 'image_generation'
  request_params?: Record<string, unknown>  // 请求参数摘要
  
  // 图片保存配置
  save_config?: {
    type: 'image' | 'audio' | 'video'  // 媒体类型
    source: string                       // 来源，如 'external_debug'
    filename?: string                    // 文件名
    metadata?: Record<string, unknown>   // 附加元数据
  }
}
```

**响应**：
```typescript
interface AsyncTaskSubmitResponse {
  success: boolean
  data?: {
    task_id: number        // 任务 ID，用于轮询
    status: 'pending'      // 初始状态
  }
  error?: string
}
```

#### 2. 轮询任务状态

**接口**：`GET /api/external-proxy/status/:taskId`

**响应**：
```typescript
interface AsyncTaskStatusResponse {
  success: boolean
  data?: {
    task_id: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    duration_ms?: number       // 执行耗时
    
    // completed 时返回
    media_id?: string          // 保存的媒体记录 ID
    preview_url?: string       // 预签名 URL，用于前端显示
    result_data?: unknown      // API 响应数据
    
    // failed 时返回
    error?: string             // 错误信息
  }
  error?: string
}
```

### 后端实现细节

#### 异步任务处理流程

```typescript
async function processAsyncTask(taskId: number) {
  // 1. 更新状态为 processing
  await updateTaskStatus(taskId, 'processing')
  
  try {
    // 2. 调用外部 API
    const response = await fetchExternalApi(taskConfig)
    
    // 3. 解析响应，提取图片数据
    const imageData = extractImageData(response)
    
    // 4. 保存图片到磁盘
    const { filename, size_bytes } = await saveMediaFile(
      Buffer.from(imageData, 'base64'),
      saveConfig.filename,
      saveConfig.type
    )
    
    // 5. 创建 MediaRecord
    const mediaRecord = await createMediaRecord({
      filename,
      type: saveConfig.type,
      source: saveConfig.source,
      size_bytes,
      metadata: saveConfig.metadata
    })
    
    // 6. 更新任务状态为 completed
    await updateTaskStatus(taskId, 'completed', {
      media_id: mediaRecord.id,
      result_data: response
    })
    
  } catch (error) {
    // 7. 更新任务状态为 failed
    await updateTaskStatus(taskId, 'failed', {
      error: error.message
    })
  }
}
```

#### 图片保存逻辑

针对 OpenAI Image2 API 响应格式：

```typescript
// OpenAI 响应格式
{
  data: [
    {
      b64_json: "base64_encoded_image_data"
      // 或
      url: "https://..."
    }
  ]
}

function extractImageData(response: unknown): Buffer {
  const parsed = parseOpenAIResponse(response)
  
  if (parsed.data[0].b64_json) {
    // base64 直接解码
    return Buffer.from(parsed.data[0].b64_json, 'base64')
  } else if (parsed.data[0].url) {
    // 从 URL 下载
    return downloadImage(parsed.data[0].url)
  }
  
  throw new Error('No image data in response')
}
```

#### 预签名 URL 生成

为前端提供临时访问 URL，避免直接暴露文件路径：

```typescript
function generatePreviewUrl(mediaId: string): string {
  // 使用 media-token 生成签名 URL
  const token = generateMediaToken(mediaId, { expiresIn: '1h' })
  return `/api/media/signed/${mediaId}?token=${token}`
}
```

### 前端实现细节

#### API 函数

```typescript
// src/lib/api/external-proxy.ts

export async function submitAsyncTask(
  request: AsyncTaskSubmitRequest
): Promise<AsyncTaskSubmitResponse> {
  const response = await apiClient.client_.post('/external-proxy/submit', request)
  return response.data
}

export async function pollTaskStatus(
  taskId: number
): Promise<AsyncTaskStatusResponse> {
  const response = await apiClient.client_.get(`/external-proxy/status/${taskId}`)
  return response.data
}
```

#### 轮询逻辑

```typescript
// src/pages/OpenAIImage2.tsx

async function handleGenerate() {
  // 1. 提交任务
  const submitResult = await submitAsyncTask({
    url: buildOpenAIImage2Url(baseUrl),
    method: 'POST',
    headers: { 'Authorization': `Bearer ${bearerToken}` },
    body: requestBody,
    service_provider: 'openai',
    operation: 'image_generation',
    request_params: { model, size, quality, ... },
    save_config: {
      type: 'image',
      source: 'external_debug',
      filename: `${imageTitle}.${outputFormat}`,
      metadata: { model, prompt_summary: prompt.slice(0, 100), ... }
    }
  })
  
  if (!submitResult.success) {
    throw new Error(submitResult.error)
  }
  
  const taskId = submitResult.data.task_id
  
  // 2. 轮询状态
  const pollInterval = 3000  // 3 秒
  const maxPolls = 100       // 最多轮询 5 分钟
  
  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollInterval)
    
    const statusResult = await pollTaskStatus(taskId)
    
    if (statusResult.data.status === 'completed') {
      // 任务完成，使用 mediaId 和 previewUrl
      setResult({
        status: 'success',
        mediaId: statusResult.data.media_id,
        previewUrl: statusResult.data.preview_url,
        durationMs: statusResult.data.duration_ms
      })
      return
    }
    
    if (statusResult.data.status === 'failed') {
      throw new Error(statusResult.data.error)
    }
    
    // 更新进度状态
    setResult(prev => ({
      ...prev,
      status: 'generating',
      pollCount: i + 1
    }))
  }
  
  throw new Error('轮询超时')
}
```

#### UI 变更

1. **移除上传相关逻辑**：不再调用 `uploadMedia`
2. **添加轮询状态展示**：显示 "正在生成中... (第 N 次轮询)"
3. **预览图使用签名 URL**：直接使用后端返回的 `preview_url`

### 向后兼容

1. **旧同步接口保留**：`POST /api/external-proxy` 保持不变，供其他功能使用
2. **task_status 默认值**：旧记录的 `task_status` 为 `sync`，新记录为 `pending`/`completed`/`failed`
3. **前端渐进迁移**：可以先在 OpenAIImage2 中使用新接口，其他页面后续迁移

### 错误处理

1. **提交失败**：网络错误、参数校验失败
2. **轮询超时**：超过最大轮询次数，提示用户稍后查看
3. **任务失败**：外部 API 错误、图片保存失败
4. **重试机制**：保留现有的重试次数配置，在任务失败时自动重新提交

### 测试策略

1. **单元测试**：
   - 异步任务提交和状态更新
   - 图片保存逻辑（base64 解码、文件写入）
   - 预签名 URL 生成和验证

2. **集成测试**：
   - 完整的提交-轮询-完成流程
   - 失败场景和错误处理
   - 并发任务处理

3. **手动测试**：
   - 15MB+ 图片生成
   - Cloudflare 环境下无超时
   - 重试功能正常工作

### 部署步骤

1. 执行数据库迁移（添加新字段）
2. 部署后端代码（新增接口）
3. 部署前端代码（切换到轮询模式）
4. 验证新功能正常
5. 监控日志确认无异常

### 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据库迁移失败 | 服务中断 | 迁移脚本使用 IF NOT EXISTS，可重复执行 |
| 外部 API 长时间无响应 | 任务堆积 | 设置任务超时（10分钟），超时自动标记失败 |
| 预签名 URL 泄露 | 安全风险 | URL 有效期 1 小时，绑定用户 ID |
| 并发任务过多 | 服务器压力 | 限制同时处理的任务数（如 10 个） |

### 后续优化

1. **WebSocket 实时通知**：替代轮询，实时推送任务状态
2. **任务队列**：使用 Redis/Bull 队列管理异步任务
3. **批量生成**：支持一次提交多个图片生成任务
4. **进度回调**：外部 API 支持进度回调时，实时更新进度条
