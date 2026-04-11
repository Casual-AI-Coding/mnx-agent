# Media Favorites 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为媒体管理添加收藏功能，支持用户各自收藏、软删除复用、三视图收藏按钮和"已收藏"筛选。

**Architecture:** 新建 `user_media_favorites` 关联表（软删除模式），独立于 `owner_id`。API 提供 toggle 端点，前端三视图集成收藏按钮。

**Tech Stack:** PostgreSQL, Express, TypeScript, React, Zustand

---

## File Structure

### 后端新增/修改

| 文件 | 责责 |
|------|------|
| `server/database/migrations-async.ts` | 新增 migration_025 创建 favorites 表 |
| `packages/shared-types/entities/media.ts` | 新增 `FavoriteRecord` 类型，扩展 `MediaRecord.is_favorite` |
| `server/database/types.ts` | 导出 `FavoriteRecord` 类型 |
| `server/repositories/media-repository.ts` | 新增 `findFavorite`, `insertFavorite`, `updateFavorite`, `toggleFavorite` |
| `server/services/domain/media.service.ts` | 新增 `toggleFavorite` 业务方法 |
| `server/routes/media.ts` | 新增 `PATCH /:id/favorite` 端点，扩展 GET 端点筛选 |
| `server/validation/media-schemas.ts` | 扩展 `listMediaQuerySchema` 添加 `favorite` 参数 |

### 前端新增/修改

| 文件 | 责责 |
|------|------|
| `src/lib/api/media.ts` | 新增 `toggleFavorite` API 函数 |
| `src/components/media/FavoriteButton.tsx` | 新建收藏按钮组件 |
| `src/lib/constants/media.tsx` | 新增"已收藏"Tab 定义 |
| `src/hooks/useMediaManagement.ts` | 新增 `handleToggleFavorite` 和收藏筛选逻辑 |
| `src/components/media/MediaCard.tsx` | 集成 FavoriteButton |
| `src/components/media/MediaTableView.tsx` | 集成 FavoriteButton |
| `src/components/media/TimelineItem.tsx` | 集成 FavoriteButton |

---

## Task 1: 数据库迁移 - 创建 favorites 表

**Files:**
- Modify: `server/database/migrations-async.ts:503-510` (追加新迁移)

- [ ] **Step 1: 在 migrations 数组末尾追加新迁移**

```typescript
// server/database/migrations-async.ts 在 migration_024 之后追加

{
  id: 25,
  name: 'migration_025_media_favorites',
  sql: `
    CREATE TABLE IF NOT EXISTS user_media_favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      media_id VARCHAR(36) NOT NULL REFERENCES media_records(id),
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_media UNIQUE(user_id, media_id)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_user_active ON user_media_favorites(user_id, is_deleted);
    CREATE INDEX IF NOT EXISTS idx_favorites_media ON user_media_favorites(media_id);
  `,
},
```

- [ ] **Step 2: 运行服务器触发迁移**

```bash
node scripts/dev.js restart
# 或 npm run dev:full
```

Expected: 服务器启动时自动执行迁移，表创建成功

- [ ] **Step 3: 验证迁移执行**

```bash
# 连接数据库验证表存在
psql -h localhost -U mnx_agent_server -d mnx_agent -c "\d user_media_favorites"
```

Expected: 显示表结构包含 id, user_id, media_id, is_deleted, created_at, updated_at

- [ ] **Step 4: Commit**

```bash
git add server/database/migrations-async.ts
git commit -m "feat: add user_media_favorites table migration"
```

---

## Task 2: 类型定义 - FavoriteRecord 和 is_favorite

**Files:**
- Modify: `packages/shared-types/entities/media.ts:7-22`
- Modify: `server/database/types.ts` (新增导出)

- [ ] **Step 1: 扩展 MediaRecord 接口添加 is_favorite**

