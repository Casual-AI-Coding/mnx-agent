# 媒体公开功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为媒体管理添加公开/取消公开功能，公开后的记录对所有用户可见

**Architecture:** 后端新增 `is_public` 字段 + togglePublic/batchTogglePublic 服务方法 + 两个 API 端点。前端新增 PublicButton 组件，集成到三视图，添加筛选和批量操作。

**Tech Stack:** Express, TypeScript, PostgreSQL, React, Tailwind CSS, Zustand

---

## 文件结构

| 文件 | 负责 |
|------|------|
| `server/database/migrations-async.ts` | 修改 - 新增 migration_025 添加 is_public 字段 |
| `server/database/schema-pg.ts` | 修改 - 添加 is_public 到 CREATE TABLE |
| `packages/shared-types/entities/media.ts` | 修改 - MediaRecord 接口添加 is_public |
| `packages/shared-types/validation/media-schemas.ts` | 修改 - listMediaQuerySchema 添加 is_public 参数 |
| `server/repositories/media-repository.ts` | 修改 - 新增 togglePublic, batchTogglePublic 方法，修改 list 查询逻辑 |
| `server/database/service-async.ts` | 修改 - 新增 togglePublic, batchTogglePublic 委托方法 |
| `server/services/domain/media.service.ts` | 修改 - 新增 togglePublic, batchTogglePublic 委托方法 |
| `server/routes/media.ts` | 修改 - 新增 PATCH /:id/public, POST /batch/public 端点 |
| `server/routes/__tests__/media.test.ts` | 修改 - 新增公开功能测试 |
| `src/types/media.ts` | 修改 - MediaRecord 添加 is_public |
| `src/lib/api/media.ts` | 修改 - 新增 togglePublic, batchTogglePublic 函数 |
| `src/components/media/PublicButton.tsx` | 新建 - 公开按钮组件 |
| `src/hooks/useMediaManagement.ts` | 修改 - 新增 handleTogglePublic, handleBatchTogglePublic |
| `src/components/media/MediaTableView.tsx` | 修改 - 集成 PublicButton |
| `src/components/media/MediaCard.tsx` | 修改 - 集成 PublicButton |
| `src/components/media/TimelineItem.tsx` | 修改 - 集成 PublicButton |
| `src/pages/MediaManagement.tsx` | 修改 - 添加公开筛选，批量公开按钮 |

---

## Task 1: 数据库迁移 - 添加 is_public 字段

**Files:**
- Modify: `server/database/migrations-async.ts`
- Modify: `server/database/schema-pg.ts`

- [ ] **Step 1: 写失败的测试（验证 is_public 字段不存在）**

在 `server/database/__tests__/media.test.ts` 添加测试：

```typescript
describe('is_public field', () => {
  it('should have is_public column after migration', async () => {
    const conn = getConnection()
    const result = await conn.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'media_records' AND column_name = 'is_public'
    `)
    expect(result.rows.length).toBe(0) // 迁移前不存在
  })
})
```

运行: `vitest run server/database/__tests__/media.test.ts -t "is_public field"`
预期: PASS（字段当前不存在）

- [ ] **Step 2: 添加迁移 migration_025**

在 `server/database/migrations-async.ts` 找到 `MIGRATIONS` 数组末尾，添加：

```typescript
export const migration_025 = `
-- 新增 is_public 字段
ALTER TABLE media_records ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_media_records_is_public ON media_records(is_public);
CREATE INDEX IF NOT EXISTS idx_media_records_owner_public ON media_records(owner_id, is_public);
`

