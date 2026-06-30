# 媒体链路架构升级方案与实施计划

## 目标

本轮架构升级采用“纵向切片优先”的方式推进：先选择媒体管理链路作为可验证样板，避免一次性重写全仓导致风险失控。媒体链路同时覆盖前端 API、React Hook、后端 Route、Domain Service、Repository 与 PostgreSQL，是当前最适合落地 DDD 分层、SOLID、去重复和解耦的核心业务切片。

## 现状判断

- `src/hooks/useMediaManagement.ts` 超过 600 行，混合列表查询、筛选状态、分页、签名 URL 加载、下载副作用、乐观更新和 UI 对话框状态，SRP 违反明显。
- `src/lib/api/media.ts` 与 `src/types/media.ts` 重复定义媒体类型，并直接暴露 axios 实例，接口调用样板代码重复。
- `server/routes/media.ts`、`server/repositories/media-repository.ts` 文件过大，后续应继续拆分为请求解析、应用用例、领域策略与持久化查询对象。
- 既有测试覆盖较好：媒体后端路由/服务/仓储 107 个测试通过，前端媒体 hook/组件 22 个测试通过，可支撑安全重构。

## 架构决策

### 分层边界

媒体切片按以下边界推进：

1. **展示层**：页面与组件只消费 Hook 返回的状态与动作。
2. **前端应用层**：`useMediaManagement` 只编排状态，不直接承载可复用业务算法。
3. **前端领域辅助层**：新增媒体查询、分页、签名 URL、记录更新等纯函数模块，测试先行。
4. **API 适配层**：统一复用 `apiClient.get/post/put/patch/delete`，避免每个函数重复解包 axios response。
5. **后端应用层**：后续继续把 media route 中的请求解析、权限决策、批量操作拆成用例对象。
6. **基础设施层**：Repository 继续负责 SQL 和 row mapping，不承载业务策略。

### 本轮实施范围

为满足“高内聚低耦合”且保持可验证，本轮只做行为保持型重构，不引入新产品功能：

- 新增前端媒体领域辅助模块，抽出 `useMediaManagement` 中重复和硬编码的纯逻辑。
- 新增测试锁定媒体查询参数、分页页码、签名 URL 合并、媒体记录补丁更新行为。
- 收敛 `src/lib/api/media.ts` 到统一 API client 方法，消除 `client_` 泄漏和重复 `response.data`。
- 在后端新增媒体权限/过滤决策文档化计划，保留现有 route/service/repository 行为，先不做破坏性拆分。

## 场景契约

1. **Happy path**：媒体列表分页和筛选请求成功后，hook 更新 `records` 与 `pagination`。验证方式：`src/hooks/useMediaManagement.refill.test.ts`。
2. **Edge**：可播放媒体获取签名 URL 时部分失败，不阻断列表展示，只合并成功 URL。验证方式：新增媒体辅助函数单元测试。
3. **Regression**：后端 media route/service/repository 既有行为不变。验证方式：`npm run test:server -- server/routes/__tests__/media.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts`。
4. **Build**：全量构建继续通过。验证方式：`npm run build`。

## 实施步骤

1. 写失败测试：为媒体查询与记录更新纯函数新增单元测试。
2. 最小实现：新增 `src/hooks/media/media-management-helpers.ts` 并让测试通过。
3. Hook 重构：`useMediaManagement` 改为调用 helper，减少重复的 validTypes、签名 URL 合并与记录更新逻辑。
4. API 适配重构：`src/lib/api/media.ts` 使用 `apiClient` 泛型方法替代直接 axios 实例。
5. 验证：运行前端媒体测试、后端媒体测试、构建。
6. Review：按 SOLID、安全和可维护性审查 diff。
7. 提交：按文档/前端 helper/API 收敛拆分原子提交。

## 后续切片

- 后端 media route 拆分为 `media-request-parser`、`media-application-service`、`media-response-presenter`。
- `media-repository` 拆分 row mapper、查询构建器、写模型仓储。
- workflow builder 和 cron 管理按同样模式切片治理超大 Hook/组件。

## 第二切片计划：前端状态派生与选择逻辑收敛

