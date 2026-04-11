# 媒体收藏功能设计文档

**日期**: 2026-04-11
**状态**: 已批准
**范围**: 媒体管理收藏功能

## 目标

为媒体管理页面添加收藏功能，允许用户对媒体文件进行收藏/取消收藏操作，并筛选已收藏的媒体。

### 核心需求

1. **数据库层**: 新增 `user_media_favorites` 表，支持软删除（复用同一条记录）
2. **API 层**: 提供收藏切换端点，扩展媒体列表筛选参数
3. **前端层**: 三视图（Card/Table/Timeline）增加收藏按钮，筛选栏增加"已收藏"选项

## 设计决策

### 收藏范围

**用户各自收藏**：每个用户拥有独立的收藏列表，用户 A 的收藏不影响用户 B。

### 存储方案

**关联表设计**：新建 `user_media_favorites` 表，不依赖 `media_records.owner_id`。

**理由**：
- 已有数据存在 `owner_id` 为空的情况（管理员创建、Workflow 执行、Restore Script）
- 独立表设计兼容历史数据，用户可收藏任何媒体记录
- 支持软删除模式，复用同一条记录

---

## 数据库层设计

### 表结构

```sql
-- 新增表: user_media_favorites
CREATE TABLE user_media_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  media_id VARCHAR(36) NOT NULL REFERENCES media_records(id),
  is_deleted BOOLEAN DEFAULT FALSE,          -- 软删除标记
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_media UNIQUE(user_id, media_id)  -- 防止重复记录
);

-- 索引
CREATE INDEX idx_favorites_user_active ON user_media_favorites(user_id, is_deleted);
CREATE INDEX idx_favorites_media ON user_media_favorites(media_id);
```

### 操作逻辑

| 操作 | 条件 | SQL 行为 |
|------|------|---------|
| 首次收藏 | 无记录存在 | INSERT (is_deleted = false) |
| 取消收藏 | 存在 + is_deleted = false | UPDATE is_deleted = true, updated_at = now() |
| 再次收藏 | 存在 + is_deleted = true | UPDATE is_deleted = false, updated_at = now() |
| 查询收藏列表 | 用户筛选 | WHERE user_id = ? AND is_deleted = false |
| 查询收藏状态 | 媒体详情 | SELECT is_deleted FROM ... WHERE user_id = ? AND media_id = ? |

### 媒体列表查询（附带收藏状态）

```sql
SELECT m.*, 
  CASE WHEN f.is_deleted = false THEN true ELSE false END as is_favorite
FROM media_records m
LEFT JOIN user_media_favorites f 
  ON f.media_id = m.id AND f.user_id = ?
WHERE ...  -- 其他筛选条件
```

### 收藏筛选查询

```sql
SELECT m.*
FROM media_records m
INNER JOIN user_media_favorites f 
  ON f.media_id = m.id 
  AND f.user_id = ? 
  AND f.is_deleted = false
WHERE m.is_deleted = false
ORDER BY f.created_at DESC
```

---

## API 层设计

### 新增端点

| 方法 | 路径 | 描述 |
|------|------|------|
| PATCH | `/api/media/:id/favorite` | 切换收藏状态 |

### 端点详情

**PATCH `/api/media/:id/favorite`**

```typescript
// Request
PATCH /api/media/:id/favorite
Authorization: Bearer <token>

// Response
{
  "success": true,
  "data": {
    "mediaId": "xxx",
    "isFavorite": true,
    "action": "added"  // 或 "removed"
  }
}
```

### 实现逻辑

```typescript
async toggleFavorite(mediaId: string, userId: string) {
  const existing = await db.findFavorite(userId, mediaId)
  
  if (!existing) {
    // 首次收藏：INSERT
    await db.insertFavorite(userId, mediaId, false)
    return { isFavorite: true, action: 'added' }
  }
  
  if (existing.is_deleted) {
    // 曾取消过：恢复收藏
    await db.updateFavorite(existing.id, { is_deleted: false })
    return { isFavorite: true, action: 'added' }
  }
  
  // 已收藏：取消收藏（软删除）
  await db.updateFavorite(existing.id, { is_deleted: true })
  return { isFavorite: false, action: 'removed' }
}
```

### 扩展端点

**GET `/api/media` 新增参数**

```typescript
// 验证 schema 扩展
listMediaQuerySchema.extend({
  favorite: z.boolean().optional()  // 筛选已收藏
})
```

**响应扩展**

```typescript
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "xxx",
        "filename": "test.png",
        "type": "image",
        "is_favorite": true,  // 新增字段
        ...
      }
    ],
    "total": 100,
    "page": 1
  }
}
```

### Repository 新增方法

```typescript
// server/repositories/media-repository.ts
interface FavoriteRecord {
  id: number
  user_id: number
  media_id: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

async findFavorite(userId: number, mediaId: string): Promise<FavoriteRecord | null>
async insertFavorite(userId: number, mediaId: string, isDeleted: boolean): Promise<void>
async updateFavorite(id: number, data: { is_deleted: boolean }): Promise<void>
```

