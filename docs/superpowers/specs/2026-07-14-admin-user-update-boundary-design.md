# 后台用户属性更新边界设计

**日期：** 2026-07-14

## 背景

`server/routes/users.ts` 的 `GET /api/users` 已通过 `AdminUserService` 和 `AdminUserRepository` 收敛到专职后台用户读取边界，但同一文件的 `PATCH /api/users/:id` 仍在 HTTP 层取得数据库连接、组装 users 表更新 SQL，并在更新后借用 `UserService.getUserById()` 刷新公开用户数据。

该 PATCH 用例允许更新 `email`、`role`、`is_active`、`minimax_api_key` 和 `minimax_region`。当前 Route 以固定字段顺序建立参数化白名单；当请求不含可更新字段时返回成功响应 `{ message: 'No changes' }`。更新成功或目标用户不存在时，处理器均继续以 `successResponse` 包装刷新查询结果；当前 `UserService.getUserById()` 在未找到用户时返回 `null`，因此本批必须保留该可观察行为，不能擅自改为 404。

`UserService` 已承担注册、登录、令牌和密码职责，且调用面广；既有 `UserRepository` 管理审计日志与服务节点权限。将超级管理员属性更新塞入其中任一单元都会继续扩大职责混杂。已经建立的 `AdminUserService` / `AdminUserRepository` 才是 users 表后台管理用例的正确边界。

## 方案比较

1. 保留 Route 直接更新：改动最少，但 HTTP 层继续拥有连接、字段白名单、更新时间和 SQL，分层问题不变。
2. 将 PATCH 扩展到 `UserService`：可复用现有刷新读取，但会把超级管理员账号管理继续混入认证、登录和令牌服务，扩大高调用面单元的职责。
3. 将 PATCH 扩展到 `AdminUserService` 和 `AdminUserRepository`：复用已经存在的后台 users 管理边界，Route 只负责授权、Zod 验证、空更新响应和 HTTP 包装；Repository 负责参数化更新与公开字段刷新读取。
4. 同时迁移 PATCH 与 DELETE：能多消除一个连接调用，但 DELETE 尚未有专门测试，且自删除保护、受影响行 404 和中文错误文本构成独立行为契约，扩大本批风险。

采用方案 3。它在已有、低耦合的后台用户链路上收敛单一属性更新用例，并把 DELETE、创建、批量操作和密码重置保留为后续独立切片。

## 目标架构

```text
PATCH /api/users/:id Route
  -> AdminUserService.updateUser(id, updates)
  -> AdminUserRepository.updateUser(id, updates)
  -> DatabaseConnection
```

### 输入与类型边界

Route 继续使用 `updateUserSchema` 和 `validate()` 解析 HTTP body。Service 与 Repository 新增专职 `AdminUserUpdate` 类型，只表示已验证的后台属性：

```ts
export type AdminUserUpdate = {
  readonly email?: string | null
  readonly role?: 'super' | 'admin' | 'pro' | 'user'
  readonly is_active?: boolean
  readonly minimax_api_key?: string | null
  readonly minimax_region?: 'cn' | 'intl'
}
```

这个内部类型不承担 Zod 验证，也不引入共享认证类型或 HTTP 类型。Route 在确认至少存在一个可更新字段后，才把已验证数据传入 Service。

### Repository

扩展 `AdminUserRepository`，它继续只拥有 users 表的后台管理数据访问：

- `updateUser(id, updates)` 使用固定白名单顺序 `email`、`role`、`is_active`、`minimax_api_key`、`minimax_region` 构造参数化 `UPDATE users SET ... WHERE id = $n`；
- 仅有实际提供的字段进入 SQL；`updated_at` 始终追加在最后一个业务字段之后，值通过 `toLocalISODateString()` 生成，`id` 为最终参数；
- 更新执行后以专属查询读取公开字段，复用列表读取的投影：不读取 `password_hash`，并以 `CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4))` 脱敏 API Key；
- 查询未命中时返回 `null`；Repository 不把受影响行转换为 HTTP 错误。