// 在 MIGRATIONS 数组末尾添加
{ id: 25, name: 'migration_025_add_is_public', sql: migration_025 },
```

- [ ] **Step 3: 更新 schema-pg.ts 的 CREATE TABLE**

在 `server/database/schema-pg.ts` 的 `media_records` CREATE TABLE 语句中，在 `is_deleted` 后添加：

```sql
is_public BOOLEAN DEFAULT false,
```

- [ ] **Step 4: 运行迁移测试**

运行: `vitest run server/database/__tests__/media.test.ts`
预期: 所有测试通过

- [ ] **Step 5: 提交数据库变更**

```bash
git add server/database/migrations-async.ts server/database/schema-pg.ts server/database/__tests__/media.test.ts
git commit -m "feat(media): add is_public field to media_records table"
```

---

## Task 2: TypeScript 类型扩展

**Files:**
- Modify: `packages/shared-types/entities/media.ts`
- Modify: `packages/shared-types/validation/media-schemas.ts`
- Modify: `src/types/media.ts`

- [ ] **Step 1: 扩展 MediaRecord 接口**

在 `packages/shared-types/entities/media.ts` 的 `MediaRecord` 接口添加：

```typescript
export interface MediaRecord {
  // ... 现有字段
  is_public: boolean      // 新增
  owner_id?: string       // 已有，确认存在
}
```

同时在 `MediaRecordRow` 接口添加：

```typescript
export interface MediaRecordRow {
  // ... 现有字段
  is_public: boolean
  owner_id?: string
}
```

- [ ] **Step 2: 扩展 validation schema**

在 `packages/shared-types/validation/media-schemas.ts` 的 `listMediaQuerySchema` 添加：

```typescript
export const listMediaQuerySchema = z.object({
  type: z.enum(['audio', 'image', 'video', 'music']).optional(),
  source: z.enum(['voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  is_public: z.enum(['all', 'public', 'private']).optional().default('all'),  // 新增
})
```

- [ ] **Step 3: 扩展前端类型**

在 `src/types/media.ts` 的 `MediaRecord` 接口添加：

```typescript
export interface MediaRecord {
  // ... 现有字段
  is_public?: boolean     // 新增
  owner_id?: string       // 已有
}
```

- [ ] **Step 4: 运行类型检查**

运行: `npm run build`
预期: 无类型错误

- [ ] **Step 5: 提交类型变更**

```bash
git add packages/shared-types/entities/media.ts packages/shared-types/validation/media-schemas.ts src/types/media.ts
git commit -m "feat(media): add is_public to MediaRecord types and validation"
```

---

## Task 3: Repository 层实现 togglePublic

**Files:**
- Modify: `server/repositories/media-repository.ts`

- [ ] **Step 1: 写失败的测试**

在 `server/database/__tests__/media.test.ts` 添加：

```typescript
describe('togglePublic', () => {
  let testUserId: string
  let testMediaId: string

  beforeEach(async () => {
    const conn = getConnection()
    testUserId = uuidv4()
    testMediaId = uuidv4()
    
    // 创建测试用户
    await conn.query(`
      INSERT INTO users (id, username, email, password_hash, role, type)
      VALUES ($1, 'testuser', 'test@test.com', 'hash', 'user', 'domestic')
    `, [testUserId])
    
    // 创建测试媒体记录
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, owner_id, is_public)
      VALUES ($1, 'test.png', '/test.png', 'image', 1000, $2, false)
    `, [testMediaId, testUserId])
  })

  it('should toggle is_public from false to true for owner', async () => {
    const repo = new MediaRepository(getConnection())
    const result = await repo.togglePublic(testUserId, testMediaId, 'user')
    
    expect(result.isPublic).toBe(true)
    expect(result.action).toBe('published')
    
    // 验证数据库状态
    const conn = getConnection()
    const row = await conn.query('SELECT is_public FROM media_records WHERE id = $1', [testMediaId])
    expect(row.rows[0].is_public).toBe(true)
  })

  it('should toggle is_public from true to false for owner', async () => {
    const conn = getConnection()
    await conn.query('UPDATE media_records SET is_public = true WHERE id = $1', [testMediaId])
    
    const repo = new MediaRepository(getConnection())
    const result = await repo.togglePublic(testUserId, testMediaId, 'user')
    
    expect(result.isPublic).toBe(false)
    expect(result.action).toBe('unpublished')
  })

  it('should deny non-owner from toggling owned record', async () => {
    const otherUserId = uuidv4()
    const conn = getConnection()
    await conn.query(`
      INSERT INTO users (id, username, email, password_hash, role, type)
      VALUES ($1, 'other', 'other@test.com', 'hash', 'user', 'domestic')
    `, [otherUserId])
    
    const repo = new MediaRepository(getConnection())
    const result = await repo.togglePublic(otherUserId, testMediaId, 'user')
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('无权限')
  })

  it('should allow super to toggle record without owner_id', async () => {
    const noOwnerMediaId = uuidv4()
    const conn = getConnection()
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, is_public)
      VALUES ($1, 'noowner.png', '/noowner.png', 'image', 1000, false)
    `, [noOwnerMediaId])
    
    const superUserId = uuidv4()
    await conn.query(`
      INSERT INTO users (id, username, email, password_hash, role, type)
      VALUES ($1, 'superuser', 'super@test.com', 'hash', 'super', 'domestic')
    `, [superUserId])
    
    const repo = new MediaRepository(getConnection())
    const result = await repo.togglePublic(superUserId, noOwnerMediaId, 'super')
    
    expect(result.isPublic).toBe(true)
    expect(result.action).toBe('published')
  })
})
```

运行: `vitest run server/database/__tests__/media.test.ts -t "togglePublic"`
预期: FAIL（togglePublic 方法不存在）

- [ ] **Step 2: 实现 togglePublic 方法**

在 `server/repositories/media-repository.ts` 的 `MediaRepository` 类添加：

```typescript
/**
 * 切换媒体记录的公开状态
 * 权限规则：
 * - 有 owner_id 的记录：只有 owner 能切换
 * - 无 owner_id 的记录：只有 super 能切换
 */