```typescript
// packages/shared-types/entities/media.ts

export interface MediaRecord {
  id: string
  filename: string
  original_name: string | null
  filepath: string
  type: MediaType
  mime_type: string | null
  size_bytes: number
  source: MediaSource | null
  task_id: string | null
  metadata: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_favorite?: boolean  // 新增：当前用户收藏状态
}

// 新增 FavoriteRecord 接口
export interface FavoriteRecord {
  id: number
  user_id: number
  media_id: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface FavoriteRecordRow {
  id: number
  user_id: number
  media_id: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: 在 server/database/types.ts 导出 FavoriteRecord**

```typescript
// server/database/types.ts 在文件末尾追加

export type {
  FavoriteRecord,
  FavoriteRecordRow,
} from '@mnx/shared-types/entities'
```

- [ ] **Step 3: 验证类型编译**

```bash
npm run build
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/entities/media.ts server/database/types.ts
git commit -m "feat: add FavoriteRecord type and is_favorite field"
```

---

## Task 3: Repository - 收藏方法实现

**Files:**
- Modify: `server/repositories/media-repository.ts`

- [ ] **Step 1: 导入 FavoriteRecord 类型**

```typescript
// server/repositories/media-repository.ts 在顶部 import 区域添加

import type {
  MediaRecord,
  MediaRecordRow,
  CreateMediaRecord,
  FavoriteRecord,
  FavoriteRecordRow,
} from '../database/types.js'
```

- [ ] **Step 2: 新增 findFavorite 方法**

```typescript
// server/repositories/media-repository.ts 在类末尾添加

async findFavorite(userId: number, mediaId: string): Promise<FavoriteRecord | null> {
  const rows = await this.conn.query<FavoriteRecordRow>(
    `SELECT id, user_id, media_id, is_deleted, created_at, updated_at
     FROM user_media_favorites
     WHERE user_id = $1 AND media_id = $2`,
    [userId, mediaId]
  )
  return rows.length > 0 ? rows[0] : null
}
```

- [ ] **Step 3: 新增 insertFavorite 方法**

```typescript
// server/repositories/media-repository.ts

async insertFavorite(userId: number, mediaId: string): Promise<FavoriteRecord> {
  const now = toISODate()
  await this.conn.execute(
    `INSERT INTO user_media_favorites (user_id, media_id, is_deleted, created_at, updated_at)
     VALUES ($1, $2, FALSE, $3, $3)`,
    [userId, mediaId, now]
  )
  const result = await this.findFavorite(userId, mediaId)
  return result!
}
```

- [ ] **Step 4: 新增 updateFavorite 方法**

```typescript
// server/repositories/media-repository.ts

async updateFavorite(id: number, isDeleted: boolean): Promise<void> {
  const now = toISODate()
  await this.conn.execute(
    `UPDATE user_media_favorites
     SET is_deleted = $1, updated_at = $2
     WHERE id = $3`,
    [isDeleted, now, id]
  )
}
```

- [ ] **Step 5: 新增 toggleFavorite 方法（核心逻辑）**

```typescript
// server/repositories/media-repository.ts

async toggleFavorite(userId: number, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
  const existing = await this.findFavorite(userId, mediaId)
  
  if (!existing) {
    // 首次收藏
    await this.insertFavorite(userId, mediaId)
    return { isFavorite: true, action: 'added' }
  }
  
  if (existing.is_deleted) {
    // 恢复收藏
    await this.updateFavorite(existing.id, false)
    return { isFavorite: true, action: 'added' }
  }
  
  // 取消收藏（软删除）
  await this.updateFavorite(existing.id, true)
  return { isFavorite: false, action: 'removed' }
}
```

- [ ] **Step 6: 修改 getAll 方法支持收藏筛选和 is_favorite 字段**

```typescript
// server/repositories/media-repository.ts 修改 MediaListOptions

export interface MediaListOptions {
  type?: string
  source?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
  ownerId?: string
  favorite?: boolean      // 新增
  favoriteUserId?: number // 新增：用于筛选和状态查询
}

