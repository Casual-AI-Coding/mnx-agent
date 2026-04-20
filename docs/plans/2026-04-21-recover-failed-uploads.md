# 恢复上传失败文件功能实现计划

**目标**: 添加功能，允许用户恢复数据库中有记录但本地文件缺失的媒体文件，通过重新下载存储在 `metadata` 中的 `source_url`。

**架构**: 后端新增接口用于查询和恢复失败的上传。前端添加 UI 部分显示可恢复记录并触发恢复。文件存在性检查使用 `fs.access` 验证 `filepath` 是否存在于磁盘。

**技术栈**: Express routes, Zod validation, fs/promises, axios, React hooks

---

## 文件结构

### 后端（修改）
- `server/routes/media.ts` - 新增恢复相关接口
- `server/lib/media-storage.ts` - 添加文件存在性检查辅助函数

### 前端（修改）
- `src/lib/api/media.ts` - 新增恢复相关 API 函数
- `src/hooks/useMediaManagement.ts` - 添加恢复相关 hook 函数
- `src/pages/MediaManagement.tsx` - 添加恢复 UI 部分

---

## 任务 1: 后端 - 添加文件存在性检查辅助函数

**文件**:
- 修改: `server/lib/media-storage.ts`

- [ ] **步骤 1: 添加 fileExists 辅助函数**

在 `server/lib/media-storage.ts` 末尾添加以下函数：

```typescript
export async function fileExists(filepath: string, mediaRoot: string = DEFAULT_MEDIA_ROOT): Promise<boolean> {
  let fullPath: string

  if (filepath.startsWith(mediaRoot)) {
    fullPath = filepath
  } else if (filepath.startsWith('data/media') || filepath.startsWith('./data/media')) {
    fullPath = filepath.startsWith('./') ? filepath : './' + filepath
  } else {
    fullPath = join(mediaRoot, filepath)
  }

  try {
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
}
```

- [ ] **步骤 2: 提交**

```bash
git add server/lib/media-storage.ts
git commit -m "feat(media): add fileExists helper for recovery feature"
```

---

## 任务 2: 后端 - 添加验证 Schema

**文件**:
- 修改: `server/validation/media-schemas.ts`

- [ ] **步骤 1: 添加恢复相关 schema**

在 `server/validation/media-schemas.ts` 末尾添加：

```typescript
export const recoverMediaParamsSchema = z.object({
  id: idSchema('media id'),
})

export const recoverAllMediaResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    recovered: z.number(),
    failed: z.array(z.object({
      id: z.string(),
      error: z.string(),
    })),
  }),
})
```

- [ ] **步骤 2: 提交**

```bash
git add server/validation/media-schemas.ts
git commit -m "feat(media): add validation schemas for recovery endpoints"
```

---

## 任务 3: 后端 - 添加恢复接口

**文件**:
- 修改: `server/routes/media.ts`

- [ ] **步骤 1: 添加 GET /api/media/recoverable 接口**

在 `/:id` 接口之后添加：

```typescript
router.get('/recoverable', asyncHandler(async (req, res) => {
  const db = getMediaService()
  const ownerFilter = buildOwnerFilter(req)
  const visibilityOwnerId = ownerFilter.ownerId

  // 获取所有在 metadata 中有 source_url 的媒体记录
  // 需要自定义查询，因为通用 getAll 不支持此过滤
  const result = await db.getAll({
    limit: 1000, // 获取全部用于本地过滤
    offset: 0,
    visibilityOwnerId,
  })

  const { fileExists } = await import('../lib/media-storage.js')

  // 过滤条件：
  // 1. metadata->>'source_url' IS NOT NULL
  // 2. filepath 在磁盘上不存在
  const recoverable: Array<{ id: string; filename: string; filepath: string; source_url: string; type: string }> = []

  for (const record of result.records) {
    if (record.is_deleted) continue

    let metadata: Record<string, unknown> | null = null
    if (typeof record.metadata === 'string') {
      try {
        metadata = JSON.parse(record.metadata)
      } catch {
        continue
      }
    } else if (record.metadata) {
      metadata = record.metadata as Record<string, unknown>
    }

    const sourceUrl = metadata?.source_url as string | undefined
    if (!sourceUrl) continue

    // 检查文件是否存在
    const exists = await fileExists(record.filepath)
    if (!exists) {
      recoverable.push({
        id: record.id,
        filename: record.filename,
        filepath: record.filepath,
        source_url: sourceUrl,
        type: record.type,
      })
    }
  }

  successResponse(res, {
    records: recoverable,
    total: recoverable.length,
  })
}))
```