上一切片已经把媒体查询参数、签名 URL 合并、记录补丁更新从 `useMediaManagement` 中抽出。第二切片继续沿前端应用层边界推进，只做行为保持型重构，目标是把分页页码、批量选择、筛选集合切换这些纯状态转换移入媒体领域辅助层，进一步降低 Hook 中的重复与硬编码。

### 范围

- 新增/扩展 `src/hooks/media/media-management-helpers.test.ts`，先锁定分页页码、全选切换、单选切换、筛选集合切换的契约。
- 扩展 `src/hooks/media/media-management-helpers.ts`，新增纯函数：
  - `buildPaginationItems()`：根据当前页与总页数生成页码/省略号列表。
  - `toggleAllSelectedIds()`：根据当前选择与可见记录切换全选/清空。
  - `toggleSelectedId()`：切换单个媒体 ID 的选中状态。
  - `toggleSetValueWithFallback()`：切换筛选集合，集合被清空时回退到默认全集。
- `useMediaManagement` 仅编排 React 状态，把上述纯逻辑委托给 helper。

### 验证

- RED：先运行新增 helper 测试，预期因函数尚未导出失败。
- GREEN：实现 helper 并改 Hook 调用，运行 `rtk npm run test -- src/hooks/media/media-management-helpers.test.ts src/hooks/useMediaManagement.refill.test.ts src/components/media/AnimatedMediaGrid.test.tsx src/components/media/BatchOperationsToolbar.test.tsx`。
- Regression：运行后端媒体测试保持媒体纵向切片不回退。
- Build：运行 `rtk npm run build`。

## 第三切片计划：后端媒体仓储查询与行映射边界收敛

前两个切片已经完成前端应用层与 API 适配层的低风险治理。第三切片转向后端媒体基础设施层，优先处理 `server/repositories/media-repository.ts` 中的 SQL 查询构建与数据库行映射职责。当前文件仍超过 600 行，且同时承担仓储协调、过滤策略拼装、SQL 参数索引管理、PostgreSQL/SQLite 差异和 row mapping，后续继续扩展会放大回归风险。

### 范围

- 新增 `server/repositories/media/media-list-query-builder.ts`，把媒体列表查询的 select/join/where/pagination 纯规则从仓储类中抽出。
- 新增 `server/repositories/media/media-row-mapper.ts`，把数据库行到 `MediaRecord` 的边界解析集中到一个可测试模块。
- 新增 `server/repositories/__tests__/media-repository-helpers.test.ts`，先用 RED 锁定：
  - favorite-only 使用 `INNER JOIN user_media_favorites` 并追加用户参数。
  - user/pro 视角默认加入 owner/public 可见性过滤与未删除过滤。
  - publicFilter 的 `others-public` 能正确表达“他人公开/无主公开”。
  - 搜索词会 trim 并同时匹配 filename/original_name。
  - row mapper 能解析 JSON metadata、字符串 size_bytes、数字 is_deleted。
- `MediaRepository.list()` 只负责调用 query builder、执行 count/list 查询、调用 row mapper 返回实体，不再内联 SQL 拼装细节。

### 验证

