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
