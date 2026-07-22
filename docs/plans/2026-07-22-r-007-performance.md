# R-007 性能优化 — 实现计划

> **日期**: 2026-07-22
> **目标版本**: v3.1
> **状态**: 已完成
> **范围**: 上传/下载流式化 + WebSocket 媒体事件 + 数据库复合索引

---

## 背景

上传/下载链路为同步阻塞：multer `memoryStorage` 把整文件读入 Buffer、`axios.get(arraybuffer)` 拉远程文件入内存、`readMediaFile` 全文件读出后再 `res.send(buffer)`、批量下载把每条记录都 `readMediaFile` 后 `archive.append(buffer)`。大文件或并发上传下载会让 Node 进程内存急剧膨胀。前端懒加载（`src/App.tsx` 47 个 `React.lazy` 页面）已就绪，不需要再改。

---

## 前置条件确认

| 条件 | 状态 |
|------|------|
| 前端 47 页面 `React.lazy + Suspense + ErrorBoundary` | ✅ `src/App.tsx` 已就绪 |
| WebSocket `CronEventEmitter` + 多 channel 转发 | ✅ `server/services/websocket-service.ts` 可扩展 |
| `buildMediaDownloadPlan` buffer-based helper | ✅ 保留向后兼容 |
| 现有 media_records / audit_logs 单列索引 | ✅ 已存在，需补充高频复合索引 |

---

## Wave 1 — 媒体存储流式 API（`server/lib/media-storage.ts`）

新增四个公共导出（保留 `saveMediaFile`/`readMediaFile`/`saveFromUrl` 向后兼容）：

| API | 签名 | 用途 |
|-----|------|------|
| `saveMediaFromFile` | `(sourcePath, originalName, type, mediaRoot?)` | 从 multer diskStorage 临时文件流式复制到媒体目录 |
| `saveMediaFromStream` | `(stream: Readable, originalName, type, mediaRoot?)` | 从任意 Readable 流式落盘 |
| `createMediaReadStream` | `(filepath, mediaRoot?, range?: {start, end})` | 创建读取流 + 返回完整 size，支持 HTTP Range |
| `saveStreamFromUrl` | `(url, originalName, type, mediaRoot?, options?: {timeoutMs, maxBytes})` | 远程下载流式写入，含 Transform 字节守卫；失败 `fs.unlink` 清理 |

实现要点：
- `pipeline` (from `stream/promises`) + `createReadStream`/`createWriteStream` 组合，零整文件 Buffer
- `saveStreamFromUrl` 用 axios `responseType: 'stream'` + `maxContentLength`/`maxBodyLength` + 自定义 Transform 双层字节守卫
- 测试环境守卫（拒绝 `./data/media`）覆盖全部新 API

---

## Wave 2 — 下载计划 helper（`server/routes/media/media-download-helpers.ts`）

新增 `buildStreamingDownloadPlan(input)`：
- 输入：`{ fileSize, filename, originalName?, mimeType?, rangeHeader? }`
- 输出联合类型：
  - 200: `{ statusCode: 200, headers, range: null }`
  - 206: `{ statusCode: 206, headers, range: { start, end, length } }`
- 不含 `body` 字段 — 流式由调用方 `stream.pipe(res)`

复用既有私有 `parseRangeHeader` / `buildBaseHeaders`，逻辑与 `buildMediaDownloadPlan` 完全一致。`buildMediaDownloadPlan`（buffer-based）保留供旧测试调用。

---

## Wave 3 — 路由重构（`server/routes/media.ts`）

### 3.1 multer 改 diskStorage

- 临时目录：`UPLOAD_TMP_DIR = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'mnx-agent-uploads')`
- 启动时 `void fs.mkdir(UPLOAD_TMP_DIR, { recursive: true })`
- 上限 `UPLOAD_MAX_BYTES = 100 * 1024 * 1024`
- 文件名 `${Date.now()}-${rand}-${base64url(originalName).slice(0,32)}`
- 新 helper `cleanupTmpFile(path)`：`fs.unlink` + ENOENT 静默