// 修改 getAll 方法
async getAll(options: MediaListOptions): Promise<{ records: MediaRecord[]; total: number }> {
  // ... 原有查询逻辑
  // 在 SELECT 和 WHERE 部分添加收藏相关逻辑
  
  // 如果需要收藏状态，LEFT JOIN favorites 表
  let selectClause = `SELECT m.*`
  let joinClause = ''
  
  if (options.favoriteUserId) {
    selectClause += `, CASE WHEN f.is_deleted = FALSE THEN TRUE ELSE FALSE END as is_favorite`
    joinClause = `LEFT JOIN user_media_favorites f ON f.media_id = m.id AND f.user_id = ${options.favoriteUserId}`
  }
  
  // 如果筛选收藏，改为 INNER JOIN
  if (options.favorite && options.favoriteUserId) {
    joinClause = `INNER JOIN user_media_favorites f ON f.media_id = m.id AND f.user_id = ${options.favoriteUserId} AND f.is_deleted = FALSE`
  }
  
  // ... 构建 SQL 并执行
}
```

- [ ] **Step 7: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 8: Commit**

```bash
git add server/repositories/media-repository.ts
git commit -m "feat: add favorite methods to MediaRepository"
```

---

## Task 4: Service - 收藏业务方法

**Files:**
- Modify: `server/services/domain/media.service.ts`
- Modify: `server/services/domain/interfaces/index.js` (接口定义)

- [ ] **Step 1: 在 IMediaService 接口添加方法签名**

```typescript
// server/services/domain/interfaces/media.ts (如果存在，或创建)

interface IMediaService {
  // ... 现有方法
  toggleFavorite(userId: number, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }>
}
```

- [ ] **Step 2: 在 MediaService 类实现 toggleFavorite**

```typescript
// server/services/domain/media.service.ts 在类末尾添加

async toggleFavorite(userId: number, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
  return this.db.toggleFavorite(userId, mediaId)
}
```

- [ ] **Step 3: 在 DatabaseService 添加代理方法**

```typescript
// server/database/service-async.ts 在类中添加

async toggleFavorite(userId: number, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
  return this.mediaRepo.toggleFavorite(userId, mediaId)
}
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add server/services/domain/media.service.ts server/database/service-async.ts
git commit -m "feat: add toggleFavorite to MediaService and DatabaseService"
```

---

## Task 5: Validation - 扩展筛选参数

**Files:**
- Modify: `server/validation/media-schemas.ts`

- [ ] **Step 1: 扩展 listMediaQuerySchema 添加 favorite 参数**

```typescript
// server/validation/media-schemas.ts

export const listMediaQuerySchema = z.object({
  type: mediaTypeEnum.optional(),
  source: mediaSourceEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  favorite: z.coerce.boolean().optional(), // 新增：筛选已收藏
})
```

- [ ] **Step 2: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add server/validation/media-schemas.ts
git commit -m "feat: add favorite filter to listMediaQuerySchema"
```

---

## Task 6: Routes - PATCH /:id/favorite 端点

**Files:**
- Modify: `server/routes/media.ts`

- [ ] **Step 1: 在 GET / 端点添加收藏筛选和状态查询**

```typescript
// server/routes/media.ts 修改 router.get('/') 处理器

router.get('/', validateQuery(listMediaQuerySchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { type, source, includeDeleted, favorite } = req.query
  const { page, limit, offset } = getPaginationParams(req.query)
  const ownerId = buildOwnerFilter(req).params[0]
  
  // 从 JWT 获取用户 ID 用于收藏状态
  const userId = req.user?.userId ? parseInt(req.user.userId, 10) : undefined
  
  const result = await db.getAll({
    type: type as any,
    source: source as any,
    limit,
    offset,
    includeDeleted: !!includeDeleted,
    ownerId,
    favorite: favorite === true,
    favoriteUserId: userId,
  })

  successResponse(res, createPaginatedResponse(result.records, result.total, page, limit))
}))
```

- [ ] **Step 2: 新增 PATCH /:id/favorite 端点**

```typescript
// server/routes/media.ts 在 router.put('/:id') 之后添加

router.patch('/:id/favorite', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  
  // 验证媒体存在
  const record = await db.getById(req.params.id)
  if (!record) {
    errorResponse(res, 'Media record not found', 404)
    return
  }
  
  // 获取用户 ID
  const userId = parseInt(req.user!.userId, 10)
  
  // 切换收藏状态
  const result = await db.toggleFavorite(userId, req.params.id)
  
  successResponse(res, {
    mediaId: req.params.id,
    isFavorite: result.isFavorite,
    action: result.action,
  })
}))
```