---

## 前端层设计

### 1. 筛选 Tab 新增"已收藏"

**位置**: `src/pages/MediaManagement/MediaManagement.tsx` 顶部筛选栏

```tsx
// 当前 Tabs: 全部 | 音频 | 图片 | 视频 | 音乐
// 新增 Tab: 已收藏 (带星形图标)

<Tabs value={activeTab}>
  <TabsList>
    <TabsTrigger value="all">全部</TabsTrigger>
    <TabsTrigger value="audio">音频</TabsTrigger>
    <TabsTrigger value="image">图片</TabsTrigger>
    <TabsTrigger value="video">视频</TabsTrigger>
    <TabsTrigger value="music">音乐</TabsTrigger>
    <TabsTrigger value="favorite">
      <Star className="w-4 h-4 mr-1" />
      已收藏
    </TabsTrigger>
  </TabsList>
</Tabs>
```

**切换逻辑**:
- 点击"已收藏" → 设置 `filter.favorite = true` → 调用 API
- 点击其他 Tab → 清除 `filter.favorite` → 恢复正常筛选

---

### 2. 收藏按钮组件

**文件**: `src/components/media/FavoriteButton.tsx`

```tsx
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  mediaId: string
  isFavorite: boolean
  onToggle: (mediaId: string) => void
}

export function FavoriteButton({ mediaId, isFavorite, onToggle }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onToggle(mediaId)}
      className={cn(
        "hover:text-yellow-500",
        isFavorite && "text-yellow-500"
      )}
    >
      {isFavorite ? (
        <Star className="w-4 h-4 fill-current" />
      ) : (
        <Star className="w-4 h-4" />
      )}
    </Button>
  )
}
```

---

### 3. 各视图集成位置

| 视图 | 文件 | 按钮位置 |
|------|------|---------|
| Card 视图 | `MediaCard.tsx` | 操作栏右侧，紧挨删除按钮 |
| Table 视图 | `MediaTableView.tsx` | 操作列，预览/下载/删除按钮旁边 |
| Timeline 视图 | `TimelineItem.tsx` | 操作按钮行，与其他按钮并排 |

---

### 4. API 调用扩展

```typescript
// src/lib/api/media.ts
export const toggleFavorite = async (mediaId: string) => {
  return apiClient.patch(`/media/${mediaId}/favorite`)
}

// src/hooks/useMediaManagement.ts
const handleToggleFavorite = async (mediaId: string) => {
  const result = await toggleFavorite(mediaId)
  setItems(prev => prev.map(item => 
    item.id === mediaId 
      ? { ...item, is_favorite: result.data.isFavorite }
      : item
  ))
}
```

---

### 5. 类型扩展

```typescript
// packages/shared-types/entities/media.ts
interface MediaRecord {
  // ...现有字段
  is_favorite?: boolean  // 新增
}
```

---

## 实现步骤

### 后端

1. **数据库迁移** - 创建 `user_media_favorites` 表 + 索引
2. **类型定义** - 新增 `FavoriteRecord` 接口
3. **Repository** - 新增 `findFavorite`, `insertFavorite`, `updateFavorite` 方法
4. **Service** - 新增 `toggleFavorite` 业务逻辑
5. **Routes** - 新增 `PATCH /:id/favorite` 端点，扩展 GET 端点筛选参数
6. **Validation** - 扩展 `listMediaQuerySchema`

### 前端

1. **类型扩展** - `MediaRecord` 添加 `is_favorite` 字段
2. **API 扩展** - 新增 `toggleFavorite` 调用函数
3. **组件** - 创建 `FavoriteButton` 组件
4. **视图改造** - Card/Table/Timeline 集成收藏按钮
5. **筛选 Tab** - MediaManagement 页面添加"已收藏"选项
6. **Hook 改造** - `useMediaManagement` 添加收藏切换逻辑

---

## 测试计划

### 功能测试

| 测试项 | 预期结果 |
|--------|---------|
| 首次收藏 | 数据库新增记录 (is_deleted = false) |
| 取消收藏 | 记录更新 (is_deleted = true) |
| 再次收藏 | 记录更新 (is_deleted = false)，复用同一条记录 |
| 筛选"已收藏" | 只显示 is_deleted = false 的媒体 |
| 收藏按钮状态 | 已收藏：实心金色星；未收藏：空心星 |
| 多视图一致性 | Card/Table/Timeline 收藏状态一致 |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 媒体删除后收藏记录残留 | 收藏查询 INNER JOIN media_records，自动排除已删除媒体 |
| 大量收藏时查询性能 | 使用索引 `idx_favorites_user_active` |
| 并发收藏/取消收藏 | UNIQUE 约束 + 事务保护 |

---

## 参考

- 现有数据隔离模式: `server/middleware/data-isolation.ts`
- 现有媒体查询模式: `server/repositories/media-repository.ts`
- 现有筛选 Tab 模式: `src/pages/MediaManagement/MediaManagement.tsx`