- RED：先运行 `rtk npm run test:server -- server/repositories/__tests__/media-repository-helpers.test.ts`，预期因 helper 模块尚不存在失败。
- GREEN：实现 helper 并改 `MediaRepository` 调用后，运行新增 helper 测试与既有 `server/repositories/__tests__/media-repository.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/media.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第四切片计划：后端媒体路由入参解析边界收敛

第三切片已经把媒体仓储的 SQL 查询构建与 row mapper 从 `MediaRepository` 中抽离。第四切片继续沿同一条媒体纵向链路上移一层，治理 `server/routes/media.ts` 中的入参解析与类型断言。当前路由层仍直接从 `req.query`/`req.body` 拼装领域服务参数，并散落 `type as string`、`favoriteFilter as ...`、metadata JSON 解析等边界逻辑。这会让路由处理器同时承担 HTTP 编排、入参解析、领域参数构造三类职责。

### 范围

- 新增 `server/routes/media/media-route-helpers.ts`，集中处理媒体列表查询参数到领域服务 `getAll()` 参数的转换。
- 新增 `server/routes/__tests__/media-route-helpers.test.ts`，先用 RED 锁定：
  - 字符串 query 中 page/limit/includeDeleted/favoriteFilter/publicFilter 能转换为分页与媒体列表参数。
  - 空筛选字段保持 `undefined`，避免把无意义空字符串下传到仓储层。
  - upload metadata JSON 字符串能解析为对象，非法 JSON 返回显式错误。
- `server/routes/media.ts` 的 GET `/` 只负责获取 owner/user 上下文、调用 helper、调用 service、组装分页响应；上传 metadata 的 JSON 边界由 helper 管理，避免空 catch。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/media-route-helpers.test.ts`，预期 helper 模块不存在失败。
- GREEN：实现 helper 并改路由后，运行新增 helper 测试与既有 `server/routes/__tests__/media.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第五切片计划：后端媒体路由请求体解析边界收敛

第四切片已经把媒体列表查询和上传 metadata 的解析从 route handler 中抽出。第五切片继续治理 `server/routes/media.ts` 剩余低风险请求体边界：批量 ID、上传媒体类型/来源、远程 URL 上传参数。目前这些逻辑仍散落在路由中，并依赖 `req.body as { ids: string[] }`、`type as MediaType`、`source as MediaSource` 等类型断言。该切片只收敛解析边界，不改变存储、权限、批量操作和下载行为。

### 范围

- 扩展 `server/routes/media/media-route-helpers.ts`，新增请求体纯解析函数：
  - `parseBatchIds()`：从已通过 Zod 的 body 中提取媒体 ID 列表，供批量删除/下载复用。
  - `parseMediaUploadFields()`：解析 multer 上传表单中的 `type`/`source`，复用已存在的媒体类型与来源 schema，失败返回显式错误。
  - `parseUploadFromUrlBody()`：解析远程 URL 上传参数，统一处理 url/type/source/filename/metadata。
- 扩展 `server/routes/__tests__/media-route-helpers.test.ts`，先用 RED 锁定批量 ID、上传字段、远程 URL 上传字段的契约。
- `server/routes/media.ts` 的 upload、upload-from-url、batch delete、batch download 只负责编排 service/storage/response，不再直接做请求体类型断言。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/media-route-helpers.test.ts`，预期新增 helper 尚未导出导致失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/media.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第六切片计划：后端媒体下载响应边界收敛

第五切片完成请求体解析后，`server/routes/media.ts` 中仍有下载响应逻辑直接内联：文件名响应头、Content-Type、Accept-Ranges、Range 头解析、206 partial content 的 Content-Range/Content-Length 计算。这些属于 HTTP 响应规划，不应与 token 校验、记录读取、文件读取混在同一个 route handler 中。第六切片只抽取纯响应计划函数，不改变 token、权限、文件读取和实际发送方式。

### 范围

- 新增 `server/routes/media/media-download-helpers.ts`，集中构造下载响应计划：
  - 无 Range 时生成 200/full 响应头和完整 byte slice。
  - 有合法 `bytes=start-end` Range 时生成 206 响应头、Content-Range、Content-Length 与 slice 边界。
  - 文件名优先使用 `original_name`，缺失时回退 `filename`；mime type 缺失时回退 `application/octet-stream`。
- 新增 `server/routes/__tests__/media-download-helpers.test.ts`，先用 RED 锁定上述响应计划契约。
- `server/routes/media.ts` 的 GET `/:id/download` 只负责 token 校验、读取媒体记录和文件 buffer、调用 helper、写入响应。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/media-download-helpers.test.ts`，预期 helper 模块不存在失败。
- GREEN：实现 helper 并改下载路由后，运行新增 helper 测试与既有 `server/routes/__tests__/media.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第七切片计划：后端媒体批量操作决策边界收敛

第六切片把单文件下载响应规划抽出后，`server/routes/media.ts` 中仍有批量公开和批量下载的应用决策直接内联：逐条判断记录是否可公开、拼接每条结果、批量下载时生成 zip 文件名和审计不可访问记录数量。这些逻辑属于批量媒体操作的纯决策层，不应与 HTTP handler 中的数据库读取、文件读取和响应流编排混在一起。第七切片继续做行为保持型重构，只抽取纯函数，不改变权限策略、存储、审计和 zip 写入行为。

