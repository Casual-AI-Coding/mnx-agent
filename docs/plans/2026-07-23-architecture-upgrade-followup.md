# 架构升级后续切片：DI 类型安全化 + 路由配置集中化

> **执行约束**：本计划在主分支当前 session 内执行，不使用 sub agent，不向用户提问。所有实现遵循 TDD、TypeScript strict、DDD 分层、SOLID 与项目 `AGENTS.md` 约束。

**Goal:** 通过三个可独立验证的切片，解决 `@docs/specs/2026-04-05-architecture-upgrade-design.md` 中遗留的 DI 类型不安全、AI 路由 `buildRequestBody` 重复、配置常量散落三大债务，推动 DDD 迁移中间状态向前。

**Architecture:** 本轮不做全仓大爆炸重写。Phase 1 在保留 string token 内部表示的前提下，让所有 DI 调用点改走类型化 `resolve<TToken>`，删除 `getXxxService()` Service Locator。Phase 2 提取 `buildChatRequestBody` 为纯函数并集中 model 默认值。Phase 3 创建 `server/config/constants.ts` 收敛散落 magic numbers。

**Tech Stack:** Express、TypeScript、Vitest、自研 DI Container。

**关联 ADR:** `@docs/decisions/0006-di-typing-and-route-config-consolidation.md`

---

## 范围

### 本轮包含

- **Phase 1（DI 类型安全化）**：
  - `server/service-registration/service-getters.ts` 的 50+ 个 `getXxxService()` 内部实现改为类型化 `resolve(container, TOKENS.XXX)`（保留函数签名，调用点零改动）
  - `server/index.ts` 中 `container.resolve<T>(string)` 改为类型化 `resolve(container, TOKENS.X)`
  - `server/index.ts` 的 `process.env.PORT/NODE_ENV` 改走 `getConfig()`
  - 修正 DI 契约测试为**运行时验证**（真正调用容器解析，而非字符串匹配）
- **Phase 2（AI 路由 `buildRequestBody` 复用）**：
  - 提取 `server/routes/text/chat-request-builder.ts`，作为 `buildChatRequestBody` 单一权威来源
  - `text.ts` 的 `/chat` 与 `/chat/stream` 共用构造逻辑
  - 新增 `server/config/model-defaults.ts`，集中 AI 模型默认值（`DEFAULT_CHAT_MODEL='abab5.5-chat'` 等）
  - 补充 `chat-request-builder.test.ts`，覆盖同步与流式调用契约
- **Phase 3（配置常量集中化）**：
  - 新增 `server/config/constants.ts`，导出 `TIMEOUTS`、`RATE_LIMITS`、`LIMITS`、`MAX_BATCH_SIZE`、`BCRYPT_ROUNDS`、`HEARTBEAT_INTERVAL`
  - 替换散落 magic numbers 引用
  - `server/index.ts` 的 `process.env.PORT/NODE_ENV` 改走 `getConfig()`

### 本轮不包含

- 不引入 InversifyJS 或替换自研 Container（保留 string token 内部表示，仅类型化调用点）
- 不删除 `getXxxService()` 函数（保留签名，仅内部类型化；100+ 调用点零改动）
- 不合并 `services/`、`services/domain/`、`database/services/` 三套服务目录（另起切片）
- 不拆分前端大文件（MediaManagement.tsx、WorkflowBuilder.tsx，spec 已有明确路径）
- 不重构 voice/image/music/video/videoAgent 等所有 AI 路由（本轮仅做 text 切片示范）
- 不修改数据库 schema、API 路径或响应字段

---

## 文件结构

### 新增

- `server/config/model-defaults.ts`
  - 集中导出 AI 模型默认值常量。
  - 当前包含 `DEFAULT_CHAT_MODEL`，后续可扩展 `DEFAULT_VOICE_MODEL` 等。

- `server/config/constants.ts`
  - 集中导出超时、限流、批次大小、加密轮数、心跳间隔等常量。
  - 不依赖任何业务模块，避免循环依赖。