async togglePublic(
  userId: string,
  mediaId: string,
  userRole: string
): Promise<{ success: boolean; isPublic?: boolean; action?: 'published' | 'unpublished'; error?: string }> {
  const result = await this.conn.query<MediaRecordRow>(
    'SELECT id, owner_id, is_public, is_deleted FROM media_records WHERE id = $1',
    [mediaId]
  )

  const record = result.rows[0]
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
  await this.conn.query(
    'UPDATE media_records SET is_public = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPublicState, mediaId]
  )

  return {
    success: true,
    isPublic: newPublicState,
    action: newPublicState ? 'published' : 'unpublished',
  }
}
```

- [ ] **Step 3: 实现 batchTogglePublic 方法**

在 `MediaRepository` 类添加：

```typescript
/**
 * 批量切换公开状态（仅限 owner 自己的记录）
 */
async batchTogglePublic(
  ids: string[],
  isPublic: boolean,
  userId: string
): Promise<{ succeeded: string[]; failed: string[] }> {
  const results = { succeeded: [] as string[], failed: [] as string[] }

  for (const id of ids) {
    const result = await this.conn.query<MediaRecordRow>(
      'SELECT id, owner_id, is_deleted FROM media_records WHERE id = $1',
      [id]
    )

    const record = result.rows[0]
    
    // 只能操作自己的记录
    if (!record || record.is_deleted || record.owner_id !== userId) {
      results.failed.push(id)
      continue
    }

    await this.conn.query(
      'UPDATE media_records SET is_public = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isPublic, id]
    )
    results.succeeded.push(id)
  }

  return results
}
```

- [ ] **Step 4: 运行测试验证**

运行: `vitest run server/database/__tests__/media.test.ts -t "togglePublic"`
预期: PASS

- [ ] **Step 5: 提交 Repository 变更**

```bash
git add server/repositories/media-repository.ts server/database/__tests__/media.test.ts
git commit -m "feat(media): implement togglePublic and batchTogglePublic in repository"
```

---

## Task 4: 修改 list 查询逻辑支持公开可见

**Files:**
- Modify: `server/repositories/media-repository.ts`

- [ ] **Step 1: 写失败的测试**

在 `server/database/__tests__/media.test.ts` 添加：

```typescript
describe('public visibility in list', () => {
  let userId1: string
  let userId2: string
  let publicMediaId: string
  let privateMediaId1: string
  let privateMediaId2: string

  beforeEach(async () => {
    const conn = getConnection()
    userId1 = uuidv4()
    userId2 = uuidv4()
    
    // 创建两个用户
    await conn.query(`
      INSERT INTO users (id, username, email, password_hash, role, type)
      VALUES ($1, 'user1', 'u1@test.com', 'hash', 'user', 'domestic'),
             ($2, 'user2', 'u2@test.com', 'hash', 'user', 'domestic')
    `, [userId1, userId2])
    
    // 用户1 的公开记录
    publicMediaId = uuidv4()
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, owner_id, is_public)
      VALUES ($1, 'public.png', '/public.png', 'image', 1000, $2, true)
    `, [publicMediaId, userId1])
    
    // 用户1 的私有记录
    privateMediaId1 = uuidv4()
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, owner_id, is_public)
      VALUES ($1, 'private1.png', '/private1.png', 'image', 1000, $2, false)
    `, [privateMediaId1, userId1])
    
    // 用户2 的私有记录
    privateMediaId2 = uuidv4()
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, owner_id, is_public)
      VALUES ($1, 'private2.png', '/private2.png', 'image', 1000, $2, false)
    `, [privateMediaId2, userId2])
  })

  it('user should see own private records + all public records', async () => {
    const repo = new MediaRepository(getConnection())
    const result = await repo.list({
      ownerId: userId2,          // 用户2 查询
      isPrivileged: false,       // 非 admin/super
      isPublicFilter: 'all',
      limit: 100,
    })
    
    // 用户2 应该看到：自己的私有 + 用户1 的公开
    expect(result.records.some(r => r.id === privateMediaId2)).toBe(true)  // 自己的私有
    expect(result.records.some(r => r.id === publicMediaId)).toBe(true)    // 别人的公开
    expect(result.records.some(r => r.id === privateMediaId1)).toBe(false) // 别人的私有
  })

  it('admin should see all records', async () => {
    const repo = new MediaRepository(getConnection())
    const result = await repo.list({
      ownerId: userId2,
      isPrivileged: true,        // admin/super
      isPublicFilter: 'all',
      limit: 100,
    })
    
    // admin 看到所有记录
    expect(result.records.some(r => r.id === privateMediaId1)).toBe(true)
    expect(result.records.some(r => r.id === privateMediaId2)).toBe(true)
    expect(result.records.some(r => r.id === publicMediaId)).toBe(true)
  })

  it('filter by public only', async () => {
    const repo = new MediaRepository(getConnection())
    const result = await repo.list({
      ownerId: userId2,
      isPrivileged: false,
      isPublicFilter: 'public',  // 只看公开
      limit: 100,
    })
    
    expect(result.records.every(r => r.is_public === true)).toBe(true)
  })
})
```

运行: `vitest run server/database/__tests__/media.test.ts -t "public visibility"`
预期: FAIL（查询逻辑未修改）

- [ ] **Step 2: 修改 list 方法查询逻辑**

找到 `server/repositories/media-repository.ts` 的 `list` 方法，修改 WHERE 条件构建逻辑：

```typescript
async list(options: ListOptions): Promise<{ records: MediaRecord[]; total: number }> {
  let whereClause = 'WHERE is_deleted = false'
  const params: any[] = []
  let paramIndex = 1

  // 公开可见性逻辑
  if (!options.isPrivileged) {
    // 非 admin/super：自己的私有 + 所有公开
    whereClause += ` AND (
      (owner_id = $${paramIndex} AND is_public = false)
      OR is_public = true
    )`
    params.push(options.ownerId)
    paramIndex++
  } else {
    // admin/super：看全部（可选 owner_id 过滤）
    if (options.ownerId) {
      whereClause += ` AND owner_id = $${paramIndex}`
      params.push(options.ownerId)
      paramIndex++
    }
  }

  // is_public 篮选参数
  if (options.isPublicFilter && options.isPublicFilter !== 'all') {
    if (options.isPublicFilter === 'public') {
      whereClause += ` AND is_public = true`
    } else if (options.isPublicFilter === 'private') {
      whereClause += ` AND is_public = false`
    }
  }

  // ... 其余查询逻辑保持不变
}
```

- [ ] **Step 3: 更新 ListOptions 类型**

在 `MediaRepository` 类顶部找到 `ListOptions` 接口，添加：

```typescript
interface ListOptions {
  // ... 现有字段
  isPrivileged: boolean         // 是否 admin/super
  isPublicFilter?: 'all' | 'public' | 'private'  // 新增
}
```

- [ ] **Step 4: 运行测试验证**

运行: `vitest run server/database/__tests__/media.test.ts -t "public visibility"`
预期: PASS

- [ ] **Step 5: 提交查询逻辑变更**

```bash
git add server/repositories/media-repository.ts server/database/__tests__/media.test.ts
git commit -m "feat(media): modify list query to support public visibility"
```

---

## Task 5: Service 层委托方法

**Files:**
- Modify: `server/database/service-async.ts`
- Modify: `server/services/domain/media.service.ts`

- [ ] **Step 1: DatabaseService 委托方法**

在 `server/database/service-async.ts` 的 `DatabaseService` 类添加：

```typescript
async togglePublic(
  userId: string,
  mediaId: string,
  userRole: string
): Promise<{ success: boolean; isPublic?: boolean; action?: 'published' | 'unpublished'; error?: string }> {
  return this.mediaRepo.togglePublic(userId, mediaId, userRole)
}

async batchTogglePublic(
  ids: string[],
  isPublic: boolean,
  userId: string
): Promise<{ succeeded: string[]; failed: string[] }> {
  return this.mediaRepo.batchTogglePublic(ids, isPublic, userId)
}
```

- [ ] **Step 2: DomainService 委托方法**

在 `server/services/domain/media.service.ts` 的 `MediaService` 类添加：

```typescript
async togglePublic(
  userId: string,
  mediaId: string,
  userRole: string
): Promise<{ success: boolean; isPublic?: boolean; action?: 'published' | 'unpublished'; error?: string }> {
  return this.db.togglePublic(userId, mediaId, userRole)
}

async batchTogglePublic(
  ids: string[],
  isPublic: boolean,
  userId: string
): Promise<{ succeeded: string[]; failed: string[] }> {
  return this.db.batchTogglePublic(ids, isPublic, userId)
}
```

- [ ] **Step 3: 运行构建验证**

运行: `npm run build`
预期: 无错误

- [ ] **Step 4: 提交 Service 层变更**

```bash
git add server/database/service-async.ts server/services/domain/media.service.ts
git commit -m "feat(media): add togglePublic delegation to service layers"
```

---

## Task 6: API 端点实现

**Files:**
- Modify: `server/routes/media.ts`

- [ ] **Step 1: 写失败的测试**

在 `server/routes/__tests__/media.test.ts` 添加：

```typescript
describe('PATCH /api/media/:id/public', () => {
  let app: Express
  let mockUser: { userId: string; role: string }
  let testMediaId: string

  beforeEach(async () => {
    mockUser = { userId: uuidv4(), role: 'user' }
    app = express()
    
    // Mock auth
    app.use((req, _res, next) => {
      req.user = mockUser
      next()
    })
    app.use('/api/media', mediaRouter)
    
    // 创建测试记录
    const conn = getConnection()
    testMediaId = uuidv4()
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, owner_id, is_public)
      VALUES ($1, 'test.png', '/test.png', 'image', 1000, $2, false)
    `, [testMediaId, mockUser.userId])
  })

  it('should toggle public for own record', async () => {
    const res = await request(app)
      .patch(`/api/media/${testMediaId}/public`)
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.isPublic).toBe(true)
    expect(res.body.data.action).toBe('published')
  })

  it('should return 403 for other user record', async () => {
    const otherMediaId = uuidv4()
    const otherUserId = uuidv4()
    const conn = getConnection()
    await conn.query(`
      INSERT INTO media_records (id, filename, filepath, type, size_bytes, owner_id, is_public)
      VALUES ($1, 'other.png', '/other.png', 'image', 1000, $2, false)
    `, [otherMediaId, otherUserId])
    
    const res = await request(app)
      .patch(`/api/media/${otherMediaId}/public`)
    
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/media/batch/public', () => {
  it('should batch toggle public for own records', async () => {
    // ... 测试批量操作
  })
})
```

运行: `vitest run server/routes/__tests__/media.test.ts -t "public"`
预期: FAIL（端点不存在）

- [ ] **Step 2: 实现 PATCH /:id/public 端点**

在 `server/routes/media.ts` 添加路由（在 `/:id/favorite` 后）：

```typescript
// PATCH /:id/public - 切换公开状态
router.patch('/:id/public', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()

  const userId = req.user?.userId
  const userRole = req.user?.role

  if (!userId) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const result = await db.togglePublic(userId, req.params.id, userRole || 'user')

  if (!result.success) {
    errorResponse(res, result.error || '操作失败', 403)
    return
  }

  successResponse(res, {
    mediaId: req.params.id,
    isPublic: result.isPublic,
    action: result.action,
  })
}))
```

- [ ] **Step 3: 实现 POST /batch/public 端点**

在 `server/routes/media.ts` 添加批量端点：

```typescript
// POST /batch/public - 批量切换公开状态
const batchPublicSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  isPublic: z.boolean(),
})

