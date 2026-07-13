# 服务注册模块化设计

## 背景

上一批改造已经将数据库连接和仓储构造收敛到 `server/service-registration/repository-factories.ts`。但是 `server/service-registration.ts` 仍同时承担 token 定义、依赖注册、全局 getter 和大量具体服务 import，文件约 393 行。

当前 `server/container.types.ts` 从完整服务注册入口导入 `TOKENS`。这使类型契约依赖启动装配入口；后续继续拆分注册代码时，容易引入反向依赖或循环依赖。

本轮只处理服务注册模块内部职责边界，不变更任何 HTTP、数据库、任务调度或领域服务行为。

## 目标

将服务注册拆为四个职责清晰的模块：

1. `server/service-registration/tokens.ts`：稳定的 DI token 常量。
2. `server/service-registration/service-registrations.ts`：向传入容器登记基础设施、运行时和领域服务的装配逻辑。
3. `server/service-registration/service-getters.ts`：从全局容器解析既有公开服务 getter。
4. `server/service-registration.ts`：兼容门面，继续导出既有 `TOKENS`、`registerServices()` 和所有 `getXxxService()`。

成功标准：

- 现有 `server/service-registration.js` 导入路径和导出名称保持兼容。
- `TOKENS` 是单一对象；门面和内部模块导入到的是同一引用。
- `container.types.ts` 直接依赖稳定 token 模块，不再依赖完整装配门面。
- `registerServices()` 仍使用全局容器，并保留原有数据库与 MiniMax 客户端登记顺序及 singleton 注册顺序。
- 注册模块不提供新的业务能力；只移动既有装配代码。
- 不引入循环依赖、类型逃逸、忽略指令、直接 SQL 或敏感信息日志。

## 方案

### 推荐方案：兼容门面加内部模块

`tokens.ts` 作为最底层模块，只导出常量，不导入容器、服务或 repository。`container.types.ts` 因此可以安全地从它获取 token 类型键。

`service-registrations.ts` 接收 `Container` 参数，内部保留现有 `getDatabase()`、`getMiniMaxClient()` 和 singleton 注册代码。它不读取全局容器，因而装配入口的全局状态只保留在门面 `registerServices()` 内。

`service-getters.ts` 集中保留现有从 `getGlobalContainer()` 解析服务的 getter。门面以重导出的方式维持原调用方的导入路径。

门面只负责两个动作：重导出稳定 API；调用 `registerServiceDependencies(getGlobalContainer())`。

### 不采用的方案：一次性引入新的 DI 框架

替换当前容器或将所有路由改为构造器注入会改变应用启动、测试辅助代码和大量路由调用路径。该范围无法用本轮低风险重构充分验证，暂不执行。

### 不采用的方案：按服务类别分散 token

将 token 拆到多个领域文件会增加 cross-domain import，并让 `ContainerTokenMap` 失去唯一依赖源。本轮先保留单个稳定 token 模块；只有出现独立部署边界时再评估进一步拆分。

## 模块边界

| 模块 | 输入 | 输出 | 禁止职责 |
| --- | --- | --- | --- |
| `tokens.ts` | 无 | `TOKENS` | 容器解析、服务构造、业务逻辑 |
| `service-registrations.ts` | `Container` | `registerServiceDependencies()` | 读取全局容器、处理 HTTP 请求 |
| `service-getters.ts` | 全局容器与 token | 既有 getter 函数 | 服务注册、repository 创建 |
| `service-registration.ts` | 全局容器与内部模块 | 兼容公开 API | 重复服务构造或 getter 实现 |

依赖方向如下：

```text
container.types.ts ───────> tokens.ts
service-getters.ts ───────> container.ts + tokens.ts
service-registrations.ts ─> container.ts + tokens.ts + factories/services
service-registration.ts ──> container.ts + 内部三个模块
调用方 ───────────────────> service-registration.ts
```

## 场景契约

### 场景 1：token 单一来源

Given：调用方从 `tokens.ts` 和兼容门面分别导入 `TOKENS`。

When：比较两个导出。

Then：它们必须是同一对象，并保留所有既有 token 字符串值。

### 场景 2：门面导出兼容

Given：既有调用方从 `server/service-registration.ts` 导入 `registerServices()` 与任意 `getXxxService()`。

When：模块化后加载门面。

Then：门面必须继续导出注册函数，并重导出 getter 模块中的每一个 getter 函数引用。

### 场景 3：注册生命周期兼容

Given：`registerServices()` 被应用启动调用。

When：它执行。

Then：它仍对同一个全局容器调用内部注册函数，数据库与 MiniMax 客户端先被登记，singleton 注册顺序保持不变。

### 场景 4：类型契约不反向依赖门面

Given：`container.types.ts` 需要映射 token 到服务类型。

When：解析类型契约模块。

Then：它只从 `service-registration/tokens.ts` 导入 token，避免加载完整启动装配模块。

## 测试策略

1. 先为 `tokens.ts` 编写 token 值契约测试，并确认模块不存在时失败。
2. 实现 token 模块并让 `container.types.ts` 直接引用它；运行 token、container type、container 测试。
3. 再为门面和内部模块编写组合契约测试，并确认内部模块缺失时失败。
4. 仅移动既有注册与 getter 代码，令组合契约测试变绿。
5. 运行服务注册工厂测试、container 测试、路由 DI 契约测试和构建。

真实 `registerServices()` 会打开数据库并创建全局运行时单例，直接在单元测试调用会引入高耦合启动副作用。因此本轮通过模块边界契约、既有容器测试、工厂测试和构建共同约束行为；不新增伪造启动集成测试。

## 本轮明确不做

- 不修改 `Container` 的运行时实现或解析语义。
- 不修改 token 字符串值、注册顺序或 singleton 生命周期。
- 不重命名任何公开 getter 或改变其返回类型。
- 不移动 Route、领域 Service、Repository 或数据库 migration。
- 不修复当前切片外的全量测试与 lint 基线问题。

## 自审结论

该切片只移动已存在的装配和解析代码，边界清晰且可通过模块导出契约验证。它为后续按注册生命周期继续拆分 `service-registrations.ts` 提供基础，但不提前引入更广泛的 DI 迁移。