- [ ] **Step 3: 验证编译和服务器启动**

```bash
npm run build
node scripts/dev.js restart
```

Expected: 无错误，服务器正常启动

- [ ] **Step 4: Commit**

```bash
git add server/routes/media.ts
git commit -m "feat: add PATCH /:id/favorite endpoint and favorite filter"
```

---

## Task 7: 前端 API - toggleFavorite 函数

**Files:**
- Modify: `src/lib/api/media.ts`

- [ ] **Step 1: 扩展 MediaRecord 接口添加 is_favorite**

```typescript
// src/lib/api/media.ts

export interface MediaRecord {
  id: string
  filename: string
  original_name: string | null
  filepath: string
  type: MediaType
  mime_type: string | null
  size_bytes: number
  source: MediaSource | null
  task_id: string | null
  metadata: string | Record<string, unknown> | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_favorite?: boolean // 新增
}
```

- [ ] **Step 2: 扩展 ListMediaParams 添加 favorite**

```typescript
// src/lib/api/media.ts

export interface ListMediaParams {
  type?: MediaType
  source?: MediaSource
  page?: number
  limit?: number
  includeDeleted?: boolean
  favorite?: boolean // 新增
}
```

- [ ] **Step 3: 新增 toggleFavorite 函数**

```typescript
// src/lib/api/media.ts 在文件末尾添加

export async function toggleFavorite(mediaId: string): Promise<{
  success: boolean
  data: {
    mediaId: string
    isFavorite: boolean
    action: 'added' | 'removed'
  }
}> {
  const response = await client.patch(`/media/${mediaId}/favorite`)
  return response.data
}
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/media.ts
git commit -m "feat: add toggleFavorite API function"
```

---

## Task 8: 前端组件 - FavoriteButton

**Files:**
- Create: `src/components/media/FavoriteButton.tsx`

- [ ] **Step 1: 创建 FavoriteButton 组件**

```tsx
// src/components/media/FavoriteButton.tsx

import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  mediaId: string
  isFavorite: boolean
  onToggle: (mediaId: string) => void
  disabled?: boolean
}

export function FavoriteButton({ mediaId, isFavorite, onToggle, disabled }: FavoriteButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(mediaId)
      }}
      disabled={disabled}
      className={cn(
        'hover:text-yellow-500 transition-colors',
        isFavorite && 'text-yellow-500'
      )}
      title={isFavorite ? '取消收藏' : '收藏'}
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

- [ ] **Step 2: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/media/FavoriteButton.tsx
git commit -m "feat: create FavoriteButton component"
```

---

## Task 9: 前端常量 - 新增"已收藏"Tab

**Files:**
- Modify: `src/lib/constants/media.tsx`

- [ ] **Step 1: 导入 Star 图标并新增收藏 Tab**

```tsx
// src/lib/constants/media.tsx

import { Image, Music, Video, FileAudio, RefreshCw, Star } from 'lucide-react'

export const MEDIA_TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <RefreshCw className="w-4 h-4" /> },
  { value: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
  { value: 'audio', label: '音频', icon: <FileAudio className="w-4 h-4" /> },
  { value: 'video', label: '视频', icon: <Video className="w-4 h-4" /> },
  { value: 'music', label: '音乐', icon: <Music className="w-4 h-4" /> },
  { value: 'favorite', label: '已收藏', icon: <Star className="w-4 h-4" /> }, // 新增
]
```

- [ ] **Step 2: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants/media.tsx
git commit -m "feat: add favorite tab to MEDIA_TABS"
```

---

## Task 10: 前端 Hook - handleToggleFavorite

**Files:**
- Modify: `src/hooks/useMediaManagement.ts`

- [ ] **Step 1: 导入 toggleFavorite API**

```typescript
// src/hooks/useMediaManagement.ts 在 import 区域添加

import {
  listMedia,
  deleteMedia as deleteMediaApi,
  getMediaDownloadUrl,
  batchDeleteMedia,
  batchDownloadMedia,
  updateMedia,
  toggleFavorite, // 新增
} from '@/lib/api/media'
```

- [ ] **Step 2: 新增 favoriteFilter 状态**

```typescript
// src/hooks/useMediaManagement.ts 在 useState 区域添加

