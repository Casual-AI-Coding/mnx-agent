# 媒体公开功能设计文档

**日期**: 2026-04-13
**状态**: 已批准
**范围**: 媒体管理公开/取消公开功能

## 目标

为媒体管理页面添加公开/取消公开功能，允许用户将媒体记录公开，公开后的记录对所有能访问媒体管理菜单的用户可见。

### 核心需求

1. **数据库层**: 新增 `is_public` 字段到 `media_records` 表
2. **API 层**: 提供公开切换端点（单条 + 批量），修改查询逻辑支持公开记录可见
3. **前端层**: 三视图（Card/Table/Timeline）增加公开按钮，筛选栏增加"公开/私有"选项

## 设计决策

### 权限矩阵

| 记录类型 | 操作权限 | 可见范围 |
|----------|----------|----------|
| 有 owner_id 的记录 | 只有 owner 可公开/取消公开 | owner 可见私有，所有人可见公开 |
| 无 owner_id 的记录 | 只有 super 可公开/取消公开 | 所有用户可见公开记录 |
| user/pro 角色 | - | 自己的私有记录 + 所有公开记录 |
| admin/super 角色 | - | 所有记录 |

**理由**：
- 有 owner_id 的记录属于个人，只有 owner 有权控制公开状态
- 无 owner_id 的记录通常是系统生成或历史遗留，需要 super 权限管理
- 公开记录对所有有媒体菜单权限的用户可见，实现资源共享

---

## 数据库层设计

### 字段新增

```sql
-- 新增字段: is_public
ALTER TABLE media_records ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 新增索引（优化公开记录查询）
CREATE INDEX IF NOT EXISTS idx_media_records_is_public ON media_records(is_public);
CREATE INDEX IF NOT EXISTS idx_media_records_owner_public ON media_records(owner_id, is_public);
```

### 查询逻辑变更

**原逻辑**：用户只能看到自己 owner_id 的记录（admin/super 可看全部）

**新逻辑**：

```sql
-- user/pro 查询
SELECT * FROM media_records
WHERE is_deleted = false
  AND (
    (owner_id = :userId AND is_public = false)  -- 自己的私有记录
    OR is_public = true                          -- 所有公开记录
  )
ORDER BY created_at DESC

-- admin/super 查询（不变）
SELECT * FROM media_records
WHERE is_deleted = false
  -- 可选 is_public 篮选参数
ORDER BY created_at DESC
```

---

## API 层设计

### 新增端点

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| PATCH | `/api/media/:id/public` | 切换公开状态（单条） | owner 或 super |
| POST | `/api/media/batch/public` | 批量切换公开状态 | 仅 owner（自己的记录） |
| GET | `/api/media` | 列表查询（已修改） | 支持 `is_public` 筛选 |

### 单条切换端点详情

**PATCH `/api/media/:id/public`**

```typescript
// Request
PATCH /api/media/:id/public
Authorization: Bearer <token>

// Response (成功)
{
  "success": true,
  "data": {
    "mediaId": "xxx",
    "isPublic": true,
    "action": "published"  // 或 "unpublished"
  }
}

// Response (无权限)
{
  "success": false,
  "error": "无权限操作此记录"
}
```

**实现逻辑**：

```typescript
async togglePublic(mediaId: string, userId: string, userRole: string) {
  const record = await db.getById(mediaId)
  
  if (!record || record.is_deleted) {
    return { success: false, error: '记录不存在' }
  }
  
  // 权限校验
  if (record.owner_id) {
    // 有 owner_id → 只有 owner 能操作
    if (userId !== record.owner_id) {
      return { success: false, error: '无权限操作他人记录' }
    }
  } else {
    // 无 owner_id → 只有 super 能操作
    if (userRole !== 'super') {
      return { success: false, error: '需要超级管理员权限' }
    }
  }
  
  // 切换状态
  const newPublicState = !record.is_public
  await db.update(mediaId, { is_public: newPublicState })
  
  return {
    success: true,
    data: {
      mediaId,
      isPublic: newPublicState,
      action: newPublicState ? 'published' : 'unpublished'
    }
  }
}
```

### 批量切换端点详情

**POST `/api/media/batch/public`**

```typescript
// Request
POST /api/media/batch/public
Authorization: Bearer <token>
{
  "ids": ["id1", "id2", "id3"],
  "isPublic": true  // 目标状态
}

// Response
{
  "success": true,
  "data": {
    "succeeded": ["id1", "id2"],
    "failed": ["id3"],
    "succeededCount": 2,
    "failedCount": 1
  }
}
```

