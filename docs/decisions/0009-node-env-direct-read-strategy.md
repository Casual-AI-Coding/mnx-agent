# ADR-0009：process.env.NODE_ENV 直读策略确认与测试守卫 helper 提取

## 状态

已接受

---

## 背景

ADR-0007 review 阶段发现全项目共 11 处 `process.env.NODE_ENV` 直接访问，分布在 6 个文件：

| 文件 | 行 | 用途 |
|------|----|----|
| `server/config/__tests__/config-validation.test.ts` | 133 | 测试代码模拟 staging 环境 |
| `server/config/index.ts` | 200 | `loadConfig()` 内 `parseNodeEnv` 入口 |
| `server/config/index.ts` | 262 | `isProduction()` 实现 |
| `server/database/connection.ts` | 32 | `getConfigFromEnv()` 测试库选择 |
| `server/lib/logger.ts` | 18 | module-load 期 defaultConfig |
| `server/lib/error-tracking.ts` | 31 | Sentry 初始化环境标签 |
| `server/lib/media-storage.ts` | 18/48/74/101 | 4 处测试防呆守卫（强制要求 TEST_MEDIA_ROOT） |

review 提出 P2 建议集中化，本次深入探索后确认**集中化反而会引入更严重问题**，故写本 ADR 显式记录决策。

---

## 决策

### 决策 1：11 处中 7 处保留 `process.env.NODE_ENV` 直读

**理由（按场景分类）**：

1. **Config 自身入口（2 处，必须直读）**
   - `config/index.ts:200` `loadConfig()`：这是 `getConfig()` 的源头，若改走 `getConfig()` 会形成循环依赖
   - `config/index.ts:262` `isProduction()`：作为 config 模块的公共 API，必须在 config 初始化完成前可调用（bootstrap 早期）

2. **测试代码（1 处，必须直读）**
   - `config/__tests__/config-validation.test.ts:133`：测试代码就是要直接控制 env 来验证配置解析逻辑

3. **Module-load 期初始化（2 处，直读更安全）**
   - `lib/logger.ts:18` `defaultConfig`：在 module load 时执行，此时 `getConfig()` 可能尚未初始化或正在初始化中；logger 是底层依赖，反向依赖 config 会形成循环
   - `lib/error-tracking.ts:31` Sentry 初始化：同理，且 Sentry 在错误追踪链路上，必须最早可用

4. **独立 config 入口（1 处，直读合理）**
   - `database/connection.ts:32` `getConfigFromEnv()`：Database 有自己的配置体系（DB_TEST_NAME/USER/PASSWORD），与主 AppConfig 解耦；module 顶层已用 logger，再依赖 config 增加耦合

5. **Sentry 环境标签（1 处，直读合理）**
   - `error-tracking.ts:31`：优先用 `SENTRY_ENVIRONMENT`，fallback 到 `NODE_ENV` 是合理的链式读取，不应引入 config 依赖

### 决策 2：提取 `isTestEnvironmentGuard()` helper 给 media-storage 防呆守卫

4 处 `process.env.NODE_ENV === 'test'` 是 media-storage 的**测试防呆守卫**——确保测试不会误写生产路径 `./data/media`。

提取到 `server/lib/env-utils.ts`：
- 命名清晰表达意图（防呆守卫，不是普通环境判断）
- 后续修改测试环境探测策略只改 1 处
- 模块边界合理：env-utils 是底层 lib，无循环依赖风险

### 否决的替代方案

1. ❌ **全部集中到 `getConfig().server.nodeEnv`**：会引入循环依赖、初始化顺序问题、降低测试可控性
2. ❌ **Symbol-based env provider**：过度工程化，对 11 处场景收益甚微
3. ❌ **完全不变**：失去 4 处防呆守卫的命名清晰度收益

---

## 后果

### 正面影响

- 决策显式记录，避免后续 review 反复提出「集中化建议」
- media-storage 4 处防呆守卫语义更清晰：`isTestEnvironmentGuard()` 替代裸字符串比较
- env-utils 作为新模块，可承载未来环境探测需求（如 `isDevelopment()`、`isCi()`）

### 负面影响

- 仍有 7 处 `process.env.NODE_ENV` 直读（但都有充分理由）
- 新增 `server/lib/env-utils.ts` 文件（轻量，<20 行）

### 风险

- **低**：helper 提取是纯重构，行为不变；测试用例覆盖 media-storage 守卫路径
- **低**：未来若新增「测试环境探测」需求，需要明确是「防呆守卫」还是「业务判断」语义

---

## 元数据

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-23 |
| 状态 | 已接受 |
| 决策者 | Sisyphus（自主决策） |
| 审阅者 | 待 review |
| 关联 | ADR-0007 follow-up P2 |
