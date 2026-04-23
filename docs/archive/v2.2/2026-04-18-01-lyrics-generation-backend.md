# 歌词生成功能 - Backend 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 MiniMax 歌词生成 API 的后端集成，包括 client 方法、路由、migration 和类型定义。

**Architecture:** 扩展 MiniMaxClient 添加 lyricsGeneration 方法，使用 createApiProxyRouter 创建路由，migration 扩展 CHECK constraint，shared-types 扩展 MediaType/MediaSource。

**Tech Stack:** Express, TypeScript, PostgreSQL, axios

**Spec:** @docs/specs/lyrics-generation-design.md

---

## File Structure

**Create:**
- `server/routes/lyrics.ts` - 歌词生成路由
- `server/database/migrations/029_lyrics_type.ts` - migration 文件

**Modify:**
- `server/lib/minimax.ts:250+` - 添加 lyricsGeneration 方法
- `server/index.ts:15` - import lyricsRouter
- `server/index.ts:93` - register lyrics router
- `server/index.ts:136` - register lyricsGeneration in service registry
- `server/database/migrations-async.ts:8` - import migration_029
- `server/database/migrations-async.ts:578` - add migration to MIGRATIONS array
- `packages/shared-types/entities/enums.ts:43-50` - extend MediaType/MediaSource

---

## Task 1: MiniMax Client - lyricsGeneration Method

**Files:**
- Modify: `server/lib/minimax.ts:250+`
- Test: `server/lib/__tests__/minimax.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/lib/__tests__/minimax.test.ts (append to existing file)

describe('lyricsGeneration', () => {
  it('should call /v1/lyrics_generation with correct body', async () => {
    const mockAxiosCreate = vi.mocked(axios.create)
    const mockClient = {
      post: vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
        data: {
          song_title: 'Test Song',
          style_tags: ['pop', 'emotional'],
          lyrics: '[Verse 1]\nTest lyrics...',
          base_resp: { status_code: 0, status_msg: 'success' }
        }
      })
    }
    mockAxiosCreate.mockReturnValue(mockClient as unknown as AxiosInstance)

    const client = new MiniMaxClient('test-api-key', 'domestic')
    const result = await client.lyricsGeneration({
      mode: 'write_full_song',
      prompt: 'A song about love'
    })

    expect(mockClient.post).toHaveBeenCalledWith(
      '/v1/lyrics_generation',
      { mode: 'write_full_song', prompt: 'A song about love' }
    )
    expect(result).toEqual({
      song_title: 'Test Song',
      style_tags: ['pop', 'emotional'],
      lyrics: '[Verse 1]\nTest lyrics...',
      base_resp: { status_code: 0, status_msg: 'success' }
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run server/lib/__tests__/minimax.test.ts -t lyricsGeneration`
Expected: FAIL with "Property 'lyricsGeneration' does not exist"

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/lib/minimax.ts (append after musicGeneration method, around line 227)

async lyricsGeneration(body: Record<string, unknown>): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/lyrics_generation',
    'lyrics_generation',
    body,
    async () => retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/lyrics_generation', body, {
          timeout: 60000, // 1 minute for lyrics generation
        })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  )()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run server/lib/__tests__/minimax.test.ts -t lyricsGeneration`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/lib/minimax.ts server/lib/__tests__/minimax.test.ts
git commit -m "feat(minimax): add lyricsGeneration method"
```

---

## Task 2: Lyrics Route

**Files:**
- Create: `server/routes/lyrics.ts`
- Modify: `server/index.ts:15,93`

- [ ] **Step 1: Create lyrics route file**

```typescript
// server/routes/lyrics.ts

import { Router, Request } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

interface LyricsGenerateBody {
  mode?: 'write_full_song' | 'edit'
  prompt?: string      // max 2000 chars, for write_full_song
  lyrics?: string      // required for edit mode
  title?: string       // optional
}

// POST /generate - proxy to MiniMax lyrics_generation API
router.use('/generate', createApiProxyRouter({
  endpoint: '/',
  clientMethod: 'lyricsGeneration',
  buildRequestBody: (req: Request) => {
    const { mode, prompt, lyrics, title } = req.body as LyricsGenerateBody
    
    const body: Record<string, unknown> = {
      mode: mode || 'write_full_song'
    }
    
    // Edit mode requires lyrics
    if (mode === 'edit' && !lyrics) {
      throw { status: 400, message: 'lyrics is required for edit mode' }
    }
    
    // Prompt max length check
    if (prompt && prompt.length > 2000) {
      throw { status: 400, message: 'prompt must be less than 2000 characters' }
    }
    
    if (prompt) body.prompt = prompt
    if (lyrics) body.lyrics = lyrics
    if (title) body.title = title
    
    return body
  },
  extractClient: getClientFromRequest
}))

export default router
```

