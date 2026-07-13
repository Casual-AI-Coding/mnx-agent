# 邀请码管理边界设计

## 背景

`server/routes/invitation-codes.ts` 同时处理超级管理员授权、请求校验、邀请码生成、数据库查询、动态更新与失效操作。该 Route 直接依赖数据库连接、`uuid`、加密随机数和本地时间工具，越过了项目约定的 Route -> Service -> Repository 分层。

邀请码表还被 `UserService.register()` 用于注册时的原子兑换。该兑换路径使用事务内条件更新防止并发超发，是独立的注册领域约束，不能随管理员管理接口的迁移而改变。

## 目标

为管理员邀请码管理端引入 `InvitationCodeRepository` 和 `InvitationCodeService`，使 Route 只负责角色授权、Zod 校验和 HTTP 响应映射，同时保持用户注册兑换路径不变。

成功标准：

- `server/routes/invitation-codes.ts` 不再导入数据库连接、`uuid`、`crypto` 或时间持久化工具。
- 管理端邀请码 SQL、ID 与本地时间写入集中到 Repository。
- 批量随机邀请码生成、空更新判断与管理用例编排集中到 Service。
- `/api/invitation-codes` 的路径、超级管理员要求、响应体、状态码和中文错误文本保持不变。
- `UserService.register()` 的事务、条件更新和邀请码兑换错误语义保持不变。
- 新服务通过既有 token、注册与 getter 获取，不产生额外全局状态。

## 方案比较

### 方案一：保留 Route 直接访问数据库

改动最少，但会持续违反分层约束，邀请码生成、参数化 SQL 和所有权过滤无法独立测试或复用，因此不采用。

### 方案二：提取 Route 私有 helper

能缩短 Route，却无法解除 HTTP 层对连接和持久化细节的耦合，也不能形成可复用的管理用例边界，因此不采用。

### 方案三：Repository、应用服务与 DI 门面

Repository 负责管理端持久化，应用服务负责批量生成和更新编排，Route 经服务 getter 调用。该方案与公告管理和连接池统计的已落地模式一致，能保留外部行为并恢复单向依赖，因此采用。

## 模块边界

| 模块 | 输入 | 输出 | 禁止职责 |
| --- | --- | --- | --- |
| `invitation-code-types.ts` | 无运行时依赖 | 实体、DTO、仓储端口 | SQL、HTTP、全局状态 |
| `invitation-code-repository.ts` | `DatabaseConnection` 与持久化参数 | 管理端邀请码数据和写入结果 | HTTP、认证、随机码生成 |
| `invitation-code-service.ts` | 仓储端口、管理用例参数 | 列表、批量生成、更新与失效结果 | SQL、HTTP 请求或响应 |
| `service-registrations.ts` | 显式 `Container` | singleton 注册 | HTTP 处理、注册兑换逻辑 |
| `service-getters.ts` | 全局容器与 token | `getInvitationCodeService()` | 服务构造、响应组装 |
| `routes/invitation-codes.ts` | 已认证请求、Zod 校验、服务 | 既有 HTTP 响应 | SQL、连接对象、随机码、ID、时间戳 |
| `user-service.ts` | 注册事务与邀请码字符串 | 注册结果 | 管理端邀请码 CRUD |

依赖方向：

```text
routes/invitation-codes.ts -> service-registration.ts -> InvitationCodeService -> InvitationCodeRepository -> DatabaseConnection
service-registrations.ts --------------------------------> InvitationCodeService + InvitationCodeRepository

UserService.register() ----------------------------------> 既有 invitation_codes 事务兑换 SQL
```

`InvitationCodeService` 与 `UserService` 可以共享同一张表，但不共享管理端仓储。前者服务于超级管理员的管理操作，后者保留注册事务中的原子条件更新；避免把并发兑换规则误搬迁到非事务管理流程。

## 场景契约

### 场景 1：按创建者列出邀请码

给定：超级管理员请求根路径。

当：Route 调用 `getInvitationCodeService().list(creatorId)`。

则：返回当前用户创建的邀请码，附带创建者用户名，按创建时间倒序；响应仍直接包裹为成功数组。

### 场景 2：批量生成邀请码

给定：请求已通过数量、最大使用次数和失效时间校验。

当：Route 调用 `generateBatch(input, creatorId)`。

则：Service 为每项生成 32 位大写十六进制邀请码，Repository 为每项写入 ID 与本地时间；响应继续为状态码 201 的 `{ count, codes }`。

### 场景 3：更新邀请码

给定：当前用户拥有目标邀请码。

当：Route 调用 `update(id, input, creatorId)`。

则：没有更新字段时返回原记录并保留 `{ message: '无更新内容', data }`；有字段时参数化更新并返回刷新记录；目标不存在时继续返回 `邀请码不存在` 与 404。

### 场景 4：使邀请码失效

给定：当前用户请求删除其邀请码。

当：Route 调用 `deactivate(id, creatorId)`。

则：Repository 仅将 `is_active` 更新为 false；影响行数为零时仍返回 `邀请码不存在` 与 404，否则继续返回 `{ message: '邀请码已失效' }`。

### 场景 5：注册兑换隔离

给定：用户提交注册邀请码。

当：`UserService.register()` 在事务中执行邀请码条件更新。

则：它仍基于 `used_count < max_uses`、有效状态和失效时间原子兑换，不依赖新的管理服务或仓储。

### 场景 6：Route 边界

给定：邀请码 Route 源码被加载。

当：依赖契约检查模块边界。

则：源码包含 `getInvitationCodeService`，不包含连接导入、`getConnection()`、邀请码 INSERT 或 UPDATE SQL，也不直接构造 Repository。

## 测试策略

1. 先创建 `InvitationCodeService` 测试，确认模块不存在时 RED，覆盖列表委托、批量生成、空更新、更新刷新与失效委托。
2. 先创建 Repository 测试，确认模块不存在时 RED，锁定所有权查询、参数化写入、动态更新和失效写入。
3. 先创建 DI 源码契约测试，确认 token、类型映射、factory、注册和 getter 缺失时 RED。
4. 先创建 Route 边界契约测试，确认 Route 仍直连数据库时 RED。
5. 运行服务、仓储、DI、Route 契约、现有容器测试和现有路由契约；再运行 TypeScript 构建。
6. `UserService` 注册竞争测试作为隔离回归，用于证明本切片没有触碰兑换路径。

## 本轮明确不做

- 不修改 `invitation_codes` 表、迁移、索引或共享类型包。
- 不改变 `/api/invitation-codes` 的鉴权、URL、成功体、错误文本或状态码。
- 不修改 `UserService.register()`、邀请码原子兑换 SQL、注册错误语义或事务边界。
- 不添加邀请码分页、搜索、批量失效、重试、缓存、通知或新的公开端点。
- 不迁移 `users.ts`、`admin/service-permissions.ts` 或其它直接数据库访问 Route。
- 不修复当前切片外的全量测试与 lint 基线问题。

## 自审结论

该切片仅将超级管理员管理端的持久化与应用编排从 HTTP 层迁出。注册兑换继续保留在原事务中，因而不会把管理操作与注册时的并发控制混为一谈；范围有限且可以通过服务、仓储、依赖边界与既有竞争测试分层验证。