const [favoriteFilter, setFavoriteFilter] = useState<boolean>(false)
```

- [ ] **Step 3: 修改 fetchMedia 支持 favorite 筛选**

```typescript
// src/hooks/useMediaManagement.ts 修改 fetchMedia 函数

const fetchMedia = useCallback(async (isInitial: boolean = false) => {
  // ... 现有逻辑
  
  const params: ListMediaParams = {
    page: pagination.page,
    limit: pagination.limit,
    type: activeTab === 'all' ? undefined : activeTab as MediaType,
    search: searchQuery || undefined,
    favorite: favoriteFilter || undefined, // 新增
  }
  
  const response = await listMedia(params)
  // ... 后续逻辑
}, [pagination.page, pagination.limit, activeTab, searchQuery, favoriteFilter]) // 添加 favoriteFilter 依赖
```

- [ ] **Step 4: 新增 handleToggleFavorite 函数**

```typescript
// src/hooks/useMediaManagement.ts

const handleToggleFavorite = useCallback(async (mediaId: string) => {
  try {
    const result = await toggleFavorite(mediaId)
    
    // 更新本地状态
    setRecords(prev => prev.map(item =>
      item.id === mediaId
        ? { ...item, is_favorite: result.data.isFavorite }
        : item
    ))
    
    toastSuccess(result.data.action === 'added' ? '已收藏' : '已取消收藏')
  } catch (error) {
    console.error('Toggle favorite failed:', error)
  }
}, [])
```

- [ ] **Step 5: 修改 activeTab 切换逻辑支持 favorite**

```typescript
// src/hooks/useMediaManagement.ts 修改 setActiveTab 逻辑

const handleTabChange = useCallback((tab: string) => {
  setActiveTab(tab)
  if (tab === 'favorite') {
    setFavoriteFilter(true)
  } else {
    setFavoriteFilter(false)
  }
  // 重置分页
  setPagination(prev => ({ ...prev, page: 1 }))
}, [])
```

- [ ] **Step 6: 在返回对象添加新属性和方法**

```typescript
// src/hooks/useMediaManagement.ts 在 return 对象中添加

return {
  // ... 现有返回值
  favoriteFilter,
  handleToggleFavorite,
  handleTabChange,
}
```

- [ ] **Step 7: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useMediaManagement.ts
git commit -m "feat: add handleToggleFavorite and favorite filter to useMediaManagement"
```

---

## Task 11: MediaCard 集成 FavoriteButton

**Files:**
- Modify: `src/components/media/MediaCard.tsx`

- [ ] **Step 1: 导入 FavoriteButton**

```tsx
// src/components/media/MediaCard.tsx 在 import 区域添加

import { FavoriteButton } from './FavoriteButton'
```

- [ ] **Step 2: 扩展 MediaCardProps 添加收藏相关属性**

```tsx
// src/components/media/MediaCard.tsx

interface MediaCardProps {
  record: MediaRecord
  signedUrl?: string
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
  onRename?: (id: string, newName: string) => void
  onToggleFavorite?: (mediaId: string) => void  // 新增
}
```

- [ ] **Step 3: 在操作按钮区域添加 FavoriteButton**

```tsx
// src/components/media/MediaCard.tsx 在操作按钮 div 中添加

// 找到包含 Eye, Download, Trash2 按钮的 div，添加 FavoriteButton

<div className="flex items-center gap-1">
  {/* ... 预览、下载按钮 */}
  {onToggleFavorite && (
    <FavoriteButton
      mediaId={record.id}
      isFavorite={record.is_favorite ?? false}
      onToggle={onToggleFavorite}
    />
  )}
  {/* ... 删除按钮 */}
</div>
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/media/MediaCard.tsx
git commit -m "feat: integrate FavoriteButton into MediaCard"
```

---

## Task 12: MediaTableView 集成 FavoriteButton

**Files:**
- Modify: `src/components/media/MediaTableView.tsx`

- [ ] **Step 1: 导入 FavoriteButton**

