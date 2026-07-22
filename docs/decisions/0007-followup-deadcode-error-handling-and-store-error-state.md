# ADR-0007: Followup——死代码删除、错误状态识别与 Store 错误状态修复

## Status

Accepted

---

## Context

ADR-0006 完成后的 code-review-expert 评审与最终验证暴露 4 项 follow-up,经探索后确认:

### 问题清单

**P1 — `database/services/` 8 个文件是死代码(非"三套并存")**

- `server/database/services/` 下 8 个文件(job/task/log/workflow/media/material/dlq/system-service)**零引用**
- `server/database/index.ts` re-export 这 8 个 service,也**零引用**
- 历史溯源:commit `c1fd371 refactor(backend): service-async 拆分为按业务域的独立 Service 文件`(2026-05-05)将业务逻辑迁到 `services/domain/`,**遗留了旧薄壳**
- `registerServiceDependencies()` 中**只注册 `services/domain/`**,完全不碰 `database/services/`
- verbatim 已读 `database/services/job-service.ts`(78 行)确认纯薄壳:每个方法都只 `return this.jobRepo.xxx()`,无业务逻辑

**P2 — `asyncHandler` / `errorHandler` 不识别 `error.status`,导致 4xx 被误判为 500**

- `server/middleware/asyncHandler.ts`(43 行):`.catch(error: Error & { code?: number })` → 只读 `error.code`,**不读 error.status**
- `server/middleware/errorHandler.ts` 同样只识别 code
- 项目既有约定 `throw { status, message }` 共 **14 处(7 文件)**,asyncHandler/handleApiError 都不识别 status 字段——**项目级 latent bug**
- ADR-0006 Phase 2 引入的 `/chat/stream` 已用 inner try/catch + `errorResponse(res, msg, 400)` 绕过此 bug,但 `/chat` 端点仍走 createApiProxyRouter,校验失败会被误判 500

**P3 — 前端 `webhooks.test.ts` 3 个 pre-existing 失败**

- 失败用例:`addWebhook`/`updateWebhook`/`removeWebhook` 各 1 个,测试 `expect(result.current.error).toBe('...')` 实际收到 `null`
- 根因链(verbatim 已读 `src/lib/api/create-api-method.ts:50-52`、`src/stores/patterns/list-store.ts:34-48`):
  1. `createApiMethod` 内部 `catch (error) { return toApiResponse(error) }`——**永远 resolve**,从不 reject
  2. 测试 mock 用 `mockResolvedValue({ success: false, error })` 模拟"API 业务失败"
  3. `withLoadingState` 走 try/success 分支(`set({ loading: false })`)→ 返回 `{ success: false, error }`
  4. `addWebhook` 中 `if (!response.success) throw new Error(response.error)` → 抛给 caller
  5. **`store.error` 从未被设置**(withLoadingState catch 没走到)
  6. 测试断言 `error === '...'` 失败,实际 `error === null`
- 这是 commit `15a39d6 refactor(frontend): 提取 Zustand Store withLoadingState 共享模式` 的回归

**P4 — 前端大文件拆分(已不需要)**

- 经核查,`MediaManagement.tsx` 现 225 行(已拆出 MediaGrid/MediaUploader),`WorkflowBuilder.tsx` 现 325 行(已拆出 CanvasPanel/ConfigPanel/Toolbar/VersionPanels 等)
- 探索阶段的"1188/1139 行"数据已过时
- **本次不做**(Phase D 取消)

---

## Decision

**方案:三项独立修复,每项独立验证 + commit**

### Phase A: asyncHandler / errorHandler 同时识别 `error.status`

- `asyncHandler` 与 `errorHandler` 的 catch 类型扩展为 `Error & { code?: number; status?: number }`
- 优先级:**status 优先于 code**(若同时存在,status 是显式 HTTP 语义)
- 向后兼容:不传 status 的代码路径行为不变
- 替代方案(已否决):
  - ❌ 让 `buildChatRequestBody` 抛真正的 Error 子类(`code=400`):触及 14 处 throw,改动面大
  - ❌ 引入 Zod schema 替代手动校验:超 follow-up 范围

### Phase B: webhooks store 在 `response.success === false` 分支显式 `set({ error })`

- `src/stores/webhooks.ts` 的 `addWebhook`/`updateWebhook`/`removeWebhook` 在处理 `!response.success` 时,**先 `set({ error: response.error })` 再 throw**
- 保持现有 throw 行为(向后兼容 caller 的 try/catch)
- 替代方案(已否决):
  - ❌ 改 `createApiMethod` 在 `!response.success` 时 reject:影响面广,所有 store 的成功/失败路径都受影响
  - ❌ 改 `withLoadingState` 检查返回值 success 字段:违反 SRP(`withLoadingState` 只应负责 loading/error 状态机,业务语义由调用方决定)

### Phase C: 删除 `database/services/` 整个目录 + 清理 `database/index.ts` re-export

- 删除 8 个文件:`job-service.ts`、`task-service.ts`、`log-service.ts`、`workflow-service.ts`、`media-service.ts`、`material-service.ts`、`dlq-service.ts`、`system-service.ts`
- 清理 `server/database/index.ts` 中对上述 8 个 service 的 re-export
- **不删** `database/index.ts` 本身(它还导出 `repositories`、`DatabaseService` 等其他符号,需保留)
- 替代方案(已否决):
  - ❌ 保留以备未来使用:违反 YAGNI,死代码增加维护成本
  - ❌ 先标记 `@deprecated`:已零引用,标记无意义

---

## Consequences

### Positive

- **死代码清除**:删除 8 个文件 + 8 个 re-export,降低维护成本、减少新人理解负担
- **错误状态正确**:4xx 错误不再被误判 500,客户端收到正确的状态码与错误消息
- **前端测试可信度**:3 个 pre-existing 失败修复,`npm run test:coverage` 全绿
- **改动面可控**:每项独立 commit,失败可单独回滚

### Negative

- `error.status` 与 `error.code` 并存增加未来维护者的认知成本(需文档说明优先级)
- webhooks store 的 `set({ error }) + throw` 模式略冗余(但符合"调用方契约不变"原则)

### Risks

- 低:Phase A 改动中间件,需配套 asyncHandler/errorHandler 测试覆盖 status 字段
- 低:Phase B 改动仅触及 webhooks store 3 个方法,测试已锁定行为
- 零:Phase C 纯删除零引用文件,tsc + 测试可立即验证

---

## Metadata

| Field | Value |
|------|-------|
| Date | 2026-07-23 |
| Status | Accepted |
| Decider | Sisyphus (AI Code Review) |
| Reviewed by | oGsLP |
| Supersedes | 无 |
| Related | `@docs/decisions/0006-di-typing-and-route-config-consolidation.md`、`@docs/specs/2026-04-05-architecture-upgrade-design.md` |