- `server/routes/text/chat-request-builder.ts`
  - 导出 `buildChatRequestBody(payload)` 纯函数。
  - 复用 `DEFAULT_CHAT_MODEL`，消除 `text.ts` 中重复的请求体构造。

- `server/routes/text/__tests__/chat-request-builder.test.ts`
  - 覆盖基本字段透传、`model` 默认值、流式 `stream=true` 注入。

### 修改

- `server/service-registration/service-getters.ts`
  - 50+ 个 `getXxxService()` 内部实现改为类型化 `resolve(container, TOKENS.XXX)`。
  - 函数签名不变，所有调用点零改动。

- `server/container.ts`
  - 无需改动（保留 `resolve<T>(token: string)` API，作为类型化 `resolve<TToken>` 的底层实现）。

- `server/container.types.ts`
  - 确认 `resolve<TToken>(container, token)` 函数签名正确，类型守卫生效。

- `server/index.ts`
  - `container.resolve<T>(string)` 改为类型化 `resolve(container, TOKENS.X)`。
  - `process.env.PORT` / `process.env.NODE_ENV` 改走 `getConfig()`。

- `server/service-registration/__tests__/*-di-contract.test.ts`（多个文件）
  - 从"读源码字符串匹配"改为"运行时调用 `resolve(container, TOKENS.X)` 验证返回类型"。
  - 保留对 token 字符串值的断言（确保 token 唯一性）。

- `server/routes/text.ts`
  - 提取 `buildChatRequestBody` 到 `routes/text/chat-request-builder.ts`。
  - `/chat` 与 `/chat/stream` 共用一份构造逻辑。
  - 硬编码 `'abab5.5-chat'` 改为引用 `DEFAULT_CHAT_MODEL`。

- 散落 magic numbers 引用
  - 替换为 `server/config/constants.ts` 中的常量。
  - 必须通过 grep 找到全部引用点，逐一替换。

### 删除

- 无（保留 `service-getters.ts`，仅内部类型化）。

---

## 任务分解与状态

### Phase 1: DI 容器类型安全化

#### Task 1.1: 类型化 `service-getters.ts` 内部实现

- [ ] 修改 `server/service-registration/service-getters.ts`：50+ 个 `getXxxService()` 内部从 `getGlobalContainer().resolve<T>(string)` 改为 `resolve(container, TOKENS.XXX)`。
- [ ] `import { resolve } from '../container.types.js'`、`import { getGlobalContainer } from '../container.js'`。
- [ ] 运行 `npm run build`，0 类型错误。

#### Task 1.2: 改造 `server/index.ts`

- [ ] `container.resolve<MiniMaxClient>(TOKENS.MINIMAX_CLIENT)` → `resolve(container, TOKENS.MINIMAX_CLIENT)` 等。
- [ ] `process.env.PORT` / `process.env.NODE_ENV` 改走 `getConfig()`（如 Config 类型未覆盖，先扩展）。
- [ ] 运行 `npm run build` 通过。

#### Task 1.3: 修正 DI 契约测试为运行时验证

- [ ] 修改 `server/service-registration/__tests__/*-di-contract.test.ts`（多个文件）。
- [ ] 删除"读源码字符串匹配"逻辑（`readSource(...).toContain(...)`）。
- [ ] 改为：初始化容器 → 调用 `getXxxService()` 或 `resolve(container, TOKENS.X)` → 断言返回类型是预期 service 实例（用 `instanceof`）。
- [ ] 运行 `npm run test -- server/service-registration/__tests__/` 全部通过。

#### Task 1.4: 验证与提交

- [ ] 运行 `npm run build` 通过。
- [ ] 运行 `npm run test -- server/` 全部通过。
- [ ] `git commit -m "refactor(di): service-getters 内部类型化 resolve + index.ts getConfig 收敛 + DI 契约测试改为运行时验证"`

### Phase 2: AI 路由 `buildChatRequestBody` 复用

#### Task 2.1: RED — `chat-request-builder` 测试