### 范围

- 新增 `server/routes/media/media-batch-helpers.ts`，集中处理批量媒体操作决策：
  - `buildBatchPublicPlan()`：根据请求 ID、可访问记录、当前用户和目标公开状态，生成可授权 ID 与逐项结果。
  - `buildBatchDownloadPlan()`：根据请求 ID、可访问记录和时间戳生成 zip 文件名、可下载记录与不可访问审计摘要。
- 新增 `server/routes/__tests__/media-batch-helpers.test.ts`，先用 RED 锁定 owner/super 授权、缺失/删除记录失败结果、批量下载空记录与部分不可访问审计契约。
- `server/routes/media.ts` 的 `/batch/public` 和 `/batch/download` 只负责解析请求、读取数据库、调用 helper、执行批量更新或 zip 写入。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/media-batch-helpers.test.ts`，预期 helper 模块不存在失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/media.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第九切片计划：外部代理媒体类型边界收敛

前八个切片已把媒体主路由中的查询、请求体、下载响应和批量操作纯规则逐步收敛到 helper。当前后端剩余已识别类型逃逸热点在 `server/routes/external-proxy.ts`：异步外部代理任务的 `mediaType` 以 `string` 在内部流转，并在保存媒体文件和创建媒体记录时使用 `mediaType as MediaType`。该逻辑属于“外部输入解析到领域类型”的边界问题，适合用 TDD 抽出窄 helper，避免在副作用代码中散落类型断言。

### 范围

- 新增 `server/routes/external-proxy/external-proxy-media-helpers.ts`：
  - 定义 external proxy 允许保存的媒体类型集合（`image`、`video`、`audio`、`music`），并导出严格的 `ExternalProxyMediaType`。
  - 提供 `parseExternalProxyMediaType(value)`，只在边界解析 unknown/string，非法值返回显式错误，不允许 `document`、`lyrics` 等非代理保存类型混入。
  - 提供 `isRecord(value)` 作为 response body 的边界缩窄工具，替代 route 内 `responseBody as Record<string, unknown>`。
- 新增 `server/routes/__tests__/external-proxy-media-helpers.test.ts`，先用 RED 锁定合法媒体类型、非法媒体类型和 record 缩窄契约。
- 修改 `server/routes/external-proxy.ts`：
  - `submitTaskSchema.media_type` 复用 helper 的 allowed values。
  - `executeAsyncTask()` 的 `mediaType` 参数改为 `ExternalProxyMediaType`，保存媒体文件与创建媒体记录时直接使用该类型，不再使用 `mediaType as MediaType`。
  - response body 进入 `extractAllImages()` 前用 `isRecord()` 缩窄。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy-media-helpers.test.ts`，预期 helper 模块不存在或函数未导出失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/external-proxy.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy.test.ts server/routes/__tests__/external-proxy-media-helpers.test.ts server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第十切片计划：外部代理响应体清理边界收敛

第九切片已把 external proxy 的 `media_type` 从字符串断言收敛为领域媒体类型。`server/routes/external-proxy.ts` 仍内联响应体结构判断、图片结果提取、base64 清理和错误消息提取，并依赖多处 `Record<string, unknown>` 类型断言。这些逻辑是纯响应体解析规则，应从 route 副作用流程中拆出，保持 route 只负责任务编排、网络请求、媒体保存和日志更新。

### 范围

- 新增 `server/routes/external-proxy/external-proxy-response-helpers.ts`：
  - `extractAllImages(data)`：从 OpenAI 风格响应 `data[]` 中提取 `url` 与 `b64_json`，不接受非对象项。
  - `stripBase64Images(body)`：返回去除 `b64_json` 的响应体副本，避免将大 base64 写入日志。
  - `extractErrorMessage(responseBody, httpStatus)`：支持 OpenAI、MiniMax 和通用错误格式。
  - `toExternalProxyResultData(value)`：仅把对象响应作为 `result_data` 写入，非对象响应返回 `null`。