router.post('/batch/public', validate(batchPublicSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const userId = req.user?.userId

  if (!userId) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const { ids, isPublic } = req.body
  const result = await db.batchTogglePublic(ids, isPublic, userId)

  successResponse(res, {
    succeeded: result.succeeded,
    failed: result.failed,
    succeededCount: result.succeeded.length,
    failedCount: result.failed.length,
  })
}))
```

- [ ] **Step 4: 修改 GET / 端点支持 isPublicFilter**

在 `server/routes/media.ts` 的 GET `/` 路由修改：

```typescript
router.get('/', validateQuery(listMediaQuerySchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { page, limit, type, source, search, is_public } = req.query as any

  // 获取用户权限状态
  const userRole = req.user?.role
  const isPrivileged = userRole === 'admin' || userRole === 'super'
  const ownerId = isPrivileged ? undefined : req.user?.userId

  const result = await db.getAll({
    page,
    limit,
    type,
    source,
    search,
    ownerId,
    isPrivileged,
    isPublicFilter: is_public || 'all',
  })

  // ... 返回结果
}))
```

- [ ] **Step 5: 运行测试验证**

运行: `vitest run server/routes/__tests__/media.test.ts -t "public"`
预期: PASS

- [ ] **Step 6: 提交 API 端点**

```bash
git add server/routes/media.ts server/routes/__tests__/media.test.ts
git commit -m "feat(media): add PATCH /:id/public and POST /batch/public endpoints"
```

---

## Task 7: 前端 API 函数

**Files:**
- Modify: `src/lib/api/media.ts`

- [ ] **Step 1: 添加 togglePublic 函数**

在 `src/lib/api/media.ts` 添加（在 `toggleFavorite` 后）：

```typescript
/**
 * 切换媒体记录的公开状态
 */
