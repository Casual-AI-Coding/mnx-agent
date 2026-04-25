# R-024 OpenAI Image-2 外部调试设计

## 1. 背景与目标

### 1.1 背景

当前调试台主要围绕 MiniMax 能力建设，已有图片生成、音乐生成等调试页面，也已经具备媒体记录、文件上传和外部 API 调用日志查询能力。

R-024 需要新增外部供应商 OpenAI 的图片生成调试能力，接入 `chatgpt-image-2` / `gpt-image-2` 模型，并满足以下关键约束：

- 调试入口位于新的一级菜单「外部调试」下。
- 页面直接从浏览器调用外部 OpenAI 兼容接口，不经过后端代理。
- 后端仍要记录外部调用日志：发起前创建日志，响应后更新日志。
- 图片响应为 base64，前端解码成 png 展示。
- base64 字符串体积大，不写入外部调用日志。
- 响应成功后自动上传图片文件并保存媒体记录。
- 调试表单需要通过浏览器缓存记忆上次填写内容。

### 1.2 目标

本设计目标是交付一个可扩展、低重复、符合现有架构的外部图片生成调试页面：

- 新增「外部调试 / OpenAI Image-2」入口。
- 支持 Base URL 可配置，固定拼接 `/v1/images/generations`。
- 支持 Bearer Token 本地输入、本地缓存和一键清除。
- 前端直连外部 API，并将 base64 图片解码为 png 预览。
- 自动上传生成图片并保存为媒体记录。
- 复用现有 `external_api_logs` 与 `media_records`，避免新增重复数据模型。
- 外部调用日志只保存脱敏摘要，不保存 token、完整 header 或 base64 图片内容。

### 1.3 不在本期范围

- 不做后端 OpenAI 代理。
- 不做服务端保存或管理外部供应商 API Key。
- 不新增专用 OpenAI 图片媒体表。
- 不把 base64 响应写入日志或数据库。
- 不做多供应商统一配置中心。
- 不改造现有 MiniMax 图片生成页面。

---

## 2. 方案结论

采用：

**前端直连外部 API + 后端外部调用日志写入/更新接口 + 复用现有媒体上传能力**

### 2.1 采用原因

- 符合用户明确要求：外部请求由浏览器直接发起，不经过后端代理。
- 最小化后端改动：只扩展外部调用日志写接口，不复制媒体保存链路。
- 避免日志表膨胀：base64 只在浏览器内解码和上传，不写入日志。
- 便于审计：日志中保留请求参数摘要、响应摘要、耗时、usage 和错误信息。
- 便于后续扩展：未来其他外部调试页面可复用同一套日志写入能力。

### 2.2 已确认设计边界

- Base URL 可配置，默认 `https://mikuapi.org`。
- 固定 URI 为 `/v1/images/generations`，页面不允许修改路径。
- Bearer Token 允许浏览器本地缓存。
- 后端不保存、不记录、不代理 Bearer Token。
- 成功解析 base64 图片后自动上传并保存媒体记录，不需要手动点击保存。

---

## 3. 导航与页面结构

### 3.1 导航入口

在 `src/components/layout/Sidebar.tsx` 新增一级菜单：

- 「外部调试」

在该一级菜单下新增二级菜单：

- 「OpenAI Image-2」

该入口不混入现有 MiniMax 调试菜单，避免供应商语义混杂。

### 3.2 路由

在 `src/App.tsx` 新增懒加载页面路由，建议路径为：

```text
/external-debug/openai-image-2
```

页面通过现有 `RouteWithErrorBoundary` 包裹，页面名称使用 `OpenAI Image-2`。

### 3.3 页面文件

建议新增页面文件：

```text
src/pages/OpenAIImage2.tsx
```

页面复用现有调试页骨架和组件风格，包括：

- `PageHeader`
- 参数卡片
- 结果预览区
- 调试动作按钮
- 日志入口
- Lightbox 或图片预览模式

不建议继续扩展 `src/pages/ImageGeneration.tsx`，因为该文件已经承载 MiniMax 图片生成的复杂状态和 UI，继续混入外部供应商逻辑会增加维护成本。

### 3.4 页面区域

页面分为四个核心区域：

1. **连接配置**
   - Base URL
   - Bearer Token
   - 清除密钥按钮

2. **生成参数**
   - prompt
   - model
   - n
   - size
   - quality
   - background
   - output_format
   - moderation
   - imageTitle

3. **响应预览**
   - base64 解码后的 png 图片
   - 生成耗时
   - usage 摘要
   - 响应参数摘要

4. **保存状态**
   - 自动上传进度
   - 媒体记录 ID
   - 保存失败提示
   - 重试保存按钮

---

## 4. 请求与日志链路

### 4.1 总体流程

一次生成请求按以下顺序执行：

1. 前端创建外部调用日志。
2. 前端浏览器直连外部 API。
3. 前端解析响应并更新外部调用日志。
4. 前端解码 base64 图片。
5. 前端自动上传图片文件并保存媒体记录。
6. 页面展示预览和媒体保存结果。

### 4.2 创建日志