### 3.2 POST `/upload`

multer 把文件写到 `req.file.path` → `saveMediaFromFile(req.file.path, ...)` → try/finally `cleanupTmpFile`。metadata/uploadFields 解析失败也清理临时文件。

### 3.3 POST `/upload-from-url`

`saveStreamFromUrl(url, filename ?? default, type, undefined, { timeoutMs, maxBytes })`。失败返回 502 + warn 日志。`mime_type` 改为 `application/octet-stream`（流式不预读 headers）。

### 3.4 GET `/:id/download`

- `createMediaReadStream(filepath, undefined, undefined)` → `{ stream, size }`
- `buildStreamingDownloadPlan({ fileSize: size, filename, originalName, mimeType, rangeHeader })`
- set headers + status
- 若有 range：再 `createMediaReadStream(filepath, undefined, { start, end })` 取 ranged stream
- `stream.pipe(res)`
- 文件 ENOENT → 404

### 3.5 POST `/batch/download`

不再 `readMediaFile`。改用 `archive.file(record.filepath, { name })` 流式附加。新增 `pickUniqueBatchName(name, seen)` 处理重名（`stem (1).ext` 递增）。

---

## Wave 4 — WebSocket 媒体事件（`server/services/websocket-service.ts`）

`CronEvent.type` 联合类型扩展：

```typescript
'media_upload_completed' | 'media_download_completed' | 'media_batch_downloaded'
```

`CronEventEmitter` 新增 3 个 emit 方法（均通过 `this.emit('media_event', {...})`）：
- `emitMediaUploadCompleted({ recordId, ownerId?, type, sizeBytes, source })`
- `emitMediaDownloadCompleted({ recordId, ownerId?, sizeBytes })`
- `emitMediaBatchDownloaded({ ownerId?, recordCount, totalBytes })`

新增 `handleMediaEvent` → `sendToSubscribedClients('media', event)`，`registerEventForwarders` / `unregisterEventForwarders` 注册 `'media_event'` 监听。

`routes/media.ts` 触发点：
- POST `/upload` 成功 → `emitMediaUploadCompleted`
- POST `/upload-from-url` 成功 → `emitMediaUploadCompleted`
- GET `/:id/download` 流式响应前 → `emitMediaDownloadCompleted`
- POST `/batch/download` `archive.finalize()` 前 → `emitMediaBatchDownloaded`（`totalBytes` = `records.size_bytes` 求和）

---

## Wave 5 — 数据库复合索引（`migration_041`）

`server/database/migrations/041_media_perf_indexes.ts`：

```sql
CREATE INDEX IF NOT EXISTS idx_media_records_owner_deleted_created
  ON media_records(owner_id, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_records_owner_type_deleted
  ON media_records(owner_id, type, is_deleted);
```

覆盖最高频的「按 owner 过滤 + 软删除过滤 + 时间倒序」用户列表查询模式，以及「按用户查审计日志」和「按 owner+type 过滤媒体」。

已接入 `migrations-async.ts`（line 18 import + 末尾 MIGRATIONS 数组）。

---

## Wave 6 — 测试

### `server/lib/__tests__/media-storage.test.ts`

新增 describe 块覆盖 4 个流式 API：
- `saveMediaFromFile`：5 测试（内容/源文件保留/扩展名/大文件/源不存在）
- `saveMediaFromStream`：4 测试（基本/多 chunk/默认扩展名/源流错误）
- `createMediaReadStream`：5 测试（完整/Range 切片/Range 仍报完整 size/文件不存在/路径穿越）
- `saveStreamFromUrl`：6 测试（基本/options 透传/默认值/网络错误/maxBytes 守卫+清理/默认扩展名）
- 测试环境守卫：4 个新 API 拒绝 `./data/media`

辅助函数：`collectStream(stream)` 收集为 Buffer；`countFilesRecursive(root)` 验证 maxBytes 失败时无残留文件。

### `server/routes/__tests__/media-download-helpers.test.ts`