- 新增 `server/routes/__tests__/external-proxy-response-helpers.test.ts`，先用 RED 锁定图片提取、base64 清理、错误消息提取和 result_data 收敛契约。
- 修改 `server/routes/external-proxy.ts`：移除本文件内的响应体解析 helper 与相关 `Record<string, unknown>` 类型断言，改用新 helper。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy-response-helpers.test.ts`，预期 helper 模块不存在或函数未导出失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/external-proxy.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy.test.ts server/routes/__tests__/external-proxy-media-helpers.test.ts server/routes/__tests__/external-proxy-response-helpers.test.ts server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第十一切片计划：外部代理请求解析边界收敛

第九、十切片已消除 external proxy 的媒体类型断言与响应体 `Record` 断言。`server/routes/external-proxy.ts` 仍在代理请求和异步任务流程中内联 URL 构造、JSON 响应解析，并存在多个空 `catch {}`。这些逻辑属于边界解析与错误消息生成，应抽出为可测试 helper，让 route 只处理 schema 校验、访问控制、转发请求和响应写入。

### 范围

- 新增 `server/routes/external-proxy/external-proxy-request-helpers.ts`：
  - `parseExternalProxyUrl(value)`：返回 `{ ok: true, url }` 或 `{ ok: false, error: '无效的 URL' }`，避免 route 内空 catch。
  - `parseExternalProxyResponseText(text)`：JSON 可解析时返回对象/数组/标量，否则返回原始文本，避免响应解析空 catch。
  - `getProxyErrorMessage(error, fallback)`：统一 unknown error 到日志/响应消息。
- 新增 `server/routes/__tests__/external-proxy-request-helpers.test.ts`，先用 RED 锁定 URL 解析、JSON/text 解析、unknown error 消息契约。
- 修改 `server/routes/external-proxy.ts`：`POST /`、`POST /submit` 和 `executeAsyncTask()` 复用 helper，移除 URL/JSON 解析空 catch。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy-request-helpers.test.ts`，预期 helper 模块不存在或函数未导出失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/external-proxy.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy.test.ts server/routes/__tests__/external-proxy-media-helpers.test.ts server/routes/__tests__/external-proxy-response-helpers.test.ts server/routes/__tests__/external-proxy-request-helpers.test.ts server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第十二切片计划：外部代理转发请求执行边界收敛

第十一切片已把 external proxy 的 URL、JSON 响应和 unknown error 解析抽出。`server/routes/external-proxy.ts` 仍在同步代理与异步任务两处重复构造转发 headers、创建 `AbortController`、执行 `fetch()`、读取文本响应并解析 body。这些属于“外部 HTTP 调用执行计划”边界，应沉淀为可测试 helper，让 route 只负责 schema 校验、SSRF 判断、日志仓储编排和响应输出。

### 范围

- 新增 `server/routes/external-proxy/external-proxy-forward-helpers.ts`：
  - `buildForwardHeaders(headers)`：默认设置 `Content-Type: application/json`，过滤 `host`，保留其它调用方 headers。
  - `sanitizeResponseHeaders(headers)`：过滤 `transfer-encoding`、`content-encoding`、`connection`，只返回可透传响应头。
  - `executeExternalProxyRequest(input)`：统一执行带 timeout 的 `fetch()`，读取 response text，并复用 `parseExternalProxyResponseText()` 返回 body、status、headers 与 duration。
