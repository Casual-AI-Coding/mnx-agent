# API 响应适配与服务节点注册表架构切片计划

> **执行约束**：当前计划在主分支当前 session 内执行，不使用 sub agent，不向用户提问。所有实现遵循 TDD、TypeScript strict、DDD 分层、SOLID 与项目 `AGENTS.md` 约束。

**Goal:** 通过一组可验证的高价值切片，收敛前端 API 层重复响应适配逻辑，并提升后端 `ServiceNodeRegistry` 动态调用与权限角色解析的类型安全。

**Architecture:** 本轮不做全仓大爆炸重写，而是优先处理重复最多、blast radius 可控且已有测试保护的模块。前端新增统一 API 响应适配器，将业务 API 文件中的重复 `try/catch` 下沉为边界函数；后端在服务节点注册表内显式建模可调用方法与角色等级解析，避免动态索引类型断言和未知角色误授权。

**Tech Stack:** React API Layer、Express Backend、TypeScript、Vitest、Vite、现有 Axios 客户端与 PostgreSQL Repository。

---

## 范围

### 本轮包含

- 新增 `src/lib/api/request.ts` 统一处理后端 `{ data: { data } }` 包装体与 `ApiResponse<T>` 错误转换。
- 将 `materials`、`audit`、`external-api-logs` 三个前端 API 模块迁移到统一适配器，减少重复 `try/catch`。
- 将 `external-api-logs` 中重复定义的实体类型收敛到 `@mnx/shared-types`。
- 为 `ServiceNodeRegistry` 增加未知 `min_role` 的安全过滤测试。
- 移除 `ServiceNodeRegistry.call()` 中的动态调用类型断言，保留服务方法 `this` 绑定与同步/异步返回兼容。
- 抽取角色等级解析，保证调用者未知角色按最低权限处理，节点未知角色不开放。

### 本轮不包含

- 不替换现有 Axios 客户端、Express 路由或认证刷新主链路。
- 不重构 `workflows.ts`、`create-api-method.ts` 或 workflow executor 注册表中的全部历史类型断言。
- 不修改数据库 schema、API 路径、响应字段或权限表结构。
- 不清理旧测试文件中的全部历史 `as unknown as` 用法，避免把架构切片扩散成测试框架迁移。

---

## 文件结构

### 新增

- `src/lib/api/request.ts`
  - 负责统一执行 API 请求。
  - 负责从后端 envelope 中取出 payload。
  - 负责可选 transform 后返回 `ApiResponse<TResult>`。
  - 负责复用 `toApiResponse()` 转换错误。

- `src/lib/api/__tests__/request.test.ts`
  - 覆盖成功响应、transform 响应与 `ApiError` 转换。

- `docs/plans/2026-06-30-api-and-registry-architecture-slice.md`
  - 记录本轮架构切片的方案、计划、验证与后续边界。

### 修改

- `src/lib/api/materials.ts`
  - API 方法改为调用 `withApiResponse()`。

- `src/lib/api/audit.ts`
  - 删除局部 `ApiResponse`，复用公共错误类型与响应适配器。
  - 明确后端 payload 类型与前端展示 transform。

- `src/lib/api/external-api-logs.ts`
  - 复用 `@mnx/shared-types` 中的外部 API 日志实体与查询类型。
  - 保留前端展示 stats 类型并用 shared backend stats 作为 transform 输入。

- `server/services/service-node-registry.ts`
  - 新增 `ServiceMethod` 类型守卫。
  - 使用 `Reflect.get()` + 类型守卫替代动态索引类型断言。
  - 新增角色类型守卫与等级解析函数。

- `server/services/__tests__/service-node-registry.test.ts`
  - 增加未知 `min_role` 的安全过滤测试。

---

## 任务分解与状态

### Task 1: RED - API 响应适配器测试

- [x] 创建 `src/lib/api/__tests__/request.test.ts`。
- [x] 覆盖 envelope payload、transformResult、`ApiError` 三个行为。
- [x] 运行 `rtk npm run test -- src/lib/api/__tests__/request.test.ts`。
- [x] 期望 RED：模块 `../request` 不存在。

### Task 2: GREEN - API 响应适配器实现

