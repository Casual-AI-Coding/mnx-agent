# 后台用户删除边界设计

> 状态：批准 | 日期：2026-07-14 | 切片：后台用户 DELETE 路由 → 服务 → 仓储

---

## 1. 目标

将 `server/routes/users.ts` 的 `DELETE /api/users/:id` 路由收敛到标准三层边界：

```
Route (授权守卫 + HTTP 映射) → AdminUserService.deleteUser() → AdminUserRepository.deleteUser() → DatabaseConnection.execute()
```

使 DELETE 路由不再直接调用 `getConnection()` / `conn.execute()`，SQL 与连接逻辑全部封装在仓储层。

---

## 2. 现状

### 2.1 当前 DELETE 路由（`server/routes/users.ts:93-109`）

```typescript
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()  // ← 直接取连接

  if (id === req.user?.userId) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const result = await conn.execute('DELETE FROM users WHERE id = $1', [id])
  if (result.changes === 0) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, { message: '用户已删除' })
}))
```

**泄露项：** Route 直接调用 `getConnection()`、直接执行 DELETE SQL、直接检查 `result.changes`。自删除守卫属于请求授权层，保留在 Route 是合理的。

**文件中其他端点仍用 `getConnection`：** POST `/`、POST `/batch`、POST `/:id/reset-password`。因此文件级别 `getConnection` import **不得移除** —— 验证标准是 DELETE handler 本身不调用它，而非全文件无导入。

### 2.2 既有 AdminUserRepository（`server/repositories/admin-user-repository.ts`）

当前 83 行，已有 `countUsers`、`listUsers`、`updateUser` 三方法。窄端口 `AdminUserRepositoryConnection` 已含 `execute` 重载：

```typescript
export interface AdminUserRepositoryConnection {
  query(sql: string): Promise<Array<{ total: string | number }>>
  query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>
}
```

无需修改窄端口，直接新增 `deleteUser(id: string): Promise<boolean>` 方法，使用既有 `this.conn.execute`。

### 2.3 既有 AdminUserService（`server/services/admin-user-service.ts`）

当前 51 行，`AdminUserRepositoryPort` 接口含 `countUsers`、`listUsers`、`updateUser`。新增 `deleteUser(id: string): Promise<boolean>` 到接口与实现类，纯委托 `this.repository.deleteUser(id)`。

### 2.4 既有 DI 与测试

- 容器 factory、token、singleton、getter 已注册 `AdminUserService`，无需修改。
- `server/routes/__tests__/users.test.ts`（183 行）：已有 GET×2 + PATCH×2 测试。Mock 结构已含 `getConnection`、`execute`、`getUserService.getUserById`、`getAdminUserService.listUsers/updateUser`。**当前无任何 DELETE 测试**。
- `server/routes/__tests__/users-di-contract.test.ts`（18 行）：文本合约测试，已有 GET/PATCH 委托断言。

---

## 3. 方案比较

### 方案 A（推荐）：仅 DELETE

- 新增 `AdminUserRepository.deleteUser(id)` 返回 `boolean`
- 新增 `AdminUserService.deleteUser(id)` 纯委托
- Route 保留自删除守卫，替换 `getConnection()` + `execute` + changes 检查为 `await adminUserService.deleteUser(id)` + boolean 检查
- **优点**：最小范围、单操作、无 bcrypt/密码/批量复杂度、可复用既有 AdminUser 域模式
- **缺点**：batch delete（POST `/batch`）暂不处理

### 方案 B：DELETE + PATCH 合并（已过时）

- PATCH 切片的上一批已完成并提交。本批次仅覆盖 DELETE。

### 方案 C：DELETE + batch DELETE 合并

- 同时迁移 DELETE `/:id` 和 POST `/batch` 的 delete action
- **优点**：共享 `deleteUser`
- **缺点**：batch delete 涉及逐项循环、self guards、failure counting，复杂度显著高于单条 DELETE。批处理逻辑未被行为测试覆盖。

### 结论

选择**方案 A**：仅 DELETE `/:id`，风险最低，且与已建立的 AdminUser 域一致性最高。