```tsx
// src/components/media/MediaTableView.tsx 在 import 区域添加

import { FavoriteButton } from './FavoriteButton'
```

- [ ] **Step 2: 扩展 MediaTableViewProps 添加收藏属性**

```tsx
// src/components/media/MediaTableView.tsx

interface MediaTableViewProps {
  records: MediaRecord[]
  signedUrls: Record<string, string>
  selectedIds: Set<string>
  onSelectAll: () => void
  onSelect: (id: string) => void
  onPreview: (record: MediaRecord) => void
  onDownload: (record: MediaRecord) => void
  onDelete: (record: MediaRecord) => void
  onRename?: (id: string, newName: string) => void
  onToggleFavorite?: (mediaId: string) => void  // 新增
}
```

- [ ] **Step 3: 在操作列添加 FavoriteButton**

```tsx
// src/components/media/MediaTableView.tsx 在操作按钮 td 中添加

<td className="px-4 py-2">
  <div className="flex items-center gap-1">
    {/* 预览按钮 */}
    {/* 下载按钮 */}
    {onToggleFavorite && (
      <FavoriteButton
        mediaId={record.id}
        isFavorite={record.is_favorite ?? false}
        onToggle={onToggleFavorite}
      />
    )}
    {/* 编辑按钮 */}
    {/* 删除按钮 */}
  </div>
</td>
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/media/MediaTableView.tsx
git commit -m "feat: integrate FavoriteButton into MediaTableView"
```

---

## Task 13: TimelineItem 集成 FavoriteButton

**Files:**
- Modify: `src/components/media/TimelineItem.tsx`

- [ ] **Step 1: 导入 FavoriteButton**

```tsx
// src/components/media/TimelineItem.tsx 在 import 区域添加

import { FavoriteButton } from './FavoriteButton'
```

- [ ] **Step 2: 扩展 TimelineItemProps 添加收藏属性**

```tsx
// src/components/media/TimelineItem.tsx

interface TimelineItemProps {
  record: MediaRecord
  signedUrl?: string
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
  onRename?: (id: string, newName: string) => void
  onToggleFavorite?: (mediaId: string) => void  // 新增
}
```

- [ ] **Step 3: 在操作按钮区域添加 FavoriteButton**

```tsx
// src/components/media/TimelineItem.tsx 在操作按钮 div 中添加

<div className="flex items-center gap-1">
  {/* 预览按钮 */}
  {/* 下载按钮 */}
  {onToggleFavorite && (
    <FavoriteButton
      mediaId={record.id}
      isFavorite={record.is_favorite ?? false}
      onToggle={onToggleFavorite}
    />
  )}
  {/* 编辑按钮 */}
  {/* 删除按钮 */}
</div>
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/media/TimelineItem.tsx
git commit -m "feat: integrate FavoriteButton into TimelineItem"
```

---

## Task 14: MediaManagement 页面集成

**Files:**
- Modify: `src/pages/MediaManagement.tsx`

- [ ] **Step 1: 从 hook 获取新属性**

```tsx
// src/pages/MediaManagement.tsx 在 useMediaManagement 返回值中添加

const {
  // ... 现有属性
  handleToggleFavorite,
  handleTabChange,
} = useMediaManagement()
```

- [ ] **Step 2: 修改 Tab 切换使用 handleTabChange**

```tsx
// src/pages/MediaManagement.tsx 修改 Tabs 组件

<Tabs value={activeTab} onValueChange={handleTabChange}>
  {/* ... TabsList 内容不变 */}
</Tabs>
```

- [ ] **Step 3: 传递 onToggleFavorite 到各视图组件**

```tsx
// src/pages/MediaManagement.tsx 在 AnimatedMediaGrid 调用时添加

<AnimatedMediaGrid
  records={filteredRecords}
  signedUrls={signedUrls}
  selectedIds={selectedIds}
  onSelect={handleSelect}
  onPreview={handlePreview}
  onDownload={handleDownload}
  onDelete={(record) => setDeleteDialog({ isOpen: true, record })}
  onRename={handleRename}
  onToggleFavorite={handleToggleFavorite}  // 新增
/>
```

- [ ] **Step 4: 传递 onToggleFavorite 到其他视图**

