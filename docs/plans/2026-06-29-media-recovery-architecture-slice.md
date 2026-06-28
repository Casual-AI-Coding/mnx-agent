# 媒体恢复架构切片实现计划

> **执行约束**：当前计划在主分支当前 session 内执行，不使用 sub agent，不向用户提问。所有实现遵循 TDD、TypeScript strict、DDD 分层、SOLID 与项目 `AGENTS.md` 约束。

**Goal:** 将 `server/routes/media.ts` 中媒体恢复相关的响应解析、资源 URL 提取、重复恢复过滤、恢复记录构建下沉到领域服务纯函数，让路由只保留 HTTP 编排与持久化调用。

**Architecture:** 本轮采用可验证的纵向切片，不做全仓大爆炸重写。新增 `server/services/domain/media-recovery.service.ts` 作为无副作用领域规则模块，路由从外部 API 日志与媒体记录读取数据后调用领域函数生成候选或恢复计划，再调用现有 `saveFromUrl()` 与 `MediaService.create()` 完成落库。

**Tech Stack:** Express、TypeScript、Vitest、现有 `ExternalApiLogRepository`、`MediaService`、`media-storage`。

---

## 范围

### 本轮包含

- 新增媒体恢复领域规则纯函数。
- 为媒体恢复候选列表与单条恢复计划编写单元测试。
- 移除 `server/routes/media.ts` 中两份重复的 `OPERATION_MEDIA_MAP`。
- 消除恢复逻辑中的空 `catch` 与恢复路径上的类型断言。
- 保持现有 API 路径、响应字段、数据库结构和媒体保存流程不变。

### 本轮不包含

- 不重构 `MediaRepository` 的大文件问题。
- 不拆分整个 `server/routes/media.ts`。
- 不替换 Express、axios 或现有 DI 容器。
- 不修改认证、审计、文件存储目录或外部 API 日志表结构。

---

## 文件结构

### 新增

- `server/services/domain/media-recovery.service.ts`
  - 负责支持的媒体恢复 operation 映射。
  - 负责安全解析 `response_body`。
  - 负责从响应中提取资源 URL。
  - 负责根据已有媒体 metadata 过滤已恢复资源。
  - 负责构造恢复候选与恢复计划。

- `server/services/domain/__tests__/media-recovery.service.test.ts`
  - 覆盖候选生成、重复过滤、无效 JSON 跳过、恢复计划成功与错误分支。

### 修改

- `server/services/domain/index.ts`
  - 导出媒体恢复领域服务。

- `server/routes/media.ts`
  - `GET /recoverable` 改为调用领域函数生成候选。
  - `POST /recover/:logId` 改为调用领域函数生成恢复计划。
  - 保留数据库读取、owner_id 隔离、文件下载保存、响应转换。

---

## 任务分解

### Task 1: 写入计划文档

- [x] 创建 `docs/plans/2026-06-29-media-recovery-architecture-slice.md`。
- [ ] 自检文档没有未完成标记、模板残留与未决问题。
- [ ] 提交文档：`docs: 增加媒体恢复架构切片计划`。

### Task 2: RED - 先写媒体恢复领域单元测试

**Files:**
- Create: `server/services/domain/__tests__/media-recovery.service.test.ts`

**测试行为：**
- 给定 image/music/voice 三类成功日志，生成未恢复候选。
- 给定已有媒体 metadata 中存在 `source_url` 或 `external_api_log_id`，过滤重复候选。
- 给定不支持 operation、无 `response_body` 或无效 JSON，不抛出且不生成候选。
- 给定成功日志，生成包含 `resourceUrl`、`originalName`、`type`、`source`、`metadata` 的恢复计划。
- 给定请求的 `resource_url` 不存在于日志响应中，返回 `resource_url_not_found`。

**验证命令：**

```bash
npm run test:server -- server/services/domain/__tests__/media-recovery.service.test.ts
```

**期望：** 失败原因为 `media-recovery.service` 模块不存在或导出函数不存在。

### Task 3: GREEN - 实现媒体恢复领域服务

**Files:**
- Create: `server/services/domain/media-recovery.service.ts`
- Modify: `server/services/domain/index.ts`

**实现要求：**
- 不依赖 Express、数据库连接、Repository 或文件系统。
- 对 JSON 解析返回 Result union，不在领域函数中抛 expected error。
- 使用 `unknown` + narrowing 解析外部响应，不使用 `any`、`as any`、`@ts-ignore`。
- operation 分支使用明确 switch，避免动态索引造成类型断言。
- 输出 metadata 保持现有字段：`source_url`、`external_api_log_id`、`operation`、`service_provider`、`restored_from_log`，音乐额外包含 `song_title`、`lyrics`。

**验证命令：**

```bash
npm run test:server -- server/services/domain/__tests__/media-recovery.service.test.ts
```

**期望：** 单测通过。

### Task 4: 提交领域服务批次

**Files:**
- `server/services/domain/media-recovery.service.ts`
- `server/services/domain/__tests__/media-recovery.service.test.ts`
- `server/services/domain/index.ts`

**提交消息：**

```text
refactor(media): 提取媒体恢复领域规则
```

**提交前验证：**
- 单测通过。
- LSP diagnostics 检查新增/修改 TypeScript 文件。
- 只 stage 本批次文件，不 stage `docs/scan/2026-05-17-auto-code-review.md`。

### Task 5: 迁移媒体路由恢复逻辑

**Files:**
- Modify: `server/routes/media.ts`

**实现要求：**
- 删除两份路由内 `OPERATION_MEDIA_MAP`。
- 删除路由内 `ApiResponseData`。
- `GET /recoverable`：查询外部日志与已有媒体后调用 `buildRecoverableMediaCandidates()`。
- `POST /recover/:logId`：校验 log 后调用 `createMediaRecoveryPlan()`，路由只做 HTTP 错误映射、文件保存、落库。
- 恢复路径不使用空 `catch`，不使用 `(error as Error).message`。

**验证命令：**

```bash
npm run test:server -- server/services/domain/__tests__/media-recovery.service.test.ts server/routes/__tests__/media-safety.test.ts
```

**期望：** 单元测试与路由安全测试通过。

### Task 6: Review 与质量门禁

**检查项：**
- `server/routes/media.ts` 中 `OPERATION_MEDIA_MAP` 搜索结果为 0。
- 恢复相关路径不存在空 `catch`。
- 新增文件纯 LOC 小于 250。
- `server/routes/media.ts` 仍大于 250 行，记录为遗留风险而不是本轮继续扩散范围。
- 新增领域服务单一职责明确：媒体恢复规则。

### Task 7: 最终验证与提交路由迁移

**验证命令：**

```bash
npm run test:server -- server/services/domain/__tests__/media-recovery.service.test.ts server/routes/__tests__/media-safety.test.ts
npm run build
```

**提交消息：**

```text
refactor(media): 下沉媒体恢复路由业务逻辑
```

**完成标准：**
- 所有计划任务完成。
- 相关测试和构建通过，或明确记录与本次改动无关的既有失败。
- git 历史包含文档、领域服务、路由迁移的原子提交。

---

## 风险与后续切片

- `server/routes/media.ts` 本轮只治理恢复相关业务逻辑，文件整体仍偏大；后续应继续按上传、下载、批量操作拆分应用服务。
- `server/repositories/media-repository.ts` 仍明显超过 250 纯 LOC；后续应按查询构建、行映射、写操作拆分。
- `DatabaseService` facade 仍承担多领域转发；后续应逐步将领域服务改为依赖窄接口 Repository Port。