---

## 4. 详细设计

### 4.1 仓储（`server/repositories/admin-user-repository.ts`）

新增：

```typescript
async deleteUser(id: string): Promise<boolean> {
  const result = await this.conn.execute('DELETE FROM users WHERE id = $1', [id])
  return result.changes > 0
}
```

窄端口 `AdminUserRepositoryConnection` 的 `execute` 重载已返回 `{changes: number}`，无需新增导出类型。

### 4.2 服务（`server/services/admin-user-service.ts`）

接口 `AdminUserRepositoryPort` 新增：

```typescript
deleteUser(id: string): Promise<boolean>
```

实现类 `AdminUserService` 新增：

```typescript
async deleteUser(id: string): Promise<boolean> {
  return this.repository.deleteUser(id)
}
```

### 4.3 DI

无需修改 —— factory、token、singleton、getter 已按现有 `AdminUserService` 类型注册。

### 4.4 路由（`server/routes/users.ts`）

DELETE handler 收敛为：

```typescript
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  if (id === req.user?.userId) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const adminUserService = getAdminUserService()
  const deleted = await adminUserService.deleteUser(id)

  if (!deleted) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, { message: '用户已删除' })
}))
```

**保留不变**：
- `getConnection` import（其他端点仍需要）
- `getUserService` import（其他端点仍需要）
- 自删除守卫逻辑与 400 响应
- 404/200 响应格式

### 4.5 测试

#### 行为测试（`server/routes/__tests__/users.test.ts`）

新增 mock `deleteUser`，新增 3 个 DELETE 测试：

1. **self-deletion → 400**：ID 等于 `super-user`（fixture `req.user?.userId`），期望 `errorResponse` 400，`mocks.getConnection` not called，`mocks.deleteUser` not called
2. **not found → 404**：`mocks.deleteUser.mockResolvedValue(false)`，期望 404 `用户不存在`，`mocks.getConnection` not called
3. **success → 200**：`mocks.deleteUser.mockResolvedValue(true)`，期望 200 `{message:'用户已删除'}`，`mocks.deleteUser` called with `id`，`mocks.getConnection` not called

#### 契约测试（`server/routes/__tests__/users-di-contract.test.ts`）

新增文本断言：
- DELETE handler source 包含 `await adminUserService.deleteUser(id)` 或 `getAdminUserService().deleteUser`
- DELETE handler source 不含 `DELETE FROM users`

> **注意**：不要求全文件无 `DELETE FROM users`——POST `/batch` 的 delete action 仍含 DELETE SQL。只断言 DELETE handler（对应行号范围或路由前缀识别）不含。

---

## 5. 行为契约

| 场景 | HTTP 状态 | 响应体 | 服务调用 | 连接调用 |
|------|-----------|--------|----------|----------|
| 删除自己 | 400 | `{success:false, error:"不能删除自己的账户"}` | 无 | 无 |
| 用户不存在 | 404 | `{success:false, error:"用户不存在"}` | `deleteUser(id)` → false | 无（Route 不取连接） |
| 成功删除 | 200 | `{success:true, data:{message:"用户已删除"}}` | `deleteUser(id)` → true | 无（Route 不取连接） |

---

## 6. 非范围

- POST `/api/users`（创建用户，含 bcrypt）
- POST `/api/users/batch`（批量激活/停用/删除）
- POST `/api/users/:id/reset-password`（含随机密码生成与 bcrypt）
- 软删除语义（当前是硬 DELETE）
- `UserService` 或旧 `UserRepository` 的任何修改
- 数据库 schema 或 migration
- 前端修改

---

## 7. 自审清单

- [x] 无 `TBD`/`TODO`/`implement later`/`fill in details`
- [x] 无 `类似`/`Similar to` 等模糊引用
- [x] 行为契约覆盖所有 HTTP 分支
- [x] 非范围明确列出未迁移端点
- [x] `AdminUserRepositoryConnection` 窄端口无需修改（`execute` 已存在）
- [x] DI 无需修改（token/singleton 已就位）
- [x] 方案比较已覆盖并推荐唯一方案
