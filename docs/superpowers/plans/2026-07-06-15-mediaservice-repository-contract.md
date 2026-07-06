# MediaService 仓储化契约

> **目标**：域层 MediaService 从依赖 `DatabaseService` God Facade 改为依赖 `MediaRepository`，遵循已确立的 LogService/JobService/TaskService 仓储化模式。

**架构**：`MediaService(MediaRepository)` 直接使用仓储的 `list/getById/create/update/softDelete/hardDelete/getByIds/toggleFavorite/togglePublic/batchTogglePublic/softDeleteBatch`，不再透传 `DatabaseService`。

**边界**：
- 不改 IMediaService 接口（12 方法签名不变）
- 不改 API 路径/请求体/响应格式/状态码
- media 路由已全部使用 `getMediaService()`，无需改路由
- 不新增 token（复用既有 `MEDIA_SERVICE`）
- 不改 `DatabaseService` 内部遗留委托方法
- 不改 `database/services/media-service.ts`（旧层）

---

## 文件结构

| 操作 | 文件 |
|------|------|
| 修改 | `server/services/domain/media.service.ts` |
| 修改 | `server/service-registration.ts` (L174-176) |
| 修改 | `server/services/domain/media.service.test.ts` |
| 新增 | `server/services/domain/__tests__/media-service-contract.test.ts` |

---

## RED 测试

```typescript
// server/services/domain/__tests__/media-service-contract.test.ts
import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('MediaService 仓储化契约', () => {
  it('MediaService 构造函数不依赖 DatabaseService', () => {
    const source = readFileSync('server/services/domain/media.service.ts', 'utf-8')
    expect(source).toContain('MediaRepository')
    expect(source).toContain('private readonly mediaRepo')
    expect(source).not.toContain('private readonly db: DatabaseService')
  })
})
```

---

## GREEN 实现

### `server/services/domain/media.service.ts`

```typescript
import type { MediaRepository } from '../../repositories/media-repository.js'
import type { MediaRecord, CreateMediaRecord } from '../../database/types.js'
import type { IMediaService, MediaFilter, MediaQueryResult } from './interfaces/index.js'

export class MediaService implements IMediaService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  async getById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> {
    return this.mediaRepo.getById(id, ownerId, includePublic)
  }

  async getAll(filter: MediaFilter): Promise<MediaQueryResult> {
    const result = await this.mediaRepo.list({
      type: filter.type,
      source: filter.source,
      search: filter.search,
      limit: filter.limit ?? 20,
      offset: filter.offset ?? 0,
      includeDeleted: filter.includeDeleted,
      visibilityOwnerId: filter.visibilityOwnerId,
      favoriteFilter: filter.favoriteFilter,
      publicFilter: filter.publicFilter,
      favoriteUserId: filter.favoriteUserId,
      role: filter.role,
    })
    return { records: result.items, total: result.total }
  }

  async create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    return this.mediaRepo.create(data, ownerId)
  }

  async update(id: string, data: Partial<MediaRecord>, ownerId?: string): Promise<MediaRecord | null> {
    const updateData: { original_name?: string | null; metadata?: Record<string, unknown> | null } = {}
    if (data.original_name !== undefined) {
      updateData.original_name = data.original_name
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata as Record<string, unknown> | null
    }
    return this.mediaRepo.update(id, updateData, ownerId)
  }

  async softDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.softDelete(id, ownerId)
  }

  async hardDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.hardDelete(id, ownerId)
  }

  async getByIds(ids: string[], ownerId?: string): Promise<MediaRecord[]> {
    return this.mediaRepo.getByIds(ids, ownerId)
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
    return this.mediaRepo.toggleFavorite(userId, mediaId)
  }

  async togglePublic(id: string, isPublic: boolean, ownerId?: string): Promise<MediaRecord | null> {
    return this.mediaRepo.togglePublic(id, isPublic, ownerId)
  }

  async batchTogglePublic(ids: string[], isPublic: boolean, userId?: string): Promise<number> {
    return this.mediaRepo.batchTogglePublic(ids, isPublic, userId)
  }

  async softDeleteBatch(ids: string[], ownerId?: string): Promise<{ deleted: number; failed: number }> {
    return this.mediaRepo.softDeleteBatch(ids, ownerId)
  }
}
```

### `server/service-registration.ts` L174-176

```typescript
// 改前:
container.registerSingleton(TOKENS.MEDIA_SERVICE, (c) => {
  return new MediaService(c.resolve(TOKENS.DATABASE))
})

// 改后:
container.registerSingleton(TOKENS.MEDIA_SERVICE, (c) => {
  const db = c.resolve<DatabaseService>(TOKENS.DATABASE)
  const conn = db.getConnection()
  return new MediaService(new MediaRepository(conn))
})
```

### `server/services/domain/media.service.test.ts`

将 mock 对象从 DatabaseService 方法改为 MediaRepository 方法。所有 `this.db.xxx` → `this.mediaRepo.xxx` 的断言同步更新。

---

## 验证

```bash
rtk npm run test:server -- server/services/domain/__tests__/media-service-contract.test.ts \
  server/services/domain/media.service.test.ts \
  server/routes/__tests__/media.test.ts
rtk npm run build
lsp_diagnostics server/services/domain/media.service.ts
lsp_diagnostics server/service-registration.ts
```

## 自审

`rtk rg -n "TBD|TODO|implement later|fill in details" docs/superpowers/plans/2026-07-06-15-mediaservice-repository-contract.md` → 无输出。