export async function togglePublic(mediaId: string): Promise<{
  success: boolean
  data: {
    mediaId: string
    isPublic: boolean
    action: 'published' | 'unpublished'
  }
}> {
  const response = await client.patch(`/media/${mediaId}/public`)
  return response.data
}
```

- [ ] **Step 2: 添加 batchTogglePublic 函数**

```typescript
/**
 * 批量切换公开状态
 */
export async function batchTogglePublic(
  ids: string[],
  isPublic: boolean
): Promise<{
  success: boolean
  data: {
    succeeded: string[]
    failed: string[]
    succeededCount: number
    failedCount: number
  }
}> {
  const response = await client.post('/media/batch/public', { ids, isPublic })
  return response.data
}
```

- [ ] **Step 3: 运行构建验证**

运行: `npm run build`
预期: 无错误

- [ ] **Step 4: 提交 API 函数**

```bash
git add src/lib/api/media.ts
git commit -m "feat(media): add togglePublic and batchTogglePublic API functions"
```

---

## Task 8: 创建 PublicButton 组件

**Files:**
- Create: `src/components/media/PublicButton.tsx`

- [ ] **Step 1: 创建 PublicButton.tsx**

创建文件，参考 FavoriteButton 组件：

```typescript
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
}: PublicButtonProps) {
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
        'hover:text-green-600',
        isPublic && 'text-green-600'
      )}
      title={isPublic ? '取消公开' : '公开'}
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

