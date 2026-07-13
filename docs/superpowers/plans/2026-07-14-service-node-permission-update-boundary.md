# 服务节点权限更新边界实施计划

> 面向自动化执行者：用户明确禁止子代理。本计划必须在当前会话按任务顺序执行；每个步骤使用复选框记录状态。

**目标：** 将服务节点权限 PATCH 的展示字段和访问控制字段更新收敛到既有 Service -> Repository 链路，并删除 Route 对数据库连接的穿透访问。

**架构：** `UserRepository` 保持权限表的数据访问职责，扩展既有更新方法的固定字段白名单。`ServiceNodePermissionService` 暴露完整更新用例，管理路由保留授权、`min_role` 校验、404 映射与响应格式。

**技术栈：** Express、TypeScript strict、Vitest、Supertest、PostgreSQL、Zod。

---

## 文件结构

- 修改：`server/repositories/user-repository.ts`，集中参数化更新 SQL。
- 修改：`server/services/service-node-permission-service.ts`，扩展更新服务并删除连接泄露方法。
- 修改：`server/routes/admin/service-permissions.ts`，移除 Route 内 SQL。
- 创建：`server/services/__tests__/service-node-permission-service.test.ts`，验证服务委托与连接泄露删除。
- 创建：`server/routes/admin/__tests__/service-permissions-di-contract.test.ts`，验证 Route 不再依赖数据库实现。
- 修改：`server/repositories/__tests__/user-repository.test.ts`，验证四字段参数化更新；若现有测试文件没有适合该职责的夹具，则创建 `server/repositories/__tests__/service-node-permission-repository.test.ts`。
- 保留并运行：`server/routes/admin/__tests__/service-permissions.test.ts`，验证真实 PostgreSQL HTTP 行为。

### 任务 1：服务与仓储更新契约

**文件：**
- 创建：`server/services/__tests__/service-node-permission-service.test.ts`
- 修改：`server/repositories/__tests__/user-repository.test.ts` 或创建 `server/repositories/__tests__/service-node-permission-repository.test.ts`

- [ ] **步骤 1：写服务 RED 测试**

构造仅具备 `updateServiceNodePermission` 的结构化仓储替身；调用：

```ts
await service.update('permission-1', {
  display_name: '新的展示名称',
  category: '生成',
  min_role: 'admin',
  is_enabled: false,
})
```

断言仓储接收四个字段，并断言 `service.getConnection` 不存在。

- [ ] **步骤 2：运行服务测试确认 RED**

运行：

```bash
rtk npm run test:server -- "server/services/__tests__/service-node-permission-service.test.ts"
```

预期：因完整更新契约或连接泄露删除尚未实现而失败。

- [ ] **步骤 3：写仓储 RED 测试**

使用结构化 `DatabaseConnection` 记录器调用：

```ts
await repository.updateServiceNodePermission('permission-1', {
  display_name: '新的展示名称',
  category: '生成',
  min_role: 'admin',
  is_enabled: false,
})
```

断言 SQL 仅包含固定四字段、值以参数传递且最后参数为权限 id；再调用空对象并断言没有执行 SQL。

- [ ] **步骤 4：运行仓储测试确认 RED**

运行：

```bash
rtk npm run test:server -- "server/repositories/__tests__/service-node-permission-repository.test.ts"
```

预期：因展示字段尚未由仓储更新而失败。

### 任务 2：实现服务与仓储边界

**文件：**
- 修改：`server/repositories/user-repository.ts:280-306`
- 修改：`server/services/service-node-permission-service.ts:16-33`

- [ ] **步骤 1：扩展仓储更新白名单**

将方法输入扩展为：

```ts
{
  display_name?: string
  category?: string
  min_role?: string
  is_enabled?: boolean
}
```

按 `display_name`、`category`、`min_role`、`is_enabled` 的固定顺序生成参数化字段；保留布尔值的数据库方言转换；空输入直接返回。

- [ ] **步骤 2：扩展服务更新并删除连接泄露**

让 `ServiceNodePermissionService.update()` 使用相同输入并委托仓储，删除 `getConnection()` 及其 `DatabaseConnection` 类型导入。

- [ ] **步骤 3：运行 RED 测试确认 GREEN**

运行：

```bash
rtk npm run test:server -- "server/services/__tests__/service-node-permission-service.test.ts" "server/repositories/__tests__/service-node-permission-repository.test.ts"
```

预期：两个测试文件均通过。

### 任务 3：迁移管理路由

**文件：**
- 创建：`server/routes/admin/__tests__/service-permissions-di-contract.test.ts`
- 修改：`server/routes/admin/service-permissions.ts:56-106`
- 保留：`server/routes/admin/__tests__/service-permissions.test.ts`

- [ ] **步骤 1：写 Route RED 契约**

读取路由源码，断言包含 `svc.update(id, { display_name, category, min_role, is_enabled })`，且不包含：

```text
svc.getConnection(
UPDATE service_node_permissions
```

运行：

```bash
rtk npm run test:server -- "server/routes/admin/__tests__/service-permissions-di-contract.test.ts"
```

预期：当前 Route 仍访问连接并拼接 SQL，测试失败。

- [ ] **步骤 2：移除 Route 内 SQL**

保留既有查询和 404 分支，将原先两段更新改为：

```ts
await svc.update(id, { display_name, category, min_role, is_enabled })
```

随后再次读取 `getAll()` 并以既有 `successResponse(res, updated)` 返回。不要修改角色、错误文本、状态码或 GET/POST/DELETE 路由。

- [ ] **步骤 3：运行 Route GREEN 测试和真实路由集成测试**

运行：

```bash
rtk npm run test:server -- "server/routes/admin/__tests__/service-permissions-di-contract.test.ts" "server/routes/admin/__tests__/service-permissions.test.ts"
```

预期：两个文件均通过，原 PATCH 全字段与部分字段场景继续成立。

### 任务 4：验证与提交

**文件：** 本计划所列所有改动文件。

- [ ] **步骤 1：运行完整针对性验证**

运行：

```bash
rtk npm run test:server -- "server/services/__tests__/service-node-permission-service.test.ts" "server/repositories/__tests__/service-node-permission-repository.test.ts" "server/routes/admin/__tests__/service-permissions-di-contract.test.ts" "server/routes/admin/__tests__/service-permissions.test.ts" "server/routes/__tests__/users-di-contract.test.ts"
rtk npm run build
```

预期：明确列出的测试文件通过，构建退出码为零。

- [ ] **步骤 2：执行静态检查**

对改动 TypeScript 文件运行 LSP diagnostics；扫描类型逃逸与忽略指令；运行 `GIT_MASTER=1 git diff --check`。

- [ ] **步骤 3：按原子单元提交**

依赖顺序：设计计划文档 -> 服务与仓储实现及其测试 -> Route 与其契约/集成测试 -> 计划状态同步。

提交消息使用中文 semantic 风格，并为每个提交加入固定 footer 与 co-author。