生成前，前端调用后端新增接口：

```http
POST /api/external-api-logs
```

创建日志时只提交脱敏摘要：

- `service_provider`: `openai`
- `api_endpoint`: `POST /v1/images/generations`
- `operation`: `image_generation`
- Base URL 域名或脱敏后的 Base URL
- `model`
- `prompt`
- `n`
- `size`
- `quality`
- `background`
- `output_format`
- `moderation`

不得提交：

- Bearer Token
- Authorization header
- Cookie
- 完整 headers
- base64 图片内容

如果日志创建失败，前端阻止外部生成请求并提示用户。原因是需求要求“发起时后端记录”。

### 4.3 浏览器直连外部接口

外部请求地址由前端拼接：

```text
${baseUrl}/v1/images/generations
```

默认 `baseUrl` 为：

```text
https://mikuapi.org
```

请求头：

```http
Authorization: Bearer <用户输入的 token>
Content-Type: application/json
```

请求体以用户提供的 curl 示例为基准：

```json
{
  "model": "gpt-image-2",
  "prompt": "一张电影感人像海报，暖色光照，细节丰富",
  "n": 1,
  "size": "1376x2048",
  "quality": "high",
  "background": "auto",
  "output_format": "png",
  "moderation": "auto"
}
```

参数校验应以调试灵活性为优先，避免过度限制 OpenAI 兼容接口支持的自定义取值。

### 4.4 更新日志

外部请求完成后，前端调用后端新增接口：

```http
PATCH /api/external-api-logs/:id
```

成功时更新：

- `status`: `success`
- `duration_ms`
- `usage` token 摘要
- `created`
- `model`
- `size`
- `quality`
- `background`
- `output_format`
- 图片数量

失败时更新：

- `status`: `failed`
- `duration_ms`
- HTTP 状态码
- 错误 code
- 错误 message

日志更新失败不影响图片预览和自动保存，但页面需要提示“日志回写失败”，并提供重试回写能力。

### 4.5 后端权限与脱敏

新增写接口必须满足：

- 所有接口受 JWT 保护。
- `user_id` 从当前登录用户获取，不信任前端传入。
- 普通用户只能更新自己的日志。
- 请求体使用 Zod schema 校验。
- 只允许白名单字段写入。
- 即使前端误传敏感字段，也必须脱敏或拒绝。

---

## 5. base64 解码、预览与自动保存

### 5.1 base64 响应处理

外部接口成功后，前端兼容读取响应中的 base64 图片字段，例如：

- `data[].b64_json`
- `data[]` 中兼容接口返回的等价 base64 字段

处理流程：

1. base64 转 `Uint8Array`。
2. `Uint8Array` 转 `Blob`。
3. `Blob` 生成 `Object URL`。
4. 页面使用 `Object URL` 预览 png 图片。

页面卸载、重新生成或替换结果时，必须释放旧的 `Object URL`，避免内存泄露。

### 5.2 自动上传媒体记录

响应成功并完成 base64 解码后，前端立即执行自动保存：

1. 将 `Blob` 包装成 `File`。
2. 调用现有 `/api/media/upload` multipart 上传接口。
3. 媒体类型为 `image`。
4. 文件名优先使用 `imageTitle`，没有标题时使用时间戳。
5. 上传成功后记录 `mediaRecordId` 并更新页面状态。

不新增 base64 保存接口。自动保存失败不影响图片预览，但页面必须展示失败原因，并提供“重试保存”能力。

### 5.3 媒体 metadata

媒体记录的 metadata 建议包含：