- [ ] **步骤 2: 添加 POST /api/media/:id/recover 接口**

在 recoverable 接口之后添加：

```typescript
router.post('/:id/recover', validateParams(recoverMediaParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { id } = req.params
  const ownerId = buildOwnerFilter(req).params[0]

  const record = await db.getById(id, ownerId, true)
  if (!record) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  if (record.is_deleted) {
    errorResponse(res, 'Cannot recover a deleted record', 400)
    return
  }

  // 从 metadata 获取 source_url
  let metadata: Record<string, unknown> | null = null
  if (typeof record.metadata === 'string') {
    try {
      metadata = JSON.parse(record.metadata)
    } catch {
      errorResponse(res, 'Invalid metadata JSON', 500)
      return
    }
  } else if (record.metadata) {
    metadata = record.metadata as Record<string, unknown>
  }

  const sourceUrl = metadata?.source_url as string | undefined
  if (!sourceUrl) {
    errorResponse(res, 'No source_url in metadata - cannot recover', 400)
    return
  }

  // 检查文件是否已存在（理论上不该发生但需处理）
  const { fileExists } = await import('../lib/media-storage.js')
  const fileAlreadyExists = await fileExists(record.filepath)
  if (fileAlreadyExists) {
    successResponse(res, { message: 'File already exists', mediaId: id })
    return
  }

  // 从 source_url 下载
  try {
    const { saveFromUrl } = await import('../lib/media-storage.js')
    const { filepath, filename, size_bytes } = await saveFromUrl(
      sourceUrl,
      record.original_name || record.filename,
      record.type
    )

    // 如果 filepath 发生变化则更新记录
    if (filepath !== record.filepath) {
      await db.update(id, { filepath }, ownerId)
    }

    successResponse(res, {
      mediaId: id,
      filepath,
      filename,
      size_bytes,
      message: 'Recovered successfully',
    })
  } catch (error) {
    logger.error({ id, sourceUrl, error }, 'Failed to recover media')
    errorResponse(res, `Failed to recover: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
  }
}))
```

- [ ] **步骤 3: 添加 POST /api/media/recover-all 接口**

在单个恢复接口之后添加：

```typescript
router.post('/recover-all', asyncHandler(async (req, res) => {
  const db = getMediaService()
  const ownerFilter = buildOwnerFilter(req)
  const visibilityOwnerId = ownerFilter.ownerId

  // 获取所有有 source_url 的记录
  const result = await db.getAll({
    limit: 1000,
    offset: 0,
    visibilityOwnerId,
  })

  const { fileExists, saveFromUrl } = await import('../lib/media-storage.js')

  const recoverable: Array<{ id: string; error?: string }> = []
  const failed: Array<{ id: string; error: string }> = []

  for (const record of result.records) {
    if (record.is_deleted) continue

    let metadata: Record<string, unknown> | null = null
    if (typeof record.metadata === 'string') {
      try {
        metadata = JSON.parse(record.metadata)
      } catch {
        continue
      }
    } else if (record.metadata) {
      metadata = record.metadata as Record<string, unknown>
    }

    const sourceUrl = metadata?.source_url as string | undefined
    if (!sourceUrl) continue

    const exists = await fileExists(record.filepath)
    if (!exists) {
      recoverable.push({ id: record.id })
    }
  }

  // 恢复每一个
  for (const item of recoverable) {
    const record = result.records.find(r => r.id === item.id)
    if (!record) continue

    let metadata: Record<string, unknown> | null = null
    if (typeof record.metadata === 'string') {
      try {
        metadata = JSON.parse(record.metadata)
      } catch {
        failed.push({ id: item.id, error: 'Invalid metadata JSON' })
        continue
      }
    } else if (record.metadata) {
      metadata = record.metadata as Record<string, unknown>
    }

    const sourceUrl = metadata?.source_url as string | undefined
    if (!sourceUrl) {
      failed.push({ id: item.id, error: 'No source_url' })
      continue
    }

    try {
      const { filepath, filename, size_bytes } = await saveFromUrl(
        sourceUrl,
        record.original_name || record.filename,
        record.type
      )

      if (filepath !== record.filepath) {
        await db.update(item.id, { filepath })
      }
    } catch (error) {
      failed.push({
        id: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  successResponse(res, {
    total: recoverable.length + failed.length,
    recovered: recoverable.length - failed.length,
    failed,
  })
}))
```

- [ ] **步骤 4: 提交**

```bash
git add server/routes/media.ts
git commit -m "feat(media): add recovery endpoints for failed uploads"
```

---

## 任务 4: 前端 - 添加 API 客户端函数

**文件**:
- 修改: `src/lib/api/media.ts`

- [ ] **步骤 1: 添加恢复 API 函数**

在 `src/lib/api/media.ts` 末尾添加：

```typescript
export interface RecoverableMediaRecord {
  id: string
  filename: string
  filepath: string
  source_url: string
  type: MediaType
}

export interface RecoverableMediaResponse {
  success: boolean
  data: {
    records: RecoverableMediaRecord[]
    total: number
  }
}

export interface RecoverMediaResponse {
  success: boolean
  data: {
    mediaId: string
    filepath?: string
    filename?: string
    size_bytes?: number
    message?: string
  }
}

export interface RecoverAllMediaResponse {
  success: boolean
  data: {
    total: number
    recovered: number
    failed: Array<{ id: string; error: string }>
  }
}

export async function getRecoverableMedia(): Promise<RecoverableMediaResponse> {
  const response = await client.get('/media/recoverable')
  return response.data
}

export async function recoverMedia(id: string): Promise<RecoverMediaResponse> {
  const response = await client.post(`/media/${id}/recover`)
  return response.data
}

export async function recoverAllMedia(): Promise<RecoverAllMediaResponse> {
  const response = await client.post('/media/recover-all')
  return response.data
}
```

- [ ] **步骤 2: 提交**

```bash
git add src/lib/api/media.ts
git commit -m "feat(media): add client functions for recovery API"
```

---

## 任务 5: 前端 - 添加 Hook 函数

**文件**:
- 修改: `src/hooks/useMediaManagement.ts`

- [ ] **步骤 1: 导入新的恢复函数**

在顶部导入语句中添加：

```typescript
import {
  listMedia,
  deleteMedia as deleteMediaApi,
  getMediaDownloadUrl,
  batchDeleteMedia,
  batchDownloadMedia,
  updateMedia,
  toggleFavorite,
  togglePublic,
  batchTogglePublic,
  getRecoverableMedia,
  recoverMedia,
  recoverAllMedia,
  type RecoverableMediaRecord,
} from '@/lib/api/media'
```

- [ ] **步骤 2: 添加可恢复状态和处理函数**

在 `UseMediaManagementReturn` 接口中添加：

```typescript
  // 恢复状态
  recoverableRecords: RecoverableMediaRecord[]
  recoverableCount: number
  isLoadingRecoverable: boolean
  isRecovering: boolean
  recoveryDialogOpen: boolean
  setRecoveryDialogOpen: (open: boolean) => void
  fetchRecoverableRecords: () => Promise<void>
  handleRecover: (id: string) => Promise<void>
  handleRecoverAll: () => Promise<void>
```

- [ ] **步骤 3: 添加状态变量**

在 `useMediaManagement` 函数中添加：

```typescript
  // 恢复状态
  const [recoverableRecords, setRecoverableRecords] = useState<RecoverableMediaRecord[]>([])
  const [isLoadingRecoverable, setIsLoadingRecoverable] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false)
```

- [ ] **步骤 4: 添加处理函数**

在 `return` 语句之前添加：

```typescript
  const fetchRecoverableRecords = useCallback(async () => {
    setIsLoadingRecoverable(true)
    try {
      const response = await getRecoverableMedia()
      if (response.success) {
        setRecoverableRecords(response.data.records)
      }
    } catch (err) {
      console.error('Failed to fetch recoverable records:', err)
    } finally {
      setIsLoadingRecoverable(false)
    }
  }, [])

  const handleRecover = useCallback(async (id: string) => {
    setIsRecovering(true)
    try {
      await recoverMedia(id)
      toastSuccess('文件恢复成功')
      await fetchRecoverableRecords()
    } catch (err) {
      toastError(err instanceof Error ? err.message : '恢复失败')
    } finally {
      setIsRecovering(false)
    }
  }, [fetchRecoverableRecords])

  const handleRecoverAll = useCallback(async () => {
    setIsRecovering(true)
    try {
      const response = await recoverAllMedia()
      if (response.success) {
        toastSuccess(`批量恢复完成：成功 ${response.data.recovered}，失败 ${response.data.failed.length}`)
      }
      await fetchRecoverableRecords()
    } catch (err) {
      toastError(err instanceof Error ? err.message : '批量恢复失败')
    } finally {
      setIsRecovering(false)
    }
  }, [fetchRecoverableRecords])
```

- [ ] **步骤 5: 添加到返回对象**

在 return 语句中添加：

```typescript
    // 恢复状态
    recoverableRecords,
    recoverableCount: recoverableRecords.length,
    isLoadingRecoverable,
    isRecovering,
    recoveryDialogOpen,
    setRecoveryDialogOpen,
    fetchRecoverableRecords,
    handleRecover,
    handleRecoverAll,
```

- [ ] **步骤 6: 提交**

```bash
git add src/hooks/useMediaManagement.ts
git commit -m "feat(media): add recovery hooks to useMediaManagement"
```

---

## 任务 6: 前端 - 添加恢复 UI

**文件**:
- 修改: `src/pages/MediaManagement.tsx`

- [ ] **步骤 1: 在 PageHeader actions 中添加恢复按钮**

在刷新按钮之后添加：

```typescript
            {recoverableCount > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  fetchRecoverableRecords()
                  setRecoveryDialogOpen(true)
                }}
                className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                恢复失败上传 ({recoverableCount})
              </Button>
            )}