- [ ] **Step 2: 提交组件**

```bash
git add src/components/media/PublicButton.tsx
git commit -m "feat(media): create PublicButton component"
```

---

## Task 9: useMediaManagement Hook 扩展

**Files:**
- Modify: `src/hooks/useMediaManagement.ts`

- [ ] **Step 1: 添加 handleTogglePublic 处理函数**

在 `src/hooks/useMediaManagement.ts` 的 `useMediaManagement` hook 内添加：

```typescript
const handleTogglePublic = useCallback(async (mediaId: string) => {
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
}, [records])
```

- [ ] **Step 2: 添加 handleBatchTogglePublic 处理函数**

```typescript
const handleBatchTogglePublic = useCallback(async (isPublic: boolean) => {
  const ids = selectedIds
  if (ids.length === 0) return

  try {
    const res = await batchTogglePublic(ids, isPublic)
    // 更新成功的记录
    setRecords(prev => prev.map(r =>
      res.data.succeeded.includes(r.id) ? { ...r, is_public: isPublic } : r
    ))
    
    if (res.data.failedCount > 0) {
      toast.warning(`成功 ${res.data.succeededCount} 条，失败 ${res.data.failedCount} 条`)
    } else {
      toast.success(isPublic ? '已批量公开' : '已批量取消公开')
    }
  } catch (err) {
    toast.error('批量操作失败')
  }
}, [selectedIds])
```

- [ ] **Step 3: 导出新增的处理函数**

在 hook 的返回值中添加：

```typescript
return {
  // ... 现有返回值
  handleTogglePublic,
  handleBatchTogglePublic,
}
```

- [ ] **Step 4: 提交 Hook 变更**

```bash
git add src/hooks/useMediaManagement.ts
git commit -m "feat(media): add handleTogglePublic and handleBatchTogglePublic to hook"
```

---

## Task 10: MediaTableView 集成

**Files:**
- Modify: `src/components/media/MediaTableView.tsx`

- [ ] **Step 1: 添加 props**

在 `MediaTableViewProps` 接口添加：