```json
{
  "source": "openai-image-2",
  "service_provider": "openai",
  "operation": "image_generation",
  "external_api_log_id": 123,
  "model": "gpt-image-2",
  "prompt_summary": "一张电影感人像海报，暖色光照，细节丰富",
  "size": "1376x2048",
  "quality": "high",
  "background": "auto",
  "output_format": "png",
  "created": 1710000000,
  "usage": {
    "total_tokens": 0,
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

metadata 中不保存 Bearer Token，也不保存 base64 图片内容。

---

## 6. 浏览器缓存策略

### 6.1 表单持久化

复用现有 `useFormPersistence` 模式，新增独立 storage key：

```text
DEBUG_FORM_KEYS.OPENAI_IMAGE_2
```

缓存字段包括：

- `baseUrl`
- `bearerToken`
- `prompt`
- `model`
- `n`
- `size`
- `quality`
- `background`
- `outputFormat`
- `moderation`
- `imageTitle`

### 6.2 Token 处理

Bearer Token 允许浏览器本地缓存，以满足调试效率要求。

页面必须提供“清除密钥”按钮，只清除 `bearerToken`，保留其他表单参数。

页面文案需要明确提示：

- Token 仅存储在当前浏览器。
- Token 会出现在浏览器发起的外部请求中。
- 后端不会保存或代理 Token。

---

## 7. 前端数据结构

### 7.1 表单数据

建议定义 `OpenAIImage2FormData`：

```typescript
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
```

### 7.2 结果数据

建议定义 `OpenAIImage2Result`：

```typescript
interface OpenAIImage2Result {
  id: string
  status: 'idle' | 'creating-log' | 'generating' | 'updating-log' | 'saving-media' | 'success' | 'failed'
  previewUrl?: string
  blob?: Blob
  mediaRecordId?: string
  externalApiLogId?: number
  usage?: OpenAIImage2UsageSummary
  durationMs?: number
  error?: string
}
```

实现时应优先使用项目已有类型风格，并避免使用 `any`、`@ts-ignore` 或不必要的类型断言。

---

## 8. 后端接口设计

### 8.1 创建外部调用日志

```http
POST /api/external-api-logs
```

请求体只允许创建调试日志所需字段。建议状态支持待更新语义。如果现有 `status` 仅支持 `success` / `failed`，实现阶段需要决定：

- 增加 `pending` 状态，并配套迁移和类型更新；或
- 创建时先写入可识别的初始状态字段，并在更新时覆盖。

推荐增加 `pending` 状态，因为它能准确表达“请求已发起但尚未返回”的生命周期。

### 8.2 更新外部调用日志

```http
PATCH /api/external-api-logs/:id
```

更新接口只允许更新当前用户拥有的日志，并限制可更新字段：

- `status`
- `duration_ms`
- `response_body` 中的脱敏摘要
- `error_message`
- 必要的响应摘要字段

不得接收或写入 base64 图片内容。

### 8.3 与现有日志查询页的关系

现有 `ExternalApiLogs` 页面可继续作为日志查看入口。

R-024 只需要保证新日志使用：

- `service_provider = openai`
- `operation = image_generation`
- `api_endpoint = POST /v1/images/generations`

后续可以通过 provider 和 operation 过滤查看。

---

## 9. 错误处理

### 9.1 日志创建失败

日志创建失败时，不发起外部生成请求。

页面提示：外部调用日志创建失败，请重试。

### 9.2 外部 API 失败

外部 API 返回 400 / 401 / 429 / 500 等错误时：

- 页面展示错误摘要。
- 更新外部调用日志为失败。
- 不执行媒体自动保存。

### 9.3 日志更新失败

日志更新失败时：

- 不影响图片预览。
- 不阻塞媒体自动保存。
- 页面显示日志回写失败，并提供重试。

### 9.4 媒体自动保存失败

媒体自动保存失败时：

- 不影响图片预览。
- 页面保留 `Blob` 和预览。
- 展示失败原因。
- 提供重试保存按钮。

### 9.5 base64 解析失败

base64 解析失败时：

- 更新页面结果为失败。
- 日志可记录为外部请求成功但客户端解析失败的错误摘要。
- 不执行媒体上传。

---

## 10. 测试与验收标准

### 10.1 前端验收

- 菜单出现一级「外部调试」和二级「OpenAI Image-2」。
- 路由 `/external-debug/openai-image-2` 可访问。
- Base URL 可配置，固定拼接 `/v1/images/generations`。
- Bearer Token 可本地缓存，并可通过按钮清除。
- 表单参数可本地缓存。
- 点击生成后先创建外部调用日志。
- 浏览器直连外部 API。
- 成功响应后 base64 自动解码为 png 预览。
- 成功响应后自动上传图片并保存媒体记录。
- base64 不提交到日志接口。
- 媒体保存失败时可重试。
- 页面卸载或重新生成时释放旧 Object URL。

### 10.2 后端验收

- `POST /api/external-api-logs` 可创建外部调试日志。
- `PATCH /api/external-api-logs/:id` 可更新调用结果。
- 写接口必须校验 JWT。
- `user_id` 从登录态获取。
- 普通用户不能更新其他用户日志。
- Zod schema 拒绝或脱敏敏感字段。
- base64 图片内容不会进入 `external_api_logs`。
- 日志查询页能看到 provider 为 `openai`、operation 为 `image_generation` 的记录。

### 10.3 测试覆盖

后端建议覆盖：

- 外部日志创建成功。
- 外部日志更新成功。
- 未登录拒绝写入。
- 跨用户更新被拒绝。
- 敏感字段脱敏或拒绝。
- base64 字段被拒绝或不会写入。

前端建议覆盖：

- Base URL 与固定路径拼接。
- Bearer Token 清除。
- 表单持久化。
- base64 转 Blob。
- 自动上传媒体成功。
- 自动上传媒体失败后可重试。
- 日志创建失败时不发起外部请求。
- 外部 API 失败时更新日志失败状态。

---

## 11. 实施注意事项

- 外部接口可能存在 CORS 限制；这是前端直连模式的固有限制，页面需要展示清晰错误。
- API Key 暴露在浏览器属于已确认设计边界，页面需要用文案提醒。
- 参数枚举不应过度收紧，兼容接口可能支持官方文档以外的取值。
- `ImageGeneration.tsx` 和 `MusicGeneration.tsx` 可作为交互参考，但不应把 OpenAI Image-2 逻辑塞进现有 MiniMax 页面。
- 上传媒体时应复用现有 `/api/media/upload`，避免新增 base64 保存接口。
- 日志摘要字段应保持小体积，尤其不能写入图片 base64。