新增 `describe('buildStreamingDownloadPlan')` 11 测试：
- 200 计划（无 range）
- 无 body（断言 `not.toHaveProperty('body')`）
- 206 bounded range
- range end 超出 fileSize 时 clamp
- `bytes=N-` 缺省 end
- 畸形 range header 退化为 200
- start 超出 fileSize 退化为 200
- 倒置 range（end<start）退化为 200
- originalName 优先于 filename
- 仅 filename 时 Content-Disposition
- mimeType=null 退化为 `application/octet-stream`

### `server/routes/__tests__/media-safety.test.ts`

- `vi.hoisted` 新增 `saveMediaFromFile`/`saveStreamFromUrl`/`createMediaReadStream` mock
- `vi.mock('../../lib/media-storage')` 增加映射
- 重写「远程下载超时与体积限制」测试：断言 `saveStreamFromUrl` 第 5 参数 `{timeoutMs:30000, maxBytes:Number}`
- 新增「远程下载失败返回 502」测试

### `server/database/__tests__/media-perf-indexes-migration.test.ts`（新文件）

5 测试覆盖 migration_041：注册、3 个索引 SQL 各自包含、3 个索引均用 `IF NOT EXISTS`。

---

## 验证清单

| 验证项 | 命令 | 结果 |
|--------|------|------|
| 新增/修改测试单文件 | `./node_modules/.bin/vitest run --config vitest.server.config.ts server/database/__tests__/media-perf-indexes-migration.test.ts server/routes/__tests__/media-download-helpers.test.ts server/lib/__tests__/media-storage.test.ts` | 3 files / 99 tests passed |
| 媒体/路由/WS 回归 | `./node_modules/.bin/vitest run --config vitest.server.config.ts server/routes/__tests__/ server/lib/__tests__/ server/services/websocket-service.test.ts` | 39 files / 417 tests passed |
| Database 测试目录 | `./node_modules/.bin/vitest run --config vitest.server.config.ts server/database/__tests__/` | 5 files / 59 tests passed |

---

## 变更文件清单

**新增**：
- `server/database/migrations/041_media_perf_indexes.ts`
- `server/database/__tests__/media-perf-indexes-migration.test.ts`
- `docs/plans/2026-07-22-r-007-performance.md`（本文件）

**修改**：
- `server/lib/media-storage.ts`（+4 流式 API）
- `server/routes/media/media-download-helpers.ts`（+`buildStreamingDownloadPlan`）
- `server/routes/media.ts`（multer diskStorage + 流式上传下载 + WebSocket 触发）
- `server/services/websocket-service.ts`（+3 media 事件 + emit/forwarder）
- `server/database/migrations-async.ts`（+migration_041）
- `server/routes/__tests__/media-safety.test.ts`（mock 适配）
- `server/lib/__tests__/media-storage.test.ts`（+流式 API 测试）
- `server/routes/__tests__/media-download-helpers.test.ts`（+streaming plan 测试）
- `docs/roadmap/requirement-pools.md`（R-007 状态 → 已完成）
- `docs/roadmap/v3-roadmap.md`（R-007 状态 → 已完成）

---

## 禁止事项

- ❌ 禁止 `as any` / `@ts-ignore`
- ❌ 禁止删除现有测试以通过覆盖率
- ❌ 禁止引入新 npm 依赖（`archiver`/`multer`/`axios` 已存在）
- ❌ 禁止把 `saveMediaFile`/`readMediaFile`/`buildMediaDownloadPlan`/`saveFromUrl` 删除（其他模块仍依赖）

---

## 已知遗留 / 未在范围内

| 项 | 说明 |
|----|------|
| 前端懒加载 | R-007 范围声明中包含，但 `src/App.tsx` 已 100% 用 `React.lazy` 完成，无需改动 |
| `tsconfig.json:18` `baseUrl: '.'` | TypeScript 5.9.3 已移除该选项，预先存在问题（从初始提交起），不在 R-007 范围内 |
| 实测生产负载压测 | 不在 R-007 实现范围；后续可在 v3.1 release 验证时单独跑 |
