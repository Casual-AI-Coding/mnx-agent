# OpenAI Image2 自动重试功能设计

## 概述

为 OpenAI Image2 图像生成功能添加自动重试机制，支持设置重试次数（0-10），失败时自动重试并记录每次尝试的详细信息。

## 需求摘要

| 参数 | 值 |
|------|---|
| 重试次数范围 | 0-10，默认 0（不重试） |
| 重试触发条件 | `/external-proxy` 接口任何异常或错误 |
| 重试方式 | 自动重试（无需用户干预） |
| 重试间隔 | 固定 1 秒 |
| 重试记录管理 | 前端暂存，刷新页面后清空 |
| 外部调用记录 | 多次重试共用一个 `externalApiLogId`，更新为最后一次调用结果 |

## 技术设计

### 1. 数据结构变更

#### 1.1 formData 新增字段

**文件**: `src/pages/OpenAIImage2.tsx`

```typescript
interface OpenAIImage2FormData {
  // ... 现有字段
  retryCount: number  // 新增：重试次数（0-10），默认 0
}
```

**位置**: 第 59-72 行的 `OpenAIImage2FormData` 接口

#### 1.2 新增重试记录类型

```typescript
interface RetryRecord {
  attempt: number           // 尝试次序（1 = 首次，2 = 第一次重试，...）
  status: 'pending' | 'generating' | 'success' | 'failed'
  error?: string            // 错误信息（失败时记录）
  durationMs?: number       // 本次耗时
  timestamp: string         // ISO 时间戳
  previewUrl?: string       // 成功时的图片预览 URL（仅最后一次成功记录有）
  blob?: Blob               // 成功时的图片 Blob（仅最后一次成功记录有）
}
```

#### 1.3 新增组件状态

```typescript
// 新增状态
const [retryHistory, setRetryHistory] = useState<RetryRecord[]>([])
const [currentRetryIndex, setCurrentRetryIndex] = useState(0)
```

**用途**:
- `retryHistory`: 存储所有尝试记录（包括首次和每次重试）
- `currentRetryIndex`: 当前查看的重试记录索引（用于翻页状态栏）

### 2. UI 变更

#### 2.1 参数表单新增"重试次数"选择器

**位置**: 第 626-663 行的 `grid grid-cols-4` 区域，调整为 5 列，末尾添加

```tsx
<div className="grid grid-cols-5 gap-3 [&>*]:min-w-0">
  {/* ... 现有的 Background、Format、Moderation、数量 */}
  
  <div className="space-y-1">
    <Label className="text-xs font-medium text-muted-foreground">重试次数</Label>
    <Select value={String(formData.retryCount)} onValueChange={v => updateForm({ retryCount: Number(v) })}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

#### 2.2 结果预览右上角新增翻页状态栏

**位置**: 第 684-709 行的 `CardHeader` 区域，参考 `LyricsGeneration.tsx` 第 455-508 行

```tsx
<CardHeader className="pb-4">
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2 text-base">
      <ImageIcon className="w-4 h-4 text-indigo-500" />
      结果预览
    </CardTitle>
    
    {/* 现有状态标签 */}
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.span key={result.status} ...>
          {STATUS_LABELS[result.status]}
        </motion.span>
      </AnimatePresence>
      
      {/* 新增：翻页状态栏（仅当有重试记录时显示） */}
      {retryHistory.length > 1 && (
        <div className="flex items-center gap-2">
          {/* 左箭头 */}
          <button
            onClick={() => setCurrentRetryIndex(Math.max(0, currentRetryIndex - 1))}
            disabled={currentRetryIndex === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {/* 状态圆点列表 */}
          <div className="flex items-center gap-1.5">
            {retryHistory.map((record, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentRetryIndex(idx)}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
                  idx === currentRetryIndex && record.status === 'generating' && "ring-[3px] ring-blue-500 bg-blue-500/20 text-blue-500",
                  idx === currentRetryIndex && record.status === 'success' && "ring-[3px] ring-emerald-500 bg-emerald-500/20 text-emerald-600",
                  idx === currentRetryIndex && record.status === 'failed' && "ring-[3px] ring-red-500 bg-red-500/20 text-red-600",
                  idx !== currentRetryIndex && record.status === 'generating' && "bg-blue-500/20 text-blue-500 animate-pulse",
                  idx !== currentRetryIndex && record.status === 'success' && "bg-emerald-500/20 text-emerald-600",
                  idx !== currentRetryIndex && record.status === 'failed' && "bg-red-500/20 text-red-600"
                )}
              >
                {record.status === 'generating' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : record.status === 'failed' ? (
                  <X className="w-3 h-3" />
                ) : (
                  idx + 1
                )}
              </button>
            ))}
          </div>
          
          {/* 右箭头 */}
          <button
            onClick={() => setCurrentRetryIndex(Math.min(retryHistory.length - 1, currentRetryIndex + 1))}
            disabled={currentRetryIndex === retryHistory.length - 1}
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 现有重新生成按钮 */}
      {(result.status === 'success' || result.status === 'failed') && (
        <Button variant="outline" size="sm" onClick={resetResult}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          重新生成
        </Button>
      )}
    </div>
  </div>
