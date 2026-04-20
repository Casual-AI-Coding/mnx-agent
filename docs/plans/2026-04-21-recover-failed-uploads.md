# 恢复上传失败文件功能 — 重新设计

**问题**: 之前的方案错误地基于 `metadata.source_url` 查找"有记录但文件丢失"的媒体记录。实际需求是：找到成功调用了外部 API 但没有创建媒体记录的执行记录，从 API 响应中提取资源 URL，重建媒体记录和下载文件。

**核心场景**:
1. 外部 API 调用成功（MiniMax 生成图片、音乐等），API 返回资源 URL
2. 后续的"保存到数据库/下载文件"步骤失败（网络错误、磁盘空间等）
3. 结果：`task_queue.result` 或 `execution_log_details.output_result` 中有完整的 API 响应（包含 URL），但 `media_records` 表中没有对应记录
4. 恢复：从执行记录中提取 URL，创建媒体记录 + 下载文件

**技术栈**: Express routes, PostgreSQL JSONB 查询, Zod validation, axios, React hooks

---

## 数据流分析

### 资源 URL 在 API 响应中的位置

| 任务类型 | 响应字段 | 示例 |
|---------|---------|------|
| image_generation | `result.data.image_urls[0]` | `["https://..."]` |
| voice_sync/async | `result.data.audio_url` | `"https://..."` |
| music_generation | `result.data.audio_url` | `"https://..."` |
| video_generation | `result.data.video_url` | `"https://..."` |

### 两个数据源

1. **`task_queue`**: 直接任务执行，`result JSONB` 存储 API 响应，`task_type` 标识类型
2. **`execution_log_details`**: 工作流节点执行，`output_result JSONB` 存储 API 响应，`service_name` + `method_name` 标识类型

### 关联方式

- `task_queue.id` → `media_records.task_id`（直接关联）
- `execution_log_details` → 无直接关联，需要通过 `log_id` → `execution_logs.job_id` → `cron_jobs` 间接关联

---

## API 设计

### GET /api/media/recoverable

**功能**: 查找所有"成功调用了外部 API 但没有对应媒体记录"的执行记录

**返回数据**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "source": "task_queue",
        "sourceId": "task-uuid-123",
        "resourceType": "image",
        "resourceUrl": "https://...",
        "taskType": "image_generation",
        "createdAt": "2026-04-21T...",
        "metadata": { "prompt": "...", "model": "..." }
      }
    ],
    "total": 5
  }
}
```

**查询逻辑**:
```sql
-- task_queue: 找已完成任务但没有对应媒体记录的
SELECT tq.*
FROM task_queue tq
LEFT JOIN media_records mr ON mr.task_id = tq.id
WHERE tq.status = 'completed'
  AND tq.result IS NOT NULL
  AND mr.id IS NULL
  AND (
    tq.result->'data'->'image_urls' IS NOT NULL
    OR tq.result->'data'->>'audio_url' IS NOT NULL
    OR tq.result->'data'->>'video_url' IS NOT NULL
  )
```

对于 `execution_log_details`，类似逻辑但用 `service_name` 过滤 MiniMax 调用。

### POST /api/media/recover-from-task/:taskId

**功能**: 从 task_queue 记录恢复媒体记录

**流程**:
1. 查找 task_queue 记录
2. 解析 `result` JSONB 提取资源 URL
3. 从 URL 下载文件到本地
4. 创建 media_records 条目
5. 返回新创建的媒体记录

### POST /api/media/recover-from-log/:logDetailId

**功能**: 从 execution_log_details 记录恢复媒体记录

**流程**: 类似上面的，但数据源不同

---

## 文件变更清单

### 后端

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `server/routes/media.ts` | 修改 | 重写 `/recoverable` 和 `/:id/recover` 端点，新增恢复端点 |
| `server/services/domain/media.service.ts` | 修改 | 新增恢复相关业务逻辑 |
| `server/repositories/log-repository.ts` | 修改 | 新增查询孤立执行记录方法 |
| `server/repositories/task-queue-repository.ts` | 修改 | 新增查询孤立任务方法（如果不存在需创建） |
| `server/validation/media-schemas.ts` | 修改 | 新增恢复相关 schema |

### 前端

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/lib/api/media.ts` | 修改 | 更新恢复 API 类型定义和函数 |
| `src/hooks/useMediaManagement.ts` | 修改 | 更新恢复相关 hook |
| `src/pages/MediaManagement.tsx` | 修改 | 更新恢复 UI |
| `src/components/media/RecoverableRecordsDialog.tsx` | 修改/重写 | 显示孤立执行记录而非缺失文件记录 |

---

## 实现步骤

### 任务 1: 后端 — 新增 repository 查询方法

在 task_queue repository 和 log repository 中新增查找孤立记录的方法：

1. **`server/repositories/task-queue-repository.ts`**: 新增 `findOrphanedTasks(ownerId?)` — 查找 status='completed' 且有资源 URL 但无对应 media_record 的任务
2. **`server/repositories/log-repository.ts`**: 新增 `findOrphanedLogDetails(ownerId?)` — 查找 MiniMax API 调用成功但无对应 media_record 的执行日志详情
3. 新增辅助函数 `extractResourceUrl(result, taskType)` — 从 API 响应中提取资源 URL

### 任务 2: 后端 — 重写 `/recoverable` 端点

替换当前基于 `media_records + metadata.source_url` 的逻辑：

1. 查询 task_queue 中的孤立任务
2. 查询 execution_log_details 中的孤立执行记录
3. 合并结果，提取资源 URL 和元数据
4. 返回结构化的可恢复列表

### 任务 3: 后端 — 新增恢复端点

1. `POST /api/media/recover-from-task/:taskId` — 从 task_queue 记录恢复
2. `POST /api/media/recover-from-log/:logDetailId` — 从 execution_log_detail 记录恢复
3. 保留 `POST /api/media/:id/recover` 用于已有记录的文件重新下载（向后兼容）

### 任务 4: 后端 — 验证 schema

更新 `server/validation/media-schemas.ts`:
- 新增 `recoverFromTaskParamsSchema`
- 新增 `recoverFromLogParamsSchema`

### 任务 5: 前端 — 更新 API 客户端

更新 `src/lib/api/media.ts`:
- 新增 `RecoverableItem` 类型（不再基于 media record，而是基于执行记录）
- 新增 `getRecoverableMedia()` 返回孤立执行记录
- 新增 `recoverFromTask(taskId)` 和 `recoverFromLog(logDetailId)` 函数

### 任务 6: 前端 — 更新 hook 和 UI

1. `src/hooks/useMediaManagement.ts` — 更新恢复状态管理
2. `src/components/media/RecoverableRecordsDialog.tsx` — 重写为展示执行记录
3. `src/pages/MediaManagement.tsx` — 更新恢复按钮和对话框

---

## 与旧方案的关键差异

| 方面 | 旧方案（错误） | 新方案 |
|------|--------------|--------|
| 数据源 | `media_records` 中文件缺失的记录 | `task_queue` / `execution_log_details` 中无对应媒体记录的执行记录 |
| 恢复依据 | `metadata.source_url` | API 响应中的资源 URL (`image_urls`, `audio_url` 等) |
| 恢复操作 | 重新下载文件 | 创建媒体记录 + 下载文件 |
| 核心场景 | 有记录但文件丢了 | API 成功但记录没创建 |