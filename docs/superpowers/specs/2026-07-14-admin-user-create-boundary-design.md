# 后台用户创建边界 - 设计规格

> 目标：将 `POST /api/users` 创建端点从 Route 直连数据库收敛为 Route → Service → Repository 分层。

## 背景

`server/routes/users.ts` 的 GET（列表）、PATCH（属性更新）、DELETE（删除）已完成边界迁移。POST `/` 创建用户是剩余四个直连端点中风险最低的：单次 INSERT + 读回，不涉及批量/密码重置/吞没错误。

## 方案比较

| 方案 | 描述 | 评估 |
|------|------|------|
| A. 保留直连 | 不迁移，维持现状 | 与前序收敛方向矛盾，排除 |
| B. POST + batch | 同时迁移创建和批量操作 | batch 有 3 种动作 + 吞没错误 + 66 行，风险高，排除 |
| **C. 仅 POST** | 只迁移 `POST /` 创建用户 | 单操作、16 行、低风险，**选择** |

## 架构

```
Route (Zod validate → delegate)
  → AdminUserService.createUser({username, password, email, role, minimax_api_key})
    → bcrypt.hash(password, 12)
    → uuidv4() + toLocalISODateString()
    → AdminUserRepository.createUser(id, username, email, passwordHash, role, apiKey, isActive, now)
      → INSERT INTO users (9 columns)
      → SELECT masked public user (id, username, email, minimax_api_key*脱敏, minimax_region, role, is_active, last_login_at, created_at, updated_at)
    → return AdminUserListItem
  → successResponse(res, user, 201)
```

## 行为契约

1. **成功创建**：返回 HTTP 201，body 为 `{success: true, data: <脱敏用户>}`
2. **Zod 校验失败**：`validate(createUserSchema)` 返回 400，不触碰 service/repository
3. **bcrypt rounds**：保持 12，不改变
4. **UUID**：服务端生成（`uuidv4()`），不由调用方传入
5. **时间戳**：`toLocalISODateString()`，无 `Z` 后缀
6. **脱敏**：`minimax_api_key` 返回格式为 `'minimax_****' + 后 4 位`，同 listUsers；`password_hash` 绝不返回
7. **is_active**：固定 `true`
8. **email/minimax_api_key**：可传 `null`（Zod 允许 `.nullable().optional()`），SQL 用 `?? null`

## 非范围（明确排除）

- POST `/batch`（批量 activate/deactivate/delete）—— 不迁移
- POST `/:id/reset-password` —— 不迁移
- 不改变 `createUserSchema` 定义
- 不改变 `requireRole(['super'])`（全路由统一）
- 不改变 `UserService` 或现有 `UserRepository`
- 不新增 DI token（`AdminUserService`/`AdminUserRepository` 已注册）
- 不改变 `bcrypt` 版本或 rounds
- 不改变 `toLocalISODateString` 实现

## Repository 接口扩展

```typescript
// 新增类型（server/repositories/admin-user-repository.ts）
interface AdminUserCreateData {
  readonly id: string
  readonly username: string
  readonly email: string | null
  readonly passwordHash: string
  readonly role: string
  readonly apiKey: string | null
  readonly now: string
}

// 窄连接端口扩展
interface AdminUserRepositoryConnection {
  query(sql: string): Promise<Array<{ total: string | number }>>
  query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>
}

// 新增方法
class AdminUserRepository {
  async createUser(data: AdminUserCreateData): Promise<AdminUserListItem>
}
```

## Service 接口扩展

```typescript
// 新增输入类型
interface AdminUserCreateInput {
  readonly username: string
  readonly password: string
  readonly email?: string | null
  readonly role?: string
  readonly minimax_api_key?: string | null
}

// 接口扩展
interface AdminUserRepositoryPort {
  countUsers(): Promise<number>
  listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]>
  updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null>
  deleteUser(id: string): Promise<boolean>
  createUser(data: AdminUserCreateData): Promise<AdminUserListItem>
}

// 新增方法
class AdminUserService {
  async createUser(input: AdminUserCreateInput): Promise<AdminUserListItem>
}
```

## Route 变更

从：
```typescript
const { username, password, email, role, minimax_api_key } = req.body
const conn = getConnection()
const passwordHash = await bcrypt.hash(password, 12)
const id = uuidv4()
const now = toLocalISODateString()
await conn.execute(`INSERT INTO users (...) VALUES (...)`, [...])
const userService = getUserService()
const user = await userService.getUserById(id)
successResponse(res, user, 201)
```

变为：
```typescript
const adminUserService = getAdminUserService()
const user = await adminUserService.createUser(req.body)
successResponse(res, user, 201)
```

保留 `validate(createUserSchema)` 中间件，保留 `import { getAdminUserService }`（已存在），不删除 `bcrypt`/`uuid`/`getConnection`/`toLocalISODateString`/`getUserService` 的 import（其他端点仍用）。

## 测试策略

| 层 | 测试类型 | 验证要点 |
|----|----------|----------|
| Repository | 单元（窄端口 fake） | INSERT 9 参数字段顺序、脱敏读回含 key mask 无 password_hash |
| Service | 单元（fake repository + vi.mock bcrypt/uuid） | bcrypt 调用、UUID 生成、委托 repository |
| Route | 行为测试（mock service） | HTTP 201+body、service 调用参数、getConnection 未被调用 |
| Route DI 契约 | 文本断言 | 含 `createUser` 委托、无 INSERT SQL |
