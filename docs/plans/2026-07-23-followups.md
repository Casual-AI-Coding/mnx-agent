# 实施计划:Followup——死代码删除、错误状态识别与 Store 错误状态修复

> 配套 ADR:`@docs/decisions/0007-followup-deadcode-error-handling-and-store-error-state.md`

## 范围

**实施**:
- Phase A:asyncHandler / errorHandler 识别 `error.status`
- Phase B:webhooks store 在 `response.success === false` 分支显式 `set({ error })`
- Phase C:删除 `database/services/` 死代码 + 清理 `database/index.ts`

**不实施**(经探索确认无需处理):
- 前端大文件拆分(MediaManagement.tsx 225 行、WorkflowBuilder.tsx 325 行,均已在合理范围)

---

## Phase A: asyncHandler / errorHandler 识别 error.status

### 文件改动

**修改**:
- `server/middleware/asyncHandler.ts`(43 行):catch 类型扩展为 `Error & { code?: number; status?: number }`,优先返回 status
- `server/middleware/errorHandler.ts`:同步扩展,优先识别 status
- `server/middleware/__tests__/asyncHandler.test.ts`(或对应测试文件):新增 status 字段识别测试用例
- `server/middleware/__tests__/errorHandler.test.ts`:同上

### 任务分解(TDD)

**Task A.1(RED)**:为 asyncHandler 添加测试:thrown 对象含 `status: 400` 时,响应 status=400 且 body 含 message
**Task A.2(RED)**:为 errorHandler 添加同上测试
**Task A.3(GREEN)**:修改 asyncHandler,优先识别 status
**Task A.4(GREEN)**:修改 errorHandler,优先识别 status
**Task A.5(VERIFY)**:`rtk npx tsc --noEmit -p tsconfig.server.json` + `rtk npm run test -- --run server/middleware/__tests__/`
**Task A.6(COMMIT)**:`fix(middleware): asyncHandler 与 errorHandler 优先识别 error.status 避免 4xx 误判 500`

---

## Phase B: webhooks store 显式 set error

### 文件改动

**修改**:
- `src/stores/webhooks.ts`:`addWebhook`/`updateWebhook`/`removeWebhook` 3 处,在 `!response.success` 分支**先 `set({ error: response.error })` 再 throw**

### 任务分解(TDD)

**Task B.1(GREEN)**:直接修改 webhooks.ts 3 个方法(测试已存在,只需让原有断言通过)
**Task B.2(VERIFY)**:`rtk npm run test -- --run src/stores/__tests__/webhooks.test.ts` → 3 个失败转通过
**Task B.3(COMMIT)**:`fix(stores): webhooks store 在 response.success=false 时显式 set error 修复 withLoadingState 错误状态丢失`

---

## Phase C: 删除 database/services/ 死代码

### 文件改动

**删除**(8 个):
- `server/database/services/job-service.ts`
- `server/database/services/task-service.ts`
- `server/database/services/log-service.ts`
- `server/database/services/workflow-service.ts`
- `server/database/services/media-service.ts`
- `server/database/services/material-service.ts`
- `server/database/services/dlq-service.ts`
- `server/database/services/system-service.ts`

**修改**:
- `server/database/index.ts`:删除对上述 8 个 service 的 re-export(保留 repositories、DatabaseService 等其他符号)

### 任务分解

**Task C.1(删除)**:`rtk rm` 删除 8 个文件
**Task C.2(清理)**:Edit `database/index.ts`,删除 8 个 re-export 行
**Task C.3(VERIFY)**:`rtk npx tsc --noEmit -p tsconfig.server.json` + `rtk npm run test -- --run server/database/`
**Task C.4(COMMIT)**:`refactor(database): 删除 database/services/ 8 个零引用死代码 + 清理 database/index.ts re-export`

---

## 验证基线

每个 Phase 完成后:
- `rtk npx tsc --noEmit -p tsconfig.server.json` → No errors found
- 相关目录测试通过

全部完成后(阶段5):
- `npm run build` → 0 错误(允许 pre-existing warning)
- `npm run test:coverage` → 后端 ≥80% / 前端 >70%(前端 webhooks 3 个失败转通过,无其他新失败)
- 整体退出码 0

---

## commit 规范

- `fix(middleware): asyncHandler 与 errorHandler 优先识别 error.status 避免 4xx 误判 500`
- `fix(stores): webhooks store 在 response.success=false 时显式 set error 修复 withLoadingState 错误状态丢失`
- `refactor(database): 删除 database/services/ 8 个零引用死代码 + 清理 database/index.ts re-export`

---

## 风险与回滚

- 每项独立 commit,失败可单独 `git revert <hash>`
- Phase A 风险:中间件改动面广,但纯增量(status 字段优先),向后兼容
- Phase B 风险:仅触及 webhooks store,测试已锁定行为
- Phase C 风险:零(纯删除零引用文件,tsc + 测试可立即验证)