</CardHeader>
```

#### 2.3 结果展示区域变更

当用户点击翻页状态栏查看不同重试记录时，展示对应记录的信息：

**失败记录展示**（CardContent 内）:
```tsx
{selectedRecord.status === 'failed' && (
  <div className="flex-1 flex flex-col items-center justify-center py-20">
    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
      <AlertCircle className="w-8 h-8 text-red-500" />
    </div>
    <p className="text-sm font-medium text-red-500 mb-1">第 {selectedRecord.attempt} 次尝试失败</p>
    <p className="text-xs text-muted-foreground max-w-md text-center">{selectedRecord.error}</p>
    {selectedRecord.durationMs && (
      <p className="text-xs text-muted-foreground mt-2">耗时 {(selectedRecord.durationMs / 1000).toFixed(2)}s</p>
    )}
  </div>
)}
```

### 3. 核心逻辑变更

#### 3.1 handleGenerate 重构为重试循环

**文件**: `src/pages/OpenAIImage2.tsx`，第 209-374 行

**重构策略**:
- 将现有逻辑封装为 `executeGenerationAttempt(attemptNumber: number, logId: number)` 函数
- 外层循环控制重试次数和间隔
- 每次尝试后更新 `retryHistory`

```typescript
const handleGenerate = useCallback(async () => {
  const { baseUrl, bearerToken, prompt, model, n, size, quality, background, outputFormat, moderation, imageTitle, retryCount } = formData
  if (!prompt.trim() || !bearerToken.trim()) return

  // 清理之前的结果
  if (result.previewUrl) URL.revokeObjectURL(result.previewUrl)
  setResult({ status: 'creating-log' })
  setRetryHistory([])  // 清空重试历史
  setCurrentRetryIndex(0)

  // 创建 externalApiLog
  const body: OpenAIImage2RequestBody = { model, prompt: prompt.trim(), n, size, quality, background, output_format: outputFormat, moderation }
  let logId: number
  try {
    const logResult = await createExternalApiLog({ ... })
    logId = logResult.data.id
  } catch (err) {
    setResult({ status: 'failed', error: '创建调用日志失败' })
    return
  }

  // 重试循环
  const maxAttempts = retryCount + 1  // 首次 + 重试次数
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 记录本次尝试开始
    const attemptRecord: RetryRecord = {
      attempt,
      status: 'generating',
      timestamp: new Date().toISOString(),
    }
    setRetryHistory(prev => [...prev, attemptRecord])
    setCurrentRetryIndex(attempt - 1)  // 自动切换到当前尝试
    setResult(prev => ({ ...prev, status: 'generating', externalApiLogId: logId }))

    // 执行生成
    const attemptResult = await executeGenerationAttempt(attempt, logId, body)
    
    // 更新本次尝试记录
    setRetryHistory(prev => {
      const updated = [...prev]
      updated[attempt - 1] = {
        ...updated[attempt - 1],
        status: attemptResult.success ? 'success' : 'failed',
        error: attemptResult.error,
        durationMs: attemptResult.durationMs,
        previewUrl: attemptResult.success ? attemptResult.previewUrl : undefined,
        blob: attemptResult.success ? attemptResult.blob : undefined,
      }
      return updated
    })

    if (attemptResult.success) {
      // 成功：更新 externalApiLog，保存媒体，结束循环
      await updateExternalApiLog(logId, { status: 'success', duration_ms: attemptResult.durationMs, ... })
      // ... 保存媒体逻辑
      setResult({ status: 'success', previewUrl: attemptResult.previewUrl, ... })
      break
    }

    // 失败：如果还有重试机会，等待 1 秒后继续
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      // 最后一次尝试也失败了
      await updateExternalApiLog(logId, { status: 'failed', error_message: attemptResult.error, ... })
      setResult({ status: 'failed', externalApiLogId: logId, error: attemptResult.error })
    }
  }
}, [formData, result.previewUrl])