```tsx
// src/pages/MediaManagement.tsx 在 MediaTableView 和 TimelineItem 调用时添加

<MediaTableView
  // ... 现有属性
  onToggleFavorite={handleToggleFavorite}
/>

<TimelineItem
  // ... 现有属性（遍历渲染时）
  onToggleFavorite={handleToggleFavorite}
/>
```

- [ ] **Step 5: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/pages/MediaManagement.tsx
git commit -m "feat: integrate favorite functionality into MediaManagement page"
```

---

## Task 15: AnimatedMediaGrid 传递 onToggleFavorite

**Files:**
- Modify: `src/components/media/AnimatedMediaGrid.tsx`

- [ ] **Step 1: 扩展 AnimatedMediaGridProps 添加收藏属性**

```tsx
// src/components/media/AnimatedMediaGrid.tsx

interface AnimatedMediaGridProps {
  records: MediaRecord[]
  signedUrls: Record<string, string>
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onPreview: (record: MediaRecord) => void
  onDownload: (record: MediaRecord) => void
  onDelete: (record: MediaRecord) => void
  onRename?: (id: string, newName: string) => void
  onToggleFavorite?: (mediaId: string) => void  // 新增
}
```

- [ ] **Step 2: 传递 onToggleFavorite 到 MediaCard**

```tsx
// src/components/media/AnimatedMediaGrid.tsx 在 MediaCard 调用时添加

<MediaCard
  record={record}
  signedUrl={signedUrls[record.id]}
  isSelected={selectedIds.has(record.id)}
  onSelect={() => onSelect(record.id)}
  onPreview={() => onPreview(record)}
  onDownload={() => onDownload(record)}
  onDelete={() => onDelete(record)}
  onRename={onRename}
  onToggleFavorite={onToggleFavorite}  // 新增
/>
```

- [ ] **Step 3: 验证编译**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/components/media/AnimatedMediaGrid.tsx
git commit -m "feat: pass onToggleFavorite through AnimatedMediaGrid"
```

---

## Task 16: 最终验证和集成测试

- [ ] **Step 1: 运行完整构建**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 2: 运行服务器**

```bash
node scripts/dev.js restart
```

Expected: 服务器正常启动

- [ ] **Step 3: 手动测试收藏功能**

测试步骤：
1. 登录系统
2. 进入媒体管理页面
3. 点击媒体卡片上的星形图标 → 确认变为实心金色
4. 点击"已收藏" Tab → 确认只显示收藏的媒体
5. 再次点击星形图标 → 确认变为空心
6. 确认"已收藏" Tab 不再显示该媒体

- [ ] **Step 4: 验证数据库记录**

```sql
-- 查看收藏记录
SELECT * FROM user_media_favorites;

-- 验证软删除逻辑
-- 收藏后 is_deleted = false
-- 取消后 is_deleted = true
-- 再次收藏后 is_deleted = false
```

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete media favorites feature"
```

---

## Spec Coverage Check

| Spec 章节 | 对应任务 |
|-----------|---------|
| 数据库层：表结构 | Task 1 |
| 数据库层：操作逻辑 | Task 3 (Repository) |
| 数据库层：查询收藏状态 | Task 3, Task 6 |
| API 层：PATCH /:id/favorite | Task 6 |
| API 层：favorite 筛选参数 | Task 5, Task 6 |
| API 层：响应扩展 is_favorite | Task 2, Task 3, Task 7 |
| 前端层：筛选 Tab | Task 9, Task 10, Task 14 |
| 前端层：FavoriteButton | Task 8 |
| 前端层：三视图集成 | Task 11, Task 12, Task 13, Task 14, Task 15 |

---

## Type Consistency Check

- `FavoriteRecord` 在 Task 2 定义，Task 3, Task 4 使用 ✓
- `is_favorite: boolean` 在 Task 2 (MediaRecord), Task 7 (前端 MediaRecord), Task 11-15 (组件) 一致 ✓
- `toggleFavorite(userId: number, mediaId: string)` 签名在 Task 3, Task 4, Task 7 一致 ✓
- `onToggleFavorite?: (mediaId: string) => void` 在 Task 11-15 一致 ✓