```

- [ ] **步骤 2: 导入 RecoverableRecordsDialog**

添加：

```typescript
import { RecoverableRecordsDialog } from '@/components/media/RecoverableRecordsDialog'
```

- [ ] **步骤 3: 添加对话框组件渲染**

在闭合的 `</div>` 之前添加：

```typescript
      <RecoverableRecordsDialog
        open={recoveryDialogOpen}
        onClose={() => setRecoveryDialogOpen(false)}
        records={recoverableRecords}
        isLoading={isLoadingRecoverable}
        isRecovering={isRecovering}
        onRecover={handleRecover}
        onRecoverAll={handleRecoverAll}
      />
```

- [ ] **步骤 4: 提交**

```bash
git add src/pages/MediaManagement.tsx
git commit -m "feat(media): add recovery UI to MediaManagement page"
```

---

## 任务 7: 创建 RecoverableRecordsDialog 组件

**文件**:
- 创建: `src/components/media/RecoverableRecordsDialog.tsx`

- [ ] **步骤 1: 创建对话框组件**

创建 `src/components/media/RecoverableRecordsDialog.tsx`：

```typescript
import { AlertCircle, Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import type { RecoverableMediaRecord } from '@/lib/api/media'
import { cn } from '@/lib/utils'

interface RecoverableRecordsDialogProps {
  open: boolean
  onClose: () => void
  records: RecoverableMediaRecord[]
  isLoading: boolean
  isRecovering: boolean
  onRecover: (id: string) => Promise<void>
  onRecoverAll: () => Promise<void>
}

export function RecoverableRecordsDialog({
  open,
  onClose,
  records,
  isLoading,
  isRecovering,
  onRecover,
  onRecoverAll,
}: RecoverableRecordsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            恢复失败的上传
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>没有需要恢复的文件</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.filename}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {record.source_url}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRecover(record.id)}
                      disabled={isRecovering}
                      className="ml-4"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      恢复
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {records.length > 1 && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={onRecoverAll}
                  disabled={isRecovering}
                >
                  {isRecovering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      恢复中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      恢复全部 ({records.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **步骤 2: 提交**

```bash
git add src/components/media/RecoverableRecordsDialog.tsx
git commit -m "feat(media): create RecoverableRecordsDialog component"
```

---

## 任务 8: 验证构建

- [ ] **步骤 1: 运行构建**

```bash
npm run build
```

预期: 构建应无错误完成

- [ ] **步骤 2: 运行测试**

```bash
npm run test -- --run
```

预期: 所有测试应通过

---

## 自检清单

1. **功能覆盖**:
   - ✅ GET /api/media/recoverable 接口
   - ✅ POST /api/media/:id/recover 接口
   - ✅ POST /api/media/recover-all 接口
   - ✅ 前端 API 客户端函数
   - ✅ 前端 hook 恢复状态
   - ✅ 媒体管理页面恢复 UI
   - ✅ 可恢复记录对话框组件

2. **占位符扫描**: 未发现占位符 - 所有代码完整

3. **类型一致性**:
   - MediaRecord 类型正确使用
   - RecoverableMediaRecord 接口正确定义
   - 处理函数类型正确