**实现逻辑**：

```typescript
async batchTogglePublic(ids: string[], isPublic: boolean, userId: string) {
  const results = { succeeded: [], failed: [] }
  
  for (const id of ids) {
    const record = await db.getById(id)
    
    // 只能操作自己的记录
    if (!record || record.owner_id !== userId) {
      results.failed.push(id)
      continue
    }
    
    await db.update(id, { is_public: isPublic })
    results.succeeded.push(id)
  }
  
  return {
    success: true,
    data: {
      ...results,
      succeededCount: results.succeeded.length,
      failedCount: results.failed.length
    }
  }
}
```

### 查询端点扩展

**GET `/api/media` 新增参数**：

```typescript
// 验证 schema 扩展
listMediaQuerySchema.extend({
  is_public: z.enum(['all', 'public', 'private']).optional().default('all')
})
```

**响应扩展**：

```typescript
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "xxx",
        "filename": "test.png",
        "type": "image",
        "is_public": true,     // 新增字段
        "owner_id": "user123", // 已有字段
        ...
      }
    ],
    "total": 100,
    "page": 1
  }
}
```

---

## 前端层设计

### 1. 筛选新增"公开/私有"选项

**位置**: `src/pages/MediaManagement.tsx` 顶部筛选栏

```tsx
// 新增筛选下拉
<Select value={publicFilter} onValueChange={setPublicFilter}>
  <SelectTrigger>
    <SelectValue placeholder="可见范围" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">全部</SelectItem>
    <SelectItem value="public">
      <Globe className="w-4 h-4 mr-1" />
      公开
    </SelectItem>
    <SelectItem value="private">
      <Lock className="w-4 h-4 mr-1" />
      私有
    </SelectItem>
  </SelectContent>
</Select>
```

---

### 2. PublicButton 组件

**文件**: `src/components/media/PublicButton.tsx`

```tsx
import { Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PublicButtonProps {
  mediaId: string
  isPublic: boolean
  isOwnRecord: boolean     // 是否自己的记录
  onToggle?: (mediaId: string) => void
  disabled?: boolean
}

export function PublicButton({ 
  mediaId, 
  isPublic, 
  isOwnRecord, 
  onToggle,
  disabled 
}) {
  // 其他人的公开记录：静态徽章
  if (!isOwnRecord) {
    if (isPublic) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Globe className="w-3 h-3 mr-1" />
          公开
        </Badge>
      )
    }
    return null  // 其他人的私有记录不显示
  }
  
  // 自己的记录：可点击按钮
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onToggle?.(mediaId)}
      disabled={disabled}
      className={cn(
        "hover:text-green-600",
        isPublic && "text-green-600"
      )}
      title={isPublic ? "取消公开" : "公开"}
    >
      {isPublic ? (
        <Globe className="w-4 h-4" />
      ) : (
        <Lock className="w-4 h-4" />
      )}
    </Button>
  )
}
```

---

### 3. 各视图集成位置

| 视图 | 文件 | 按钮位置 | 显示逻辑 |
|------|------|---------|----------|
| Card 视图 | `MediaCard.tsx` | 状态徽章区（右上角） | 自己的可点击，其他人的静态徽章 |
| Table 视图 | `MediaTableView.tsx` | 操作列 | 仅自己的显示可点击按钮 |
| Timeline 视图 | `TimelineItem.tsx` | 操作按钮行 | 仅自己的显示可点击按钮 |

**注入逻辑**：

```tsx
// 判断是否自己的记录
const isOwnRecord = !record.owner_id 
  ? (userRole === 'super')  // 无 owner_id，super 才算"自己的"
  : (userId === record.owner_id)

<PublicButton
  mediaId={record.id}
  isPublic={record.is_public}
  isOwnRecord={isOwnRecord}
  onToggle={handleTogglePublic}
/>
```

---

### 4. 批量操作集成

**位置**: `MediaManagement.tsx` 批量操作栏

```tsx
// 新增批量公开按钮（仅当选中记录都是自己的时可用）
const canBatchPublic = selectedRecords.every(r => r.owner_id === userId)

<Button
  variant="outline"
  onClick={handleBatchTogglePublic}
  disabled={!canBatchPublic || selectedIds.length === 0}
>
  <Globe className="w-4 h-4 mr-2" />
  批量公开
</Button>
```