Repository 的窄连接端口增加执行更新所需的 `execute()` 以及按 ID 查询所需的 `query()` 形状。连接只在现有 composition root 的 `createAdminUserRepository()` 中取得，不进入 Service 或 Route。

### Service

扩展 `AdminUserService` 的 repository 依赖接口与 `updateUser(id, updates)` 方法。该方法只将专职更新用例转交给 Repository，并返回公开用户项目或 `null`；它不持有 `DatabaseConnection`，不解析 HTTP 输入，不判定空更新，也不引入认证、密码或 404 逻辑。

现有 token、factory、singleton 和 `getAdminUserService()` 已可装配同一 Service / Repository 实例，本批不新增 token 或注册项。

### Route

`PATCH /api/users/:id` 继续保留：

- 全局 `requireRole(['super'])` 授权；
- `updateUserSchema` 的字段约束；
- 空更新时 HTTP 200 的 `{ success: true, data: { message: 'No changes' } }`；
- `successResponse(res, user)` 的既有成功包装。

非空更新时，处理器取得 `getAdminUserService()` 并调用 `await adminUserService.updateUser(id, updates)`。它不再获取连接、不再维护 SQL 字段数组、参数数组、参数编号或更新时间；同一文件中创建、DELETE、批量操作和密码重置仍需连接，所以文件级 `getConnection` import 保持存在。

## 行为契约

1. `PATCH /api/users/user-123` 提交 `{ email: 'updated@example.com', is_active: false }` 继续返回 HTTP 200 与既有成功包装的公开用户数据。
2. 该部分更新继续以 `email = $1, is_active = $2, updated_at = $3 WHERE id = $4` 的顺序传入参数；五个可选字段始终遵循 `email`、`role`、`is_active`、`minimax_api_key`、`minimax_region` 的白名单顺序。
3. 更新后的返回数据继续不含 `password_hash`，并保持 API Key 脱敏投影。
4. 空 body 不调用 `AdminUserService`、Repository 或数据库连接，继续返回 `{ message: 'No changes' }` 的 HTTP 200 成功响应。
5. 更新目标不存在时，保持当前行为：执行更新后刷新读取返回 `null`，Route 继续以 HTTP 200 的成功包装返回该 `null` 数据；本批不引入新的 404 响应。
6. PATCH 处理器源码不再包含原有的 Route 字段数组、`UserUpdateValue`、动态 `fields.join(', ')` 或 ``UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`` 逻辑。由于范围外端点仍有 users 更新 SQL，不能以整个文件不含 `UPDATE users SET` 作为验收条件。
7. DELETE 的自删除 400、受影响行 404 与 `{ message: '用户已删除' }`，以及 POST、`/batch`、`/:id/reset-password` 均保持不变。

## 非范围

- 不修改 users 表、迁移、索引、共享实体定义或用户数据模型。
- 不修改 `UserService` 的注册、登录、token、密码修改、读取或既有 API Key 更新职责。
- 不修改现有 `UserRepository` 的审计日志和服务节点权限职责。
- 不迁移 DELETE、创建用户、批量激活/停用/删除或密码重置。
- 不改变认证中间件、路由路径、Zod 字段规则、状态码、错误文本或响应包装。
- 不增加缓存、审计副作用、过滤、搜索、排序选项或新的 API 字段。

## 验证策略

先为 Repository 的固定白名单更新、更新时间参数和脱敏刷新读取写 RED 测试；再为 Service 的更新委托与 `null` 透传写 RED 测试。随后将 Route PATCH 行为测试改为后台 Service mock，新增空更新不委托的测试，并以源码契约检查移除 PATCH 专属 SQL 组装而非误判范围外端点。

实现后运行 repository、service、Route 和已有后台用户 DI 测试；对所有新增或修改的 TypeScript 文件执行 LSP diagnostics、禁止类型逃逸扫描、`git diff --check` 和项目构建。DELETE 等范围外端点的行为不在本批验证或改动范围内。