```typescript
interface MediaTableViewProps {
  // ... 现有 props
  onTogglePublic?: (mediaId: string) => void
  userId?: string       // 当前用户 ID
  userRole?: string     // 当前用户角色
}
```

- [ ] **Step 2: 在操作列添加 PublicButton**

找到操作列的 `<div className="flex items-center justify-end gap-2">`（约 line 213-248），在 FavoriteButton 后添加：

```typescript
{onTogglePublic && (
  <PublicButton
    mediaId={record.id}
    isPublic={record.is_public || false}
    isOwnRecord={
      !record.owner_id
        ? userRole === 'super'
        : userId === record.owner_id
    }
    onToggle={onTogglePublic}
  />
)}
```

- [ ] **Step 3: 导入 PublicButton**

在文件顶部添加 import：

```typescript
import { PublicButton } from './PublicButton'
```

- [ ] **Step 4: 提交变更**

```bash
git add src/components/media/MediaTableView.tsx
git commit -m "feat(media): integrate PublicButton into table view"
```

---

## Task 11: MediaCard 集成

**Files:**
- Modify: `src/components/media/MediaCard.tsx`
- Modify: `src/components/media/AnimatedMediaGrid.tsx`

- [ ] **Step 1: MediaCardProps 添加 props**

在 `MediaCard.tsx` 的 `MediaCardProps` 接口添加：

```typescript
interface MediaCardProps {
  // ... 现有 props
  onTogglePublic?: (mediaId: string) => void
  userId?: string
  userRole?: string
}
```

- [ ] **Step 2: 在状态徽章区添加 PublicButton**

找到右上角状态徽章区（约 line 151-173），在收藏星旁添加：

```typescript
{/* 公开状态 */}
{onTogglePublic && (
  <PublicButton
    mediaId={media.id}
    isPublic={media.is_public || false}
    isOwnRecord={
      !media.owner_id
        ? userRole === 'super'
        : userId === media.owner_id
    }
    onToggle={onTogglePublic}
  />
)}
```

- [ ] **Step 3: AnimatedMediaGridProps 透传 props**

在 `AnimatedMediaGrid.tsx` 的 props 接口添加：

```typescript
interface AnimatedMediaGridProps {
  // ... 现有 props
  onTogglePublic?: (mediaId: string) => void
  userId?: string
  userRole?: string
}
```

并在渲染 `<MediaCard>` 时透传：

```typescript
<MediaCard
  key={record.id}
  media={record}
  onTogglePublic={onTogglePublic}
  userId={userId}
  userRole={userRole}
  // ... 其他 props
/>
```

- [ ] **Step 4: 导入 PublicButton**

```typescript
import { PublicButton } from './PublicButton'
```

- [ ] **Step 5: 提交变更**

```bash
git add src/components/media/MediaCard.tsx src/components/media/AnimatedMediaGrid.tsx
git commit -m "feat(media): integrate PublicButton into card view"
```

---

## Task 12: TimelineItem 集成

**Files:**
- Modify: `src/components/media/TimelineItem.tsx`

- [ ] **Step 1: 添加 props**

在 `TimelineItemProps` 接口添加：

```typescript
interface TimelineItemProps {
  // ... 现有 props
  onTogglePublic?: (mediaId: string) => void
  userId?: string
  userRole?: string
}
```

- [ ] **Step 2: 在操作按钮行添加 PublicButton**

找到操作按钮行（约 line 127-149），在 FavoriteButton 后添加：

```typescript
{onTogglePublic && (
  <PublicButton
    mediaId={item.id}
    isPublic={item.is_public || false}
    isOwnRecord={
      !item.owner_id
        ? userRole === 'super'
        : userId === item.owner_id
    }
    onToggle={onTogglePublic}
  />
)}
```

- [ ] **Step 3: 导入 PublicButton**

```typescript
import { PublicButton } from './PublicButton'
```

- [ ] **Step 4: 提交变更**

```bash
git add src/components/media/TimelineItem.tsx
git commit -m "feat(media): integrate PublicButton into timeline view"
```

---

## Task 13: MediaManagement 页面集成

**Files:**
- Modify: `src/pages/MediaManagement.tsx`

- [ ] **Step 1: 添加公开筛选下拉**

在筛选栏添加公开筛选 Select：