---

### 5. API 调用扩展

```typescript
// src/lib/api/media.ts
export async function togglePublic(mediaId: string) {
  return apiClient.patch(`/media/${mediaId}/public`)
}

export async function batchTogglePublic(ids: string[], isPublic: boolean) {
  return apiClient.post('/media/batch/public', { ids, isPublic })
}

// src/hooks/useMediaManagement.ts
const handleTogglePublic = async (mediaId: string) => {
  // 乐观更新
  const prevValue = records.find(r => r.id === mediaId)?.is_public
  setRecords(prev => prev.map(r =>
    r.id === mediaId ? { ...r, is_public: !prevValue } : r
  ))
  
  try {
    const res = await togglePublic(mediaId)
    // 同步服务器值
    setRecords(prev => prev.map(r =>
      r.id === mediaId ? { ...r, is_public: res.data.isPublic } : r
    ))
    toast.success(res.data.action === 'published' ? '已公开' : '已取消公开')
  } catch (err) {
    // 回滚
    setRecords(prev => prev.map(r =>
      r.id === mediaId ? { ...r, is_public: prevValue } : r
    ))
    toast.error('操作失败')
  }
}
```

---

### 6. 类型扩展

```typescript
// packages/shared-types/entities/media.ts
interface MediaRecord {
  // ...现有字段
  is_public: boolean  // 新增
  owner_id?: string   // 已有（确认存在）
}
```

---

## 实现步骤

### 后端

1. **数据库迁移** - 新增 `is_public` 字段 + 索引
2. **类型定义** - `MediaRecord` 接口添加 `is_public` 字段
3. **Service** - 新增 `togglePublic`, `batchTogglePublic` 业务逻辑
4. **Routes** - 新增 `PATCH /:id/public`, `POST /batch/public` 端点
5. **查询修改** - `GET /media` 修改 WHERE 条件支持公开可见
6. **Validation** - 扩展 `listMediaQuerySchema` 新增 `is_public` 参数

### 前端

1. **类型扩展** - `MediaRecord` 添加 `is_public` 字段
2. **API 扩展** - 新增 `togglePublic`, `batchTogglePublic` 函数
3. **组件** - 创建 `PublicButton` 组件
4. **视图改造** - Card/Table/Timeline 集成公开按钮
5. **筛选** - MediaManagement 页面添加"公开/私有"选项
6. **批量操作** - 新增批量公开按钮
7. **Hook 改造** - `useMediaManagement` 添加公开切换逻辑

---

## 测试计划

### 后端测试

| 测试项 | 预期结果 |
|--------|---------|
| user 公开自己的记录 | 200，is_public=true |
| user 私有自己的记录 | 200，is_public=false |
| user 操作他人记录 | 403 Forbidden |
| user 操作无 owner_id 记录 | 403 Forbidden |
| super 操作无 owner_id 记录 | 200 |
| admin 查询所有记录 | 返回全部 |
| user 查询公开记录 | 返回自己的私有 + 所有公开 |
| 批量公开自己的记录 | 200，返回成功数量 |
| 批量公开含他人记录 | 部分成功/失败返回 |

### 前端测试

| 测试项 | 预期结果 |
|--------|---------|
| PublicButton 渲染（自己的） | 可点击，显示 Globe/Lock 图标 |
| PublicButton 渲染（他人的公开） | 静态徽章，不可点击 |
| PublicButton 渲染（他人的私有） | 不显示 |
| 切换公开状态 | UI 立即更新，API 调用成功 |
| API 失败回滚 | UI 回滚，显示错误 toast |
| 篮选公开记录 | 只显示 is_public=true 的记录 |
| 批量公开（含他人） | 按钮禁用 |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 公开记录泄露敏感信息 | 提示用户公开后果，确认后操作 |
| 批量公开含他人记录 | 前端禁用按钮，后端逐条校验 |
| 公开记录过多影响性能 | 索引优化，分页查询 |
| 权限判断错误 | 详细测试权限矩阵所有场景 |

---

## 参考

- 现有收藏功能: `docs/superpowers/specs/2026-04-11-media-favorites-design.md`
- 数据隔离模式: `server/middleware/data-isolation.ts`
- 媒体查询模式: `server/routes/media.ts`
- FavoriteButton 组件: `src/components/media/FavoriteButton.tsx`