- [ ] **Step 2: Register route in server/index.ts**

```typescript
// server/index.ts (line 15, after musicRouter import)
import lyricsRouter from './routes/lyrics'

// server/index.ts (line 93, after music router registration)
app.use('/api/lyrics', lyricsRouter)
```

- [ ] **Step 3: Verify route registration**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/routes/lyrics.ts server/index.ts
git commit -m "feat(routes): add lyrics generation route"
```

---

## Task 3: Service Registry Registration

**Files:**
- Modify: `server/index.ts:136`

- [ ] **Step 1: Add lyricsGeneration to service registry**

```typescript
// server/index.ts (line 136, inside methods array after musicGeneration)
{ name: 'lyricsGeneration', displayName: 'Lyrics Generation', category: 'MiniMax API' },
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat(service-registry): register lyricsGeneration method"
```

---

## Task 4: Database Migration - CHECK Constraint Extension

**Files:**
- Create: `server/database/migrations/029_lyrics_type.ts`
- Modify: `server/database/migrations-async.ts:8,578`

- [ ] **Step 1: Create migration file**

```typescript
// server/database/migrations/029_lyrics_type.ts

import type { Migration } from '../migrations-async.js'

export const migration_029: Migration = {
  id: 29,
  name: 'migration_029_lyrics_type',
  sql: `
-- Extend media_records type CHECK constraint to include 'lyrics'
ALTER TABLE media_records DROP CONSTRAINT IF EXISTS media_records_type_check;
ALTER TABLE media_records ADD CONSTRAINT media_records_type_check 
  CHECK(type IN ('audio', 'image', 'video', 'music', 'lyrics'));

-- Extend media_records source CHECK constraint to include 'lyrics_generation'
ALTER TABLE media_records DROP CONSTRAINT IF EXISTS media_records_source_check;
ALTER TABLE media_records ADD CONSTRAINT media_records_source_check 
  CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 
                   'video_generation', 'music_generation', 'lyrics_generation'));
  `
}
```

- [ ] **Step 2: Import and register migration**

```typescript
// server/database/migrations-async.ts (line 8, after migration_028 import)
import { migration_029 } from './migrations/029_lyrics_type.js'

// server/database/migrations-async.ts (end of MIGRATIONS array, after migration_028)
migration_029,
```

- [ ] **Step 3: Verify migration compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/database/migrations/029_lyrics_type.ts server/database/migrations-async.ts
git commit -m "feat(db): add migration for lyrics type/source CHECK constraints"
```

---

## Task 5: Shared Types - MediaType/MediaSource Extension

**Files:**
- Modify: `packages/shared-types/entities/enums.ts:43-50`

- [ ] **Step 1: Extend MediaType type**

```typescript
// packages/shared-types/entities/enums.ts (line 43)
export type MediaType = 'audio' | 'image' | 'video' | 'music' | 'lyrics'
```

- [ ] **Step 2: Extend MediaSource type**

```typescript
// packages/shared-types/entities/enums.ts (line 45-51)
export type MediaSource = 
  | 'voice_sync' 
  | 'voice_async' 
  | 'image_generation' 
  | 'video_generation' 
  | 'music_generation'
  | 'lyrics_generation'
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/entities/enums.ts
git commit -m "feat(types): extend MediaType/MediaSource for lyrics"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run all backend tests**

Run: `vitest run server/`
Expected: All tests pass (or pre-existing failures noted)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Exit code 0

- [ ] **Step 3: Manual API test (optional)**

Start server and test:
```bash
curl -X POST http://localhost:4511/api/lyrics/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mode": "write_full_song", "prompt": "A song about hope"}'
```

---

## Completion Checklist

- [ ] MiniMaxClient.lyricsGeneration method implemented and tested
- [ ] Lyrics route registered at `/api/lyrics`
- [ ] Service registry includes lyricsGeneration
- [ ] Migration 029 adds 'lyrics' type and 'lyrics_generation' source
- [ ] MediaType/MediaSource types extended
- [ ] All tests pass
- [ ] Build succeeds
- [ ] All changes committed