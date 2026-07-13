# 公告管理边界设计

## 背景

`server/routes/admin/announcements.ts` 同时承载 HTTP 协议适配、输入校验、公告状态判定、SQL 查询、软删除和审计字段写入。它直接依赖 `getConnection()`，使 Route 越过 Service 与 Repository 层访问数据库实现。

公告管理已经具有独立的迁移、完整的路由集成测试和明确的公开查询与超级管理员 CRUD 语义，适合在不改变外部行为的前提下完成一次低风险分层迁移。

## 目标

引入 `AnnouncementRepository` 与 `AnnouncementService`，使公告 Route 仅负责认证、角色授权、Zod 输入校验和 HTTP 响应映射。

成功标准：

- Route 不再导入 `getConnection()`、`uuid` 或时间持久化工具。
- 所有公告 SQL、动态更新字段、软删除和审计字段写入集中在 Repository。
- Service 通过仓储端口公开活跃公告、管理列表、创建、更新和软删除用例。
- `/api/admin/announcements` 的路径、鉴权顺序、成功体、错误文本、状态码、时间窗口校验和软删除语义保持不变。
- 新服务通过既有 DI token、注册与 getter 解析，不创建全局状态。

## 方案比较

### 方案一：保持 Route 直接访问连接

优点是没有迁移成本；缺点是继续违反既有 Route → Service → Repository 单向依赖，且数据库查询无法独立复用或单测。该方案不采用。

### 方案二：只抽取 Route 私有 SQL helper

可减少 Route 行数，但 helper 仍属于 HTTP 层，创建、更新、软删除和数据库生命周期依赖没有获得清晰边界。该方案不采用。

### 方案三：Repository 加应用服务加 DI 门面

新增专用 Repository 承担持久化，新增应用服务承载公告用例，Route 经 getter 调用服务。此方案与当前服务注册和 stats 边界迁移保持一致，能够最低风险地恢复分层，因此采用。

## 模块边界

| 模块 | 输入 | 输出 | 禁止职责 |
| --- | --- | --- | --- |
| `announcement-types.ts` | 无运行时依赖 | 公告实体、DTO、仓储端口 | SQL、HTTP、全局状态 |
| `announcement-repository.ts` | `DatabaseConnection` 与公告持久化参数 | 公告实体、列表、更新结果、删除结果 | HTTP、认证、全局容器 |
| `announcement-service.ts` | 公告仓储端口与用例参数 | 公告查询与 CRUD 用例结果 | SQL、HTTP 请求或响应 |
| `service-registrations.ts` | 显式 `Container` | singleton 注册 | HTTP 处理、公告业务判断 |
| `service-getters.ts` | 全局容器与 token | `getAnnouncementService()` | 服务构造、响应组装 |
| `routes/admin/announcements.ts` | 认证请求、Zod 校验、公告服务 | 既有 HTTP 响应 | SQL、连接对象、ID 或时间戳生成 |

依赖方向：

```text
routes/admin/announcements.ts -> service-registration.ts -> AnnouncementService -> AnnouncementRepository -> DatabaseConnection
service-registrations.ts --------------------------------> AnnouncementService + AnnouncementRepository
```

## 场景契约

### 场景 1：公开活跃公告

Given：任意已认证用户请求 `/active`。

When：Route 调用公告服务。

Then：服务返回未软删除、已发布且处于发布时间窗口内的公告；普通用户仍可读取该结果。

### 场景 2：超级管理员管理列表

Given：超级管理员请求根路径。

When：Route 调用管理列表用例。

Then：返回未软删除公告及创建人与更新人用户名，响应继续为 `{ items, total }`。

### 场景 3：创建与更新

Given：请求已通过 Zod 形状校验且时间窗口有效。

When：Route 调用创建或更新用例。

Then：Repository 生成 ID、写入审计字段与本地时间，并返回当前公告；找不到待更新公告时仍返回现有 404 文本。

### 场景 4：软删除

Given：超级管理员删除一个公告。

When：Route 调用删除用例。

Then：Repository 仅更新 `is_deleted`、`deleted_at`、`updated_at` 与 `updated_by`；目标不存在时继续返回现有 404 文本。

### 场景 5：Route 边界

Given：公告 Route 源码被加载。

When：依赖契约测试检查模块边界。

Then：源码包含 `getAnnouncementService`，且不包含数据库连接导入、`getConnection()`、公告 SQL 或 Repository 直接构造。

## 测试策略

1. 先为 `AnnouncementService` 写仓储端口委托与未找到结果的失败测试，确认服务文件缺失时 RED。
2. 实现最小服务并确认单测 GREEN。
3. 为 DI token、类型映射、注册与 getter 新增源代码契约测试，先确认缺失时 RED。
4. 扩展公告 Route 契约测试，锁定 Route 使用服务且不再访问数据库实现。
5. 保留并运行现有公告集成测试，以真实测试数据库覆盖 Repository SQL、时间窗口和 HTTP 响应兼容性。
6. 运行聚焦测试、既有路由 DI 契约、TypeScript 构建和静态边界扫描。

## 本轮明确不做

- 不修改 `announcements` 表、迁移、索引或共享类型包。
- 不修改 `/active` 的认证行为、超级管理员角色要求、URL、成功体、错误文本或状态码。
- 不新增公告分页、缓存、通知推送、审计日志或新的公开端点。
- 不迁移 invitation-codes、users 或其它直接数据库访问 Route。
- 不修复当前切片外的全量测试与 lint 基线问题。

## 自审结论

该切片把已有数据库操作收口到专用 Repository，并通过应用服务与 DI 门面降低 HTTP 层耦合。范围仅限公告管理，不改变持久化结构和对外可观察行为，适合作为当前长期架构升级的下一步。
