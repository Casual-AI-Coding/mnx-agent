# 配置边界契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本计划在当前 Ultrawork 约束下由当前 session 内联执行，禁止使用 sub agent。

**Goal:** 将后端配置模块收敛为可信边界，确保环境变量在进入应用内部前完成类型解析、枚举校验和密钥收窄。

**Architecture:** 保持 `server/config/index.ts` 作为集中配置入口，不改变调用方 API。通过小型解析函数替代散落在 `loadConfig()` 内的字符串类型断言和非空断言，使非法配置 fail-fast，内部 `AppConfig` 只暴露已解析的合法值。

**Tech Stack:** TypeScript strict、Vitest、Express 后端配置模块。

---

## 范围

本阶段只处理配置边界契约：

- `NODE_ENV` 只允许 `development | production | test`，未设置时默认为 `development`。
- `MINIMAX_REGION` 只允许 `domestic | international`，未设置时默认为 `international`。
- `LOG_LEVEL` 只允许 `debug | info | warn | error`，未设置时默认为 `info`。
- `JWT_SECRET` 与 `MEDIA_TOKEN_SECRET` 的校验函数返回已验证字符串，`loadConfig()` 不再使用非空断言读取它们。

不做以下事项：

- 不引入新配置库。
- 不改变 `.env` 文件格式。
- 不改变 `getConfig()` 缓存策略。
- 不改变数据库、HTTP、WebSocket 或路由行为。
- 不迁移前端配置。

## 文件结构

- Modify: `server/config/index.ts`
  - 继续作为配置聚合入口。
  - 新增有限枚举解析函数和密钥读取函数。
  - 移除本次触及路径中的 `!` 非空断言和字符串类型断言。
- Modify: `server/config/__tests__/config-validation.test.ts`
  - 扩展配置边界测试，锁定非法枚举 fail-fast 与合法默认值。

## 验证策略

- 基线：`rtk npm run test:server -- server/config/__tests__/config-validation.test.ts`
- RED：新增非法 `NODE_ENV`、`MINIMAX_REGION`、`LOG_LEVEL` 用例后，旧实现应失败，因为旧实现会静默接收非法字符串。
- GREEN：实现解析函数后，同一测试应通过。
- 集成回归：`rtk npm run test:server -- server/config/__tests__/config-validation.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`
- 构建：`rtk npm run build`
- LSP：`server/config/index.ts` 与 `server/config/__tests__/config-validation.test.ts` 无诊断。

## Task 1: 扩展配置边界测试

**Files:**

- Modify: `server/config/__tests__/config-validation.test.ts`

- [ ] **Step 1: 写 RED 测试**

在现有测试文件中引入 `loadConfig` 与 `validateMediaTokenSecret`，增加以下场景：

```typescript
describe('loadConfig boundary parsing', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'j'.repeat(32),
      MEDIA_TOKEN_SECRET: 'm'.repeat(32),
      NODE_ENV: 'test',
    }
  })

  it('rejects unsupported NODE_ENV values', () => {
    process.env.NODE_ENV = 'staging'

    expect(() => {
      loadConfig()
    }).toThrow(/NODE_ENV.*development.*production.*test/)
  })

  it('rejects unsupported MINIMAX_REGION values', () => {
    process.env.MINIMAX_REGION = 'edge'

    expect(() => {
      loadConfig()
    }).toThrow(/MINIMAX_REGION.*domestic.*international/)
  })

  it('rejects unsupported LOG_LEVEL values', () => {
    process.env.LOG_LEVEL = 'trace'

    expect(() => {
      loadConfig()
    }).toThrow(/LOG_LEVEL.*debug.*info.*warn.*error/)
  })

  it('uses typed defaults for optional enum configuration', () => {
    delete process.env.MINIMAX_REGION
    delete process.env.LOG_LEVEL

    const config = loadConfig()

    expect(config.server.nodeEnv).toBe('test')
    expect(config.minimax.region).toBe('international')
    expect(config.logging.level).toBe('info')
  })
})
```

- [ ] **Step 2: 运行 RED**

Run: `rtk npm run test:server -- server/config/__tests__/config-validation.test.ts`

Expected: 新增三个非法枚举测试失败，失败原因是旧实现未抛错。

## Task 2: 实现配置解析收窄

**Files:**

- Modify: `server/config/index.ts`

- [ ] **Step 1: 让密钥校验返回字符串**

将 `validateJwtSecret()` 与 `validateMediaTokenSecret()` 的返回类型从 `void` 改为 `string`，通过局部变量窄化后返回已验证密钥。

- [ ] **Step 2: 新增枚举解析函数**

新增 `parseNodeEnv()`、`parseMiniMaxRegion()`、`parseLogLevel()`。每个函数只接受 `string | undefined`，未设置时返回默认值，非法值抛出包含变量名和允许值的错误。

- [ ] **Step 3: 替换 `loadConfig()` 内断言**

`loadConfig()` 使用解析函数返回值组装 `AppConfig`，不再对 `NODE_ENV`、`MINIMAX_REGION`、`LOG_LEVEL` 和密钥使用类型断言或非空断言。

- [ ] **Step 4: 运行 GREEN**

Run: `rtk npm run test:server -- server/config/__tests__/config-validation.test.ts`

Expected: 配置测试全部通过。

## Task 3: 验证与提交

**Files:**

- Modify: `server/config/index.ts`
- Modify: `server/config/__tests__/config-validation.test.ts`
- Create: `docs/superpowers/plans/2026-07-06-03-config-boundary-contract.md`

- [ ] **Step 1: LSP 验证**

Run diagnostics for both changed TypeScript files.

Expected: No diagnostics found.

- [ ] **Step 2: 相关回归测试**

Run: `rtk npm run test:server -- server/config/__tests__/config-validation.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`

Expected: 所有指定测试通过。

- [ ] **Step 3: 构建验证**

Run: `rtk npm run build`

Expected: build 成功；若仅出现既有 Vite 动态/静态导入 warning，则记录为非本次引入。

- [ ] **Step 4: 原子提交**

按 git-master 流程提交：计划文档单独提交；配置实现与测试一起提交。

## 自审

- 计划无占位符、无未决问题。
- 每个代码改动都有 RED/GREEN 验证路径。
- 变更边界集中在配置模块，不扩散到调用方。
- 该切片提升配置边界内聚性，减少内部调用方对不可信环境字符串的耦合。
