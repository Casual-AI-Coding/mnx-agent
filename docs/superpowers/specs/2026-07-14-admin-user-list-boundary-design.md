# 后台用户列表读取边界设计

**日期：** 2026-07-14

## 背景

`server/routes/users.ts` 的 `GET /api/users` 由 `super` 角色保护，但处理器仍直接取得数据库连接，并在 HTTP 层执行用户总数和分页列表 SQL。它还负责将数据库总数转换为数值、计算偏移量和分页页数。

同一文件还混合了创建用户、属性更新、单个删除、批量操作和密码重置。`UserService` 已承担注册、登录、令牌和密码相关职责；而现有 `UserRepository` 实际负责审计日志与服务节点权限。将后台用户列表塞入其中任一现有单元都会继续扩大职责混杂。

本次只收敛列表读取路径，为 `users` 表建立明确的后台查询边界；不借此迁移写入或认证流程。

## 方案比较

1. 保留 Route 直接查询：改动最少，但 HTTP 层继续拥有 SQL、分页读取和连接依赖，分层问题不变。
2. 同时迁移列表和 PATCH：可一次消除两处 Route SQL，但 PATCH 需要五字段更新白名单、更新时间、刷新读取及兼容现有 `UserService`，风险明显大于只读查询。
3. 仅迁移 GET 列表：新建专职的 `AdminUserRepository` 和 `AdminUserService`，由容器装配；Route 只解析查询参数并映射既有成功响应。
4. 一次迁移全部六个用户管理端点：可彻底移除该文件的连接访问，但会将密码散列、账号生命周期、自删除保护和批量失败计数同时重构，范围过大。

采用方案 3。它以只读、无状态、无身份副作用的用例建立准确边界，保留未来将 PATCH、创建、删除、批量和密码重置拆分为独立切片的空间。

## 目标架构

```text
GET /api/users Route
  -> AdminUserService.listUsers({ page, limit })
  -> AdminUserRepository.listUsers({ limit, offset })
  -> DatabaseConnection
```

### Repository

新增 `AdminUserRepository`，它只负责 `users` 表的后台列表读取：

- `countUsers()` 通过参数无关的 `SELECT COUNT(*) as total FROM users` 返回总数；
- `listUsers({ limit, offset })` 返回既有投影字段和既有 `created_at DESC` 排序；
- 继续在 SQL 中以 `CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4))` 脱敏 API Key；
- 分页值保持 `$1`、`$2` 参数化，不读取密码哈希。

Repository 不做 HTTP 响应包装、不解析查询字符串、不计算 `totalPages`，也不处理写入、认证或密码。

### Service

新增 `AdminUserService`，仅接收 `AdminUserRepository`。`listUsers({ page, limit })` 计算 `(page - 1) * limit`，并行或顺序协调总数和页面数据均可，但结果必须是：

```ts
{
  data: AdminUserListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

Repository 的 `countUsers()` 必须使用 `Number(...)` 转换，确保 PostgreSQL 字符串计数与现有数值计数都产生数值响应；Service 只使用该数值并且不暴露 `DatabaseConnection`。

### 容器装配

在 `repository-factories.ts` 新增 `createAdminUserRepository(database)`；在 `tokens.ts` 新增 `ADMIN_USER_SERVICE`；在 `service-registrations.ts` 以 singleton 装配 `AdminUserService(createAdminUserRepository(...))`；在 `service-getters.ts` 新增 `getAdminUserService()`，并继续由 `server/service-registration.ts` 统一重导出。

连接只能在 composition root 的 repository factory 中从 `DatabaseService` 获取，不得流入 Route 或 Service。

### Route

`server/routes/users.ts` 的 GET 处理器继续保留：

- `requireRole(['super'])`；
- `listUsersQuerySchema` 的 `page` 默认 1、`limit` 默认 20、最大 100；
- `validateQuery` 和显式解析；
- `successResponse(res, result)` 的既有成功包装。

处理器改为取得 `getAdminUserService()` 并委托 `listUsers({ page, limit })`。该 GET 处理器不再调用 `getConnection()`，不再包含 `SELECT COUNT(*)`、`FROM users ORDER BY` 或分页 SQL。由于同一 Route 的其余用户管理端点仍在本批范围外，文件级连接导入暂时保留。

## 行为契约

1. `GET /api/users?page=2&limit=5` 继续返回 HTTP 200 和 `{ success: true, data: { data, pagination } }`，并且 `pagination` 为 `{ page: 2, limit: 5, total: 7, totalPages: 2 }`。
2. 未提供查询参数时，仍使用 `page: 1`、`limit: 20`；空列表的 `totalPages` 仍为 0。
3. 列表 SQL 继续按 `created_at DESC` 排序，仅投影现有公开字段，不返回 `password_hash`，并保持 API Key 脱敏表达式。
4. `limit` 和 `offset` 继续作为 `$1`、`$2` 参数传给列表查询；第 2 页、每页 5 条的 offset 仍为 5。
5. GET 处理器源码不再包含 `getConnection()`、`SELECT COUNT(*) as total FROM users` 或 `FROM users ORDER BY created_at DESC`；同一文件中范围外端点的既有连接使用保持不变。
6. 现有 POST、PATCH、DELETE、`/batch` 和 `/:id/reset-password` 端点的实现、授权、错误文本及响应均不修改。

## 非范围

- 不修改 `users` 表、迁移、索引或用户数据模型。
- 不修改 `UserService` 的注册、登录、token、密码修改或 API Key 更新职责。
- 不修改现有 `UserRepository` 的审计日志和服务节点权限职责。
- 不迁移创建用户、PATCH 属性更新、删除、批量操作或密码重置。
- 不改变认证中间件、路由路径、Zod 查询规则、状态码或响应包装。
- 不增加缓存、过滤、搜索、排序选项或新的 API 字段。

## 验证策略

先为新 repository、service、工厂/令牌/getter 和 Route 的无连接文本契约写 RED 测试。实现后运行用户 Route 行为测试与相关 DI 测试，验证 SQL 投影、参数顺序、脱敏和分页响应不变；再运行 LSP diagnostics、禁止项扫描、`git diff --check` 和项目构建。