- [ ] 创建 `server/routes/text/__tests__/chat-request-builder.test.ts`。
- [ ] 覆盖：基本字段透传、`model` 默认值、`stream=true` 注入、与 `text.ts` 现有 `/chat` 行为一致。
- [ ] 运行测试期望 RED：模块不存在。

#### Task 2.2: GREEN — 实现 `buildChatRequestBody`

- [ ] 创建 `server/config/model-defaults.ts`，导出 `DEFAULT_CHAT_MODEL = 'abab5.5-chat'`。
- [ ] 创建 `server/routes/text/chat-request-builder.ts`，导出 `buildChatRequestBody(payload)` 纯函数。
- [ ] 运行测试期望 GREEN。

#### Task 2.3: 改造 `text.ts`

- [ ] `/chat` 路由改用 `buildChatRequestBody`。
- [ ] `/chat/stream` 路由改用 `buildChatRequestBody`，传入 `stream: true`。
- [ ] 删除原内联 `buildRequestBody` 重复实现。

#### Task 2.4: 验证与提交

- [ ] 运行 `npm run test -- server/routes/text` 全部通过。
- [ ] 运行 `npm run build` 通过。
- [ ] `git commit -m "refactor(routes): 提取 buildChatRequestBody 复用 + 集中 DEFAULT_CHAT_MODEL"`

### Phase 3: 配置常量集中化

#### Task 3.1: 创建 `server/config/constants.ts`

- [ ] grep 找出所有散落的 `TIMEOUTS`、`RATE_LIMITS`、`LIMITS`、`MAX_BATCH_SIZE`、`BCRYPT_ROUNDS`、`HEARTBEAT_INTERVAL`。
- [ ] 创建 `server/config/constants.ts`，集中导出。
- [ ] 确保不依赖任何业务模块（避免循环依赖）。

#### Task 3.2: 替换调用点

- [ ] 逐文件替换 magic numbers 为常量引用。
- [ ] 每替换 5-10 个文件运行一次 `npm run build`。

#### Task 3.3: `index.ts` 改走 `getConfig()`

- [ ] `process.env.PORT` → `getConfig().port`。
- [ ] `process.env.NODE_ENV` → `getConfig().nodeEnv`。
- [ ] 确认 `getConfig()` 已经覆盖这些字段（如未覆盖，扩展 `Config` 类型）。

#### Task 3.4: 验证与提交

- [ ] 运行 `npm run build` 通过。
- [ ] 运行 `npm run test` 全套测试通过。
- [ ] `git commit -m "refactor(config): 集中化 TIMEOUTS/RATE_LIMITS/LIMITS 常量到 server/config/constants.ts"`

---

## 验证记录

| 命令 | 结果 | 说明 |
|------|------|------|
| `rtk npm run test -- server/routes/__tests__/` | 待执行 | DI 契约测试必须全通过 |
| `rtk npm run test -- server/routes/text/` | 待执行 | chat-request-builder 测试 |
| `rtk npm run build` | 待执行 | tsc + vite build 必须 0 错误 |
| `rtk npm run test:coverage` | 待执行 | 后端 ≥80%，前端 >70% |

---

## Review 自检

- **单一职责**：`buildChatRequestBody` 只负责请求体构造；`constants.ts` 只承载常量；`model-defaults.ts` 只承载 AI 模型默认值。
- **类型安全**：所有调用点改走 `resolve<TToken>`，编译期捕获 token 错配；新增生产代码无 `any`、`@ts-ignore`、`as SomeType`。
- **依赖倒置**：删除 Service Locator 后，调用方必须显式声明依赖，便于注入 mock。
- **开闭原则**：新增 AI 模型只需在 `model-defaults.ts` 加一行，无需修改路由文件。
- **行为兼容**：API 路径、响应字段、数据库 schema 全部不变；调用语义零变更。
- **后续切片**：
  - `services/` / `services/domain/` / `database/services/` 三套合并（高风险，另起切片）
  - voice/image/music/video/videoAgent 路由同样可应用 `buildRequestBody` 工厂模式
  - 前端大文件拆分（MediaManagement 1188 行、WorkflowBuilder 1139 行）