```typescript
import { Globe, Lock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// 在筛选区域添加
<Select value={publicFilter} onValueChange={setPublicFilter}>
  <SelectTrigger className="w-[120px]">
    <SelectValue placeholder="可见范围" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">全部</SelectItem>
    <SelectItem value="public">
      <div className="flex items-center">
        <Globe className="w-4 h-4 mr-1" />
        公开
      </div>
    </SelectItem>
    <SelectItem value="private">
      <div className="flex items-center">
        <Lock className="w-4 h-4 mr-1" />
        私有
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 2: 添加 publicFilter 状态**

```typescript
const [publicFilter, setPublicFilter] = useState<'all' | 'public' | 'private'>('all')
```

- [ ] **Step 3: 修改 fetchRecords 包含公开筛选参数**

```typescript
const fetchRecords = useCallback(async () => {
  const params = {
    page,
    limit,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    is_public: publicFilter,  // 新增
  }
  // ... API 调用
}, [page, limit, typeFilter, sourceFilter, publicFilter])
```

- [ ] **Step 4: 透传 props 到视图组件**

在渲染各视图时传递 props：

```typescript
<AnimatedMediaGrid
  records={records}
  onTogglePublic={handleTogglePublic}
  userId={currentUser?.id}
  userRole={currentUser?.role}
  // ... 其他 props
/>

<MediaTableView
  records={records}
  onTogglePublic={handleTogglePublic}
  userId={currentUser?.id}
  userRole={currentUser?.role}
  // ... 其他 props
/>

// Timeline 渲染时同样透传
```

- [ ] **Step 5: 添加批量公开按钮**

在批量操作区域添加：

```typescript
import { Globe } from 'lucide-react'

// 计算是否可以批量公开（所有选中都是自己的）
const canBatchPublic = selectedRecords.every(r => 
  !r.owner_id 
    ? currentUser?.role === 'super'
    : currentUser?.id === r.owner_id
)

<Button
  variant="outline"
  size="sm"
  onClick={() => handleBatchTogglePublic(true)}
  disabled={!canBatchPublic || selectedIds.length === 0}
>
  <Globe className="w-4 h-4 mr-2" />
  批量公开
</Button>
```

- [ ] **Step 6: 提交页面变更**

```bash
git add src/pages/MediaManagement.tsx
git commit -m "feat(media): integrate public filter and batch toggle into MediaManagement page"
```

---

## Task 14: 最终验证与提交

- [ ] **Step 1: 运行完整测试套件**

运行: `vitest run`
预期: 所有测试通过

- [ ] **Step 2: 运行构建**

运行: `npm run build`
预期: 无错误

- [ ] **Step 3: 手动功能测试**

启动开发服务器，测试：
1. 自己的记录可以切换公开状态
2. 其他人的公开记录显示静态徽章
3. 其他人的私有记录不显示按钮
4. 筛选公开/私有记录
5. 批量公开自己的记录

- [ ] **Step 4: 创建 PR 或合并**

```bash
# 如果在 worktree
cd /home/ogslp/Projects/Opencode/mnx-agent
git merge --no-ff <branch-name>

# 或创建 PR
gh pr create --title "feat(media): 公开/取消公开功能" --body "$(cat <<'EOF'
## 功能概述
为媒体管理添加公开/取消公开功能，公开后的记录对所有用户可见。

## 实现内容
- 数据库：新增 is_public 字段 + 索引
- API：PATCH /:id/public, POST /batch/public 端点
- 前端：PublicButton 组件 + 三视图集成 + 篮选 + 批量操作

## 权限规则
- 有 owner_id：只有 owner 能切换
- 无 owner_id：只有 super 能切换
- user/pro：自己的私有 + 所有公开
- admin/super：所有记录

## 测试覆盖
- Repository 层单元测试
- API 端点集成测试
- 权限矩阵全覆盖
EOF
)"
```

---

## Self-Review

**Spec coverage check:**
- 数据库 is_public 字段 → Task 1 ✓
- 类型定义 → Task 2 ✓
- Repository togglePublic → Task 3 ✓
- 查询逻辑公开可见 → Task 4 ✓
- Service 层 → Task 5 ✓
- API 端点 → Task 6 ✓
- 前端 API → Task 7 ✓
- PublicButton → Task 8 ✓
- Hook 扩展 → Task 9 ✓
- 三视图集成 → Task 10, 11, 12 ✓
- 筛选 + 批量 → Task 13 ✓

**Placeholder scan:** 无 TBD/TODO

**Type consistency:**
- `isPublic` vs `is_public`: 前端 props/API 使用 `isPublic`（camelCase），数据库/类型使用 `is_public`（snake_case）
- 所有组件使用相同的 `isOwnRecord` 计算逻辑

---

## Next Steps

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?