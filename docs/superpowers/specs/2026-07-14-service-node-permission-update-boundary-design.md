# 服务节点权限更新边界设计

**日期：** 2026-07-14

## 背景

`server/routes/admin/service-permissions.ts` 已经通过 `ServiceNodePermissionService` 查询、创建和删除权限，但 PATCH 处理器仍调用服务的 `getConnection()`，并在 HTTP 层拼接 `service_node_permissions` 的更新 SQL。该连接由服务借助仓储内部实现取得，既破坏 Route -> Service -> Repository 的单向依赖，也引入类型安全逃逸。

`UserRepository` 已拥有服务节点权限的持久化职责，因此本次不新建并行仓储，不修改权限表、迁移或既有权限同步流程。

## 方案比较

1. 保留 Route 内 SQL：改动最小，但继续让 HTTP 层依赖数据库实现，且保留连接逃逸。
2. 在 Route 提取私有更新函数：可缩短处理器，但 SQL 仍留在 HTTP 层，边界问题没有解决。
3. 扩展现有 Repository 和 Service：由 `UserRepository` 接收白名单字段并执行参数化更新，`ServiceNodePermissionService` 统一编排，Route 仅校验请求与映射响应。

采用方案 3。它沿用当前服务节点权限的现有依赖链，变更范围小，并能删除 `getConnection()` 这个跨层泄露点。

## 目标架构

```text
admin service-permissions Route
  -> ServiceNodePermissionService
  -> UserRepository
  -> DatabaseConnection
```

### Repository

`UserRepository.updateServiceNodePermission()` 扩展为只允许更新以下可编辑字段：

- `display_name`
- `category`
- `min_role`
- `is_enabled`

Repository 继续构建参数化 SQL，保留 PostgreSQL 与非 PostgreSQL 的布尔值转换方式；空更新不执行 SQL。

### Service

`ServiceNodePermissionService.update()` 接收上述四个字段并委托仓储。删除 `getConnection()`，服务不再暴露底层数据库连接。

### Route

PATCH 处理器保留：

- `super` 或 `admin` 角色控制；
- `min_role` 合法性校验；
- `Permission not found` 的 404 文本；
- 更新后的重新查询与成功响应形状。

Route 不再读取连接、不再构建 SQL，也不再含有 `service_node_permissions` 更新语句。

## 行为契约

1. 给定存在的权限，更新 `display_name`、`category`、`min_role` 和 `is_enabled` 后，返回刷新后的完整权限记录。
2. 给定只更新展示名称或分类，原有 `min_role` 与 `is_enabled` 保持不变。
3. 给定不存在的权限 id，PATCH 仍返回 `Permission not found` 与 404。
4. 给定非法 `min_role`，Route 仍在访问服务前返回 `Invalid min_role` 与 400。
5. 给定没有可编辑字段的请求，服务和仓储不生成更新 SQL，Route 仍返回查得的权限记录。
6. Route 源码不包含服务连接访问、数据库连接导入或权限表更新 SQL。

## 非范围

- 不修改 `service_node_permissions` 表、迁移、索引或共享实体结构。
- 不修改 `ServiceNodeRegistry` 的启动同步逻辑。
- 不修改 GET、POST、DELETE 路由的路径、授权、响应或错误文本。
- 不迁移高风险的 `server/routes/users.ts`。
- 不更改数据库连接运行时、DI token 或服务注册生命周期。

## 验证策略

先写 service/repository/Route 文本契约测试并确认缺少行为时失败，再实现最小改动。最终执行服务节点权限真实 PostgreSQL 路由集成测试、相关 DI 契约测试、LSP 诊断、禁止项扫描、差异检查和项目构建。
