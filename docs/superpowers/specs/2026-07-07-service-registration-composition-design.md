# 服务注册装配边界升级设计

## 背景

当前后端已经建立了轻量 DI 容器、类型化 token 映射和若干 Route DI 契约测试，但 `server/service-registration.ts` 仍承担过多装配细节：

- 运行时 token、基础设施服务、领域服务、仓储实例化和全局 getter 集中在同一文件。
- 多个服务重复执行 `resolve database -> getConnection -> new Repository`。
- 仓储创建规则散落在服务注册回调中，后续新增服务容易复制粘贴并扩大耦合。
- Route 层已经在迁往 `getXxxService()` 形式，启动层需要继续收紧装配边界，避免成为新的服务定位器泥潭。

本轮升级只处理服务注册装配重复，不改变 HTTP 行为、数据库查询行为、容器运行时语义或领域服务构造契约。

## 目标

通过一个小而可验证的基础设施切片，把 `service-registration` 中重复的数据库连接与仓储实例化逻辑收敛到专门的装配 helper，让服务注册文件从“直接构造所有仓储”过渡到“声明服务依赖与装配意图”。

成功标准：

- `registerServices()` 对外行为保持兼容。
- `TOKENS`、现有 getter、现有 Route DI 契约不破坏。
- 仓储创建可通过测试独立验证。
- 新代码不引入类型逃逸、TypeScript 忽略指令、非参数化 SQL，也不把业务逻辑放入 Repository。

## 方案选择

### 推荐方案：抽取仓储装配 helper

新增 `server/service-registration/repository-factories.ts`，只负责从具备 `getConnection()` 能力的数据库服务取得连接并创建当前 `registerServices()` 需要的仓储对象。`server/service-registration.ts` 保留 token 注册和生命周期装配，但不再在每个 singleton 回调中重复 `db.getConnection()` 与 `new XxxRepository(conn)`。

优点：

- 改动小，风险集中在启动装配层。
- 保持现有 `Container` 和 `TOKENS` 兼容。
- 可以用纯单元测试锁定每个 factory 使用同一个连接对象。
- 为后续把服务注册拆成 `registerInfrastructureServices()`、`registerDomainServices()`、`registerRepositoryServices()` 留出路径。

代价：

- `service-registration.ts` 仍然较长，本轮只降低重复和隐藏耦合，不做彻底模块拆分。
- 新 helper 是基础设施装配代码，不属于领域层，不能承载业务规则。

### 暂缓方案：泛型化 Container 或全量 feature-first 搬迁

不在本轮执行。泛型化容器会影响所有 `resolve<T>()` 调用；全量搬迁 routes/services/repositories 会扩大回归面，不符合本轮低风险基础设施切片目标。

## 架构边界

### 新增模块职责

`server/service-registration/repository-factories.ts`：

- 输入具备 `getConnection()` 能力的最小数据库服务接口。
- 从 `database.getConnection()` 创建当前装配层需要的 repository。
- 导出命名 factory，例如 `createWorkflowRepository()`、`createTaskRepositories()`、`createMaterialRepositories()`，以及明确表达连接读取语义的 `getDatabaseConnection()`。
- 不读取全局 container。
- 不读取 request/user 上下文。
- 不做业务判断。

### 保留模块职责

`server/service-registration.ts`：

- 继续导出 `TOKENS`。
- 继续导出 `registerServices()`。
- 继续导出现有 `getXxxService()` getter。
- 继续决定 singleton 注册顺序。
- 通过 helper 创建 repository，而不是直接重复连接获取。

## 场景契约

### 场景 1：仓储 factory 使用同一个数据库连接

Given：一个 `DatabaseService` fixture 的 `getConnection()` 返回固定连接对象。
When：调用仓储 factory。
Then：创建出的 repository 都使用该连接，且不会自行创建或读取新的数据库连接。

验证文件：`server/service-registration/__tests__/repository-factories.test.ts`。

### 场景 2：服务注册仍能解析核心服务

Given：调用 `registerServices()` 完成全局容器注册。
When：解析 `TOKENS.TASK_SERVICE`、`TOKENS.MEDIA_SERVICE`、`TOKENS.EXTERNAL_API_LOG_REPOSITORY`。
Then：解析行为与重构前一致，容器 singleton 语义不变。

验证文件：`server/__tests__/service-registration.test.ts` 或现有相关 DI 契约测试。

### 场景 3：Route DI 契约不退化

Given：已有 `auth/media/external-proxy/settings/workflows` DI contract tests。
When：完成装配 helper 抽取。
Then：路由仍通过 getter 获取服务或仓储，不重新引入直接 `new Repository` 或直接数据库连接。

验证命令：运行相关 `server/routes/__tests__/*-di-contract.test.ts`。

## 本轮明确不做

- 不修改数据库 schema 或 migration。
- 不移动 Route 文件目录。
- 不改 API 响应格式。
- 不改 `Container` 运行时实现。
- 不改领域服务构造参数的业务语义。
- 不把仓储注册为独立 public token，除非已有 token 已存在。
- 不清理与本轮无关的历史类型债务。

## 后续演进路径

完成本轮后，后续可按以下顺序继续：

1. 将 `registerServices()` 拆为 `registerInfrastructureServices()`、`registerRepositoryServices()`、`registerDomainServices()`。
2. 将 getter 层逐步改为类型化 `resolve(container, TOKENS.X)`，减少手写泛型。
3. 将仍直接访问数据库连接的 Route 迁入领域服务，例如 `stats.ts` 的 pool stats 查询。
4. 为主要领域服务补齐 repository port 契约，逐步缩小具体仓储类在装配层以外的暴露面。

## 自审结论

- 范围足够小：只触达服务注册装配与新增测试。
- 行为可验证：测试覆盖 factory、服务解析和 Route DI 契约。
- 与现有方向一致：延续 2026-07-06 的 DI 契约升级路线。
- 无用户待确认事项：用户已明确授权自主设计并禁止提问。