- [x] 创建 `src/lib/api/request.ts`。
- [x] 使用重载让无 transform 与有 transform 的返回类型保持精确。
- [x] 复用 `toApiResponse()`，不重复错误处理分支。
- [x] 运行 `rtk npm run test -- src/lib/api/__tests__/request.test.ts`，结果 3 个测试通过。
- [x] 运行 `rtk npm run build`，结果通过。

### Task 3: 迁移素材 API 模块

- [x] 修改 `src/lib/api/materials.ts`。
- [x] 将列表、详情、创建、更新、删除、素材项和排序请求全部迁移到 `withApiResponse()`。
- [x] 运行 request 目标测试与 `rtk npm run build`，结果通过。

### Task 4: 迁移审计 API 模块

- [x] 修改 `src/lib/api/audit.ts`。
- [x] 删除局部 `ApiResponse`，增加 payload 类型，保留 `transformAuditStats()`。
- [x] 使用 transform 提取 request paths 与 users。
- [x] 运行 request 目标测试与 `rtk npm run build`，结果通过。

### Task 5: 迁移外部 API 日志模块

- [x] 修改 `src/lib/api/external-api-logs.ts`。
- [x] 从 `@mnx/shared-types` 导入并重新导出页面仍需使用的实体类型。
- [x] 将后端 snake_case stats 通过 `transformStats()` 转换为前端展示结构。
- [x] 将日志查询、详情、stats、operations、providers、submitTask、getTaskStatus 全部迁移到 `withApiResponse()`。
- [x] 运行 `rtk npm run test -- src/lib/api/__tests__/request.test.ts`，结果 3 个测试通过。
- [x] 运行 `rtk npm run build`，结果通过；Vite 仅输出既有 `zh.json` 动静态同时导入警告。

### Task 6: RED - 服务节点未知角色安全测试

- [x] 修改 `server/services/__tests__/service-node-registry.test.ts`。
- [x] 增加 `should exclude enabled nodes whose min role is not recognized`。
- [x] 运行 `rtk npm run test -- server/services/__tests__/service-node-registry.test.ts`。
- [x] 期望 RED：未知 `min_role: 'vip'` 节点会被 super 用户看到。

### Task 7: GREEN - 服务节点注册表类型安全重构

- [x] 修改 `server/services/service-node-registry.ts`。
- [x] 新增 `ServiceMethod` 与 `isServiceMethod()`，通过 `Reflect.get()` 获取成员后窄化为可调用方法。
- [x] 使用 `fn.call(instance, ...args)` 保持方法 `this` 绑定，兼容同步和异步返回。
- [x] 新增 `isUserRole()` 与 `getRoleLevel()`，调用者未知角色降级为 0，节点未知角色过滤。
- [x] 运行 `rtk npm run test -- server/services/__tests__/service-node-registry.test.ts`，结果 37 个测试通过。
- [x] 运行 `rtk npm run build`，结果通过。

---

## 验证记录

| 命令 | 结果 | 说明 |
|------|------|------|
| `rtk npm run test -- src/lib/api/__tests__/request.test.ts` | PASS | 3 个测试通过 |
| `rtk npm run test -- server/services/__tests__/service-node-registry.test.ts` | PASS | 37 个测试通过 |
| `rtk npm run build` | PASS | TypeScript build 与 Vite build 通过；保留既有 `zh.json` 动静态导入警告 |

---

## Review 自检

- 单一职责：新增 `request.ts` 只负责 API envelope → `ApiResponse` 的边界适配；`ServiceNodeRegistry` 保持服务注册、调用与可用节点筛选职责。
- 类型安全：新增生产代码未引入 `any`、`@ts-ignore`、`@ts-expect-error` 或动态调用类型断言。
- 行为兼容：前端 API 返回结构、后端服务节点 API、数据库字段与权限等级语义保持不变。
- 安全边界：未知调用者角色按最低权限处理，未知节点 `min_role` 不再默认开放。
- 后续切片：`workflows.ts`、`create-api-method.ts`、`node-executor-registry.ts` 仍存在可继续收敛的重复或历史类型逃逸，应另起 TDD 切片处理。