- 新增 `server/routes/__tests__/external-proxy-forward-helpers.test.ts`，先用 RED 锁定 header 过滤、响应头过滤和 fetch 执行契约。
- 修改 `server/routes/external-proxy.ts`：同步代理与 `executeAsyncTask()` 复用 helper，不再内联转发 headers、AbortController 和 response text 解析。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy-forward-helpers.test.ts`，预期 helper 模块不存在或函数未导出失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/external-proxy.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy.test.ts server/routes/__tests__/external-proxy-forward-helpers.test.ts server/routes/__tests__/external-proxy-request-helpers.test.ts server/routes/__tests__/external-proxy-media-helpers.test.ts server/routes/__tests__/external-proxy-response-helpers.test.ts server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第十三切片计划：外部代理异步媒体保存边界收敛

第十二切片已把 external proxy 的同步代理与异步任务 HTTP 转发执行抽出。`executeAsyncTask()` 中仍内联图片 URL 下载、base64 解码、文件扩展名识别、保存媒体文件、创建媒体记录、首个媒体 ID 选择和失败跳过逻辑。这些属于异步任务的媒体保存应用边界，应从 route 文件中拆出，避免 route 同时承担网络转发、媒体保存副作用和任务状态更新三类职责。

### 范围

- 新增 `server/routes/external-proxy/external-proxy-media-save-helpers.ts`：
  - `detectImageExtension(buffer)`：根据图片魔数识别 png/jpeg/webp，未知回退 png。
  - `saveExternalProxyImages(input)`：按现有顺序处理 `ExtractedImagePayload[]`，拒绝不可信 URL、跳过下载/保存失败项，按现有命名规则保存媒体，并返回第一个成功创建的媒体 ID。
  - helper 通过窄接口注入 URL 可信判断、图片下载、文件保存和媒体记录创建，便于单元测试，不直接依赖 Express route。
- 新增 `server/routes/__tests__/external-proxy-media-save-helpers.test.ts`，先用 RED 锁定文件名生成、首个媒体 ID、保存失败跳过和不可信 URL 跳过契约。
- 修改 `server/routes/external-proxy.ts`：`executeAsyncTask()` 只负责提取图片 payload、调用 helper、写入任务结果；删除本文件内图片扩展名识别和保存循环。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy-media-save-helpers.test.ts`，预期 helper 模块不存在或函数未导出失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 external-proxy 测试。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/external-proxy.test.ts server/routes/__tests__/external-proxy-media-save-helpers.test.ts server/routes/__tests__/external-proxy-forward-helpers.test.ts server/routes/__tests__/external-proxy-request-helpers.test.ts server/routes/__tests__/external-proxy-media-helpers.test.ts server/routes/__tests__/external-proxy-response-helpers.test.ts server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。

## 第八切片计划：后端媒体批量删除校验边界收敛

第七切片把批量公开与批量下载的纯决策抽出后，`server/routes/media.ts` 的批量删除 handler 仍内联“请求 ID 与可访问记录完整性校验”“已删除记录校验”“错误消息构造”等纯规则。该 handler 还需要保留文件删除副作用与数据库软删除编排，因此第八切片只抽取批量删除前置校验，不改变文件删除、日志记录和 `softDeleteBatch()` 行为。

### 范围

- 扩展 `server/routes/media/media-batch-helpers.ts`，新增 `validateBatchDeleteRecords()`：
  - 当可访问记录数量少于请求 ID 时，返回第一个缺失 ID 的 404 错误消息。
  - 当记录已被软删除时，返回第一个已删除 ID 的 404 错误消息。
  - 全部可删除时返回可删除记录列表，供 route 执行文件删除与数据库软删除。
- 扩展 `server/routes/__tests__/media-batch-helpers.test.ts`，先用 RED 锁定缺失记录、已删除记录和 happy path 契约。
- `server/routes/media.ts` 的 `DELETE /batch` 只负责解析请求、读取记录、调用校验 helper、执行文件删除和软删除响应。

### 验证

- RED：先运行 `rtk npm run test:server -- server/routes/__tests__/media-batch-helpers.test.ts`，预期新增 helper 尚未导出导致失败。
- GREEN：实现 helper 并改 route 后，运行新增 helper 测试与既有 `server/routes/__tests__/media.test.ts`。
- Regression：运行 `rtk npm run test:server -- server/routes/__tests__/media.test.ts server/routes/__tests__/media-route-helpers.test.ts server/routes/__tests__/media-download-helpers.test.ts server/routes/__tests__/media-batch-helpers.test.ts server/services/domain/media.service.test.ts server/repositories/__tests__/media-repository.test.ts server/repositories/__tests__/media-repository-helpers.test.ts`。
- Build：运行 `rtk npm run build`，确保后端类型与前端构建一起通过。
