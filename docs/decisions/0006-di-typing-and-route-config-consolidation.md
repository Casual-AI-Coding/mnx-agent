# ADR-0006: DI 容器类型安全化与路由配置集中化

## Status

Accepted

---

## Context

延续 `@docs/specs/2026-04-05-architecture-upgrade-design.md` 的架构升级方向，项目当前处于 DDD 迁移的**中间状态**：
- 自研 DI 容器（`server/container.ts`）已上线，`services/domain/` 已建立
- 但仍存在三处明显债务：DI 类型不安全、AI 路由 `buildRequestBody` 重复、配置常量散落

### 问题清单

**P1 — DI 容器类型不安全 + Service Locator 反模式**

- `server/container.ts` 使用 **string token**（如 `'LoggerService'`），运行期无法检测 token 拼写错误
- `server/container.types.ts` 已定义 `ContainerTokenMap` 与类型化 `resolve<TToken>()`，但**实际调用点仍走 `container.resolve<T>(string)`**，类型保护形同虚设
- `server/service-registration/service-getters.ts` 暴露 **50+ 个全局 `getXxxService()` 函数**，每个都是 `getGlobalContainer().resolve<XxxService>(TOKENS.XXX)` 的薄包装
- 这是教科书式的 **Service Locator 反模式**：调用方隐藏依赖、不可注入 mock、测试必须初始化全局容器

**P2 — AI 路由 `buildRequestBody` 重复 + 硬编码 model**

- `server/routes/text.ts` 中 `/chat` 用 `createApiProxyRouter` 工厂，但 `/chat/stream` 仍手写一份 `buildRequestBody`，**与 `/chat` 实现重复**
- 硬编码 `model: 'abab5.5-chat'`，与 API 设计规格 `@docs/standards/api-design-standards.md` 中"配置集中化"原则相悖
- 类似模式存在于 `voice.ts`、`image.ts`、`music.ts`、`video.ts` 等路由文件中

**P3 — 配置常量散落**

- `TIMEOUTS`、`RATE_LIMITS`、`LIMITS`、`MAX_BATCH_SIZE`、`BCRYPT_ROUNDS`、`HEARTBEAT_INTERVAL` 等常量散落在多个文件
- `server/index.ts` 中 `process.env.PORT`、`process.env.NODE_ENV` 绕过 `getConfig()`，违反 `@docs/specs/2026-04-05-architecture-upgrade-design.md §3.3` 明确的集中化要求

---

## Decision

**方案：三阶段渐进式重构，每阶段独立验证 + commit**

### Phase 1: DI 容器类型安全化（务实方案）

**核心洞察**：Service Locator 反模式的真正痛点是**类型不安全 + 测试不可注入**，而非"全局获取"本身。Express route handler 模式下，`getXxxService()` 与 `resolve(container, TOKENS.X)` 语义等价（都依赖全局 container）。删除 100+ 调用点收益低、成本高。

- **保留** string-token 内部表示（向后兼容）
- **保留** `service-getters.ts` 的 50+ 个 `getXxxService()` 函数签名（避免大规模调用点改动）
- **改造** `service-getters.ts` 内部实现：所有 `getGlobalContainer().resolve<T>(string)` 改为类型化 `resolve(container, TOKENS.XXX)`，类型安全立即落地到所有 getXxxService
- **修正** DI 契约测试（`server/service-registration/__tests__/*-di-contract.test.ts`）：从"读源码字符串匹配"改为"运行时调用容器验证类型"
- **改造** `server/index.ts`：直接 `container.resolve<T>(string)` 改为类型化 `resolve(container, TOKENS.X)`；`process.env.PORT/NODE_ENV` 改走 `getConfig()`

**替代方案（已否决）**：
- ❌ 完全删除 `getXxxService()`：100+ 调用点改动成本极高，语义等价收益低；Express 模式下无法真正实现构造注入
- ❌ 引入 InversifyJS 替换自研容器：风险高，影响所有 service 注册逻辑
- ❌ Symbol token 替换 string token：改动面过大，且 string token 的可调试性更好

### Phase 2: AI 路由 `buildRequestBody` 复用

- 提取 `buildChatRequestBody` 到 `server/routes/text/chat-request-builder.ts`
- `text.ts` 的 `/chat` 与 `/chat/stream` 共用一份构造逻辑
- 硬编码 `model: 'abab5.5-chat'` 提取到 `server/config/model-defaults.ts`，集中管理所有 AI 模型默认值

### Phase 3: 配置常量集中化

- 创建 `server/config/constants.ts`，导出 `TIMEOUTS`、`RATE_LIMITS`、`LIMITS`、`MAX_BATCH_SIZE`、`BCRYPT_ROUNDS`、`HEARTBEAT_INTERVAL`
- 替换散落 magic numbers 引用
- `server/index.ts` 的 `process.env.PORT/NODE_ENV` 改走 `getConfig()`

---

## Consequences

### Positive

- **类型安全**：所有 `getXxxService()` 内部走类型化 `resolve<TToken>`，编译期捕获 token 错配；`server/index.ts` 直接调用点也类型化
- **测试可信度**：DI 契约测试从"读源码字符串匹配"升级为"运行时验证解析到正确类型实例"，真正具有回归保护价值
- **消除重复**：`buildChatRequestBody` 单一权威来源
- **配置一致性**：所有 magic numbers 集中到 `server/config/`，符合 spec §3.3
- **可观测性**：model 默认值集中后，升级模型时只改一处
- **改动面可控**：保留 `getXxxService` 函数签名，14 个 routes 文件的 100+ 调用点零改动

### Negative

- `getXxxService` 仍存在（但内部已类型化，反模式程度大幅降低）
- 类型化 `resolve<TToken>` 在调用点更冗长（但收益大于成本）
- 配置常量集中化可能引入循环依赖（需谨慎设计 `constants.ts` 不依赖业务模块）

### Risks

- 中等：Service Locator 删除面广，必须配套修改所有相关 DI 契约测试
- 低：`buildChatRequestBody` 提取是纯函数抽取，行为保持
- 低：配置常量集中化是机械迁移

---

## Metadata

| Field | Value |
|------|-------|
| Date | 2026-07-23 |
| Status | Accepted |
| Decider | Sisyphus (AI Code Review) |
| Reviewed by | oGsLP |
| Supersedes | 无 |
| Related | `@docs/specs/2026-04-05-architecture-upgrade-design.md`、`@docs/decisions/0005-route-business-logic-extraction.md` |
