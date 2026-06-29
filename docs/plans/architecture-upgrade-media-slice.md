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