// 新增：执行单次生成尝试
const executeGenerationAttempt = async (
  attempt: number,
  logId: number,
  body: OpenAIImage2RequestBody
): Promise<{ success: boolean; error?: string; durationMs?: number; previewUrl?: string; blob?: Blob }> => {
  try {
    const startTime = performance.now()
    const url = buildOpenAIImage2Url(formData.baseUrl)
    const proxyResult = await internalAxios.post('/external-proxy', {
      url,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${formData.bearerToken}`, 'Content-Type': 'application/json' },
      body,
    }, { timeout: TIMEOUTS.EXTERNAL_PROXY }).then(r => r.data)
    const durationMs = Math.round(performance.now() - startTime)

    if (!proxyResult.success) throw new Error(proxyResult.error || '代理请求失败')
    const { status, body: upstreamBody } = proxyResult.data
    if (status >= 400) throw new Error(`外部 API 响应 ${status}: ...`)

    const parsed = parseOpenAIImage2Response(upstreamBody)
    const base64List = extractImageBase64List(parsed)
    if (base64List.length === 0) throw new Error('外部 API 未返回图片数据')

    const blob = base64ToBlob(base64List[0], `image/${formData.outputFormat}`)
    const previewUrl = URL.createObjectURL(blob)
    return { success: true, durationMs, previewUrl, blob }
  } catch (err) {
    const error = formatExternalApiError(err)
    return { success: false, error, durationMs: 0 }
  }
}
```

#### 3.2 resetResult 清空重试历史

```typescript
const resetResult = useCallback(() => {
  if (result.previewUrl) URL.revokeObjectURL(result.previewUrl)
  retryHistory.forEach(r => {
    if (r.previewUrl) URL.revokeObjectURL(r.previewUrl)
  })
  setResult({ status: 'idle' })
  setRetryHistory([])
  setCurrentRetryIndex(0)
  // ... 其他清理
}, [result.previewUrl, retryHistory])
```

### 4. externalApiLog 更新策略

**多次重试共用一个 logId**:
- 每次尝试失败后，更新 `error_message` 和 `duration_ms`（记录最新的失败信息）
- 最终成功时，更新 `status: 'success'`、`response_body`、`duration_ms`（记录成功的响应）
- 如果全部失败，`status: 'failed'`，`error_message` 记录最后一次的错误

**更新时机**:
- 每次尝试结束后立即更新（不等待所有重试完成）
- 确保即使中途刷新页面，数据库中也有最新的调用状态

### 5. 错误处理与边界情况

#### 5.1 重试期间用户取消

用户可能在重试循环期间点击"重新生成"或离开页面：
- 重试循环是异步的，无法直接中断
- 建议：添加 `isCancelled` 标志，每次重试前检查，如果已取消则跳出循环

```typescript
const [isCancelled, setIsCancelled] = useState(false)

// handleGenerate 内
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  if (isCancelled) {
    setIsCancelled(false)
    break
  }
  // ... 重试逻辑
}

// resetResult 内
const resetResult = useCallback(() => {
  setIsCancelled(true)  // 标记取消
  // ... 清理逻辑
}, [])
```

#### 5.2 网络错误与超时

`/external-proxy` 的 timeout 已设置为 `TIMEOUTS.EXTERNAL_PROXY`：
- 超时会抛出错误，触发重试
- CORS 错误（TypeError with 'fetch'）会显示友好提示并重试

#### 5.3 重试次数为 0

- `retryCount = 0` 时，`maxAttempts = 1`，仅执行一次尝试
- 不显示翻页状态栏（`retryHistory.length === 1`）
- 行为与现有逻辑一致

### 6. 测试要点

#### 6.1 单元测试

- `executeGenerationAttempt` 函数的成功/失败返回值
- 重试循环次数与间隔
- `retryHistory` 状态更新逻辑

#### 6.2 集成测试

- 设置 `retryCount = 3`，模拟连续失败 3 次后成功
- 设置 `retryCount = 0`，验证无重试行为
- 验证翻页状态栏 UI：点击切换、状态显示

#### 6.3 边界测试

- 重试期间取消
- 超时后的重试
- CORS 错误的重试
- 刷新页面后重试历史清空

## 实现清单

| 序号 | 任务 | 文件 | 改动行 |
|------|------|------|--------|
| 1 | 新增 `retryCount` 字段 | `OpenAIImage2.tsx` | 第 59-72 行 |
| 2 | 新增 `RetryRecord` 类型 | `OpenAIImage2.tsx` | 第 76-85 行后 |
| 3 | 新增 `retryHistory` 和 `currentRetryIndex` 状态 | `OpenAIImage2.tsx` | 第 170 行后 |
| 4 | 添加"重试次数"下拉选择器 | `OpenAIImage2.tsx` | 第 626-663 行区域 |
| 5 | 添加翻页状态栏 UI | `OpenAIImage2.tsx` | 第 684-709 行 |
| 6 | 重构 `handleGenerate` 为重试循环 | `OpenAIImage2.tsx` | 第 209-374 行 |
| 7 | 新增 `executeGenerationAttempt` 函数 | `OpenAIImage2.tsx` | 第 209 行前 |
| 8 | 更新 `resetResult` 清空重试历史 | `OpenAIImage2.tsx` | 第 441-449 行 |
| 9 | 添加失败记录详情展示 | `OpenAIImage2.tsx` | CardContent 内 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重试循环无法中断 | 用户离开页面后重试仍在执行 | 添加 `isCancelled` 标志检查 |
| 多次重试消耗 API 配额 | 外部 API 可能限流或收费 | 用户可设置 `retryCount = 0` |
| 刷新页面丢失重试历史 | 无法回顾之前的失败原因 | 需求明确为"前端暂存"，不持久化 |
| 重试期间 UI 状态复杂 | 多个状态同时变化 | 使用 `retryHistory` 作为单一数据源 |

## 参考资料

- `LyricsGeneration.tsx` 第 455-508 行：翻页状态栏 UI 参考
- `OpenAIImage2.tsx` 第 262-270 行：`/external-proxy` 调用参考
- `OpenAIImage2.tsx` 第 376-406 行：现有 retry 逻辑参考