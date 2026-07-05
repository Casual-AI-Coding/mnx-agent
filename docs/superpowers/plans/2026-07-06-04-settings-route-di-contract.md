# Settings 路由 DI 解耦实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本计划在当前 Ultrawork 约束下由当前 session 内联执行，禁止使用 sub agent。

**Goal:** 消除 `server/routes/settings/index.ts` 中重复直接 `new SettingsService(conn)` 的路由层硬编码依赖，让 SettingsService 通过容器 token 统一解析。

**Architecture:** 将 `SettingsService` 注册到现有 DI 容器，并纳入 `ContainerTokenMap` 类型契约。Settings 路由只依赖服务注册模块提供的 getter，不再直接知道 `DatabaseConnection` 与 `SettingsService` 构造细节，降低路由层与基础设施层耦合。

**Tech Stack:** Express + TypeScript strict + Vitest + 当前轻量 DI 容器。

---

## 范围

本阶段只处理 Settings 路由切片：

- `TOKENS` 新增 `SETTINGS_SERVICE`。
- `registerServices()` 注册 `SettingsService` singleton。
- `container.types.ts` 将新 token 映射到 `SettingsService`。
- `service-registration.ts` 导出 `getSettingsService()`。
- `server/routes/settings/index.ts` 通过 `getSettingsService()` 获取服务，不再直接导入 `getConnection` 或 `SettingsService`。
- 新增架构契约测试，防止 Settings 路由重新出现直接 `new SettingsService`。

不做以下事项：

- 不重写 `SettingsService` 内部 Repository 构造。
- 不改变 Settings API 路径、响应结构或校验 schema。
- 不引入新 DI 框架。
- 不一次性改造 `auth`、`workflows`、`external-proxy` 等其它路由。

## 文件结构

- Modify: `server/service-registration.ts`
  - 新增 SettingsService token、注册逻辑和 getter。
- Modify: `server/container.types.ts`
  - 将 SettingsService 纳入 token 类型映射。
- Modify: `server/routes/settings/index.ts`
  - 删除路由层直接构造服务的重复代码。
- Modify: `server/__tests__/container-types.test.ts`
  - 增加 SettingsService token 类型解析覆盖。
- Create: `server/routes/__tests__/settings-di-contract.test.ts`
  - 静态架构契约测试，锁定路由层不得直接构造 SettingsService。

## 验证策略

- 基线：`rtk npm run test:server -- server/services/__tests__/settings-service.test.ts server/__tests__/container-types.test.ts`
- RED：新增 `settings-di-contract.test.ts` 后，旧路由因包含 `new SettingsService` 失败。
- GREEN：路由改为 `getSettingsService()` 后，架构契约测试通过。
- 回归：`rtk npm run test:server -- server/routes/__tests__/settings-di-contract.test.ts server/services/__tests__/settings-service.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`
- 构建：`rtk npm run build`
- LSP：所有改动 TS 文件无新增 error。

## Task 1: 写 Settings 路由 DI 契约 RED 测试

**Files:**

- Create: `server/routes/__tests__/settings-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

测试读取 `server/routes/settings/index.ts` 源码，断言不包含 `new SettingsService`，并断言路由通过 `getSettingsService` 获取服务。

- [ ] **Step 2: 运行 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/settings-di-contract.test.ts`

Expected: 失败，原因是当前路由仍包含多处 `new SettingsService(conn)`。

## Task 2: 将 SettingsService 纳入容器契约

**Files:**

- Modify: `server/service-registration.ts`
- Modify: `server/container.types.ts`
- Modify: `server/__tests__/container-types.test.ts`

- [ ] **Step 1: 扩展 token 与类型测试**

在容器类型测试中注册 `TOKENS.SETTINGS_SERVICE`，并将 `resolve(container, TOKENS.SETTINGS_SERVICE)` 赋给 `SettingsService` 类型变量。

- [ ] **Step 2: 实现 token、注册和 getter**

`service-registration.ts` 导入 `SettingsService`，新增 `TOKENS.SETTINGS_SERVICE`，在 `registerServices()` 内以 `DATABASE` 依赖注册 singleton，并导出 `getSettingsService()`。

- [ ] **Step 3: 同步类型映射**

`container.types.ts` 导入 `SettingsService`，在 `ContainerTokenMap` 中新增对应 token。

## Task 3: 改造 Settings 路由

**Files:**

- Modify: `server/routes/settings/index.ts`

- [ ] **Step 1: 删除路由层基础设施依赖**

删除 `getConnection` 与 `SettingsService` 导入，改为导入 `getSettingsService`。

- [ ] **Step 2: 替换重复构造**

将每个处理器中的 `const conn = getConnection(); const settingsService = new SettingsService(conn)` 替换为 `const settingsService = getSettingsService()`。

- [ ] **Step 3: 运行 GREEN 与回归**

Run: `rtk npm run test:server -- server/routes/__tests__/settings-di-contract.test.ts server/services/__tests__/settings-service.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`

Expected: 所有测试通过。

## Task 4: 最终验证与提交

**Files:**

- Modify: `server/service-registration.ts`
- Modify: `server/container.types.ts`
- Modify: `server/routes/settings/index.ts`
- Modify: `server/__tests__/container-types.test.ts`
- Create: `server/routes/__tests__/settings-di-contract.test.ts`
- Create: `docs/superpowers/plans/2026-07-06-04-settings-route-di-contract.md`

- [ ] **Step 1: LSP 验证**

对所有改动 TS 文件运行 diagnostics。

- [ ] **Step 2: 构建验证**

Run: `rtk npm run build`

Expected: build 成功。

- [ ] **Step 3: 原子提交**

按 git-master 流程提交：计划文档单独提交；DI token/路由/测试一起提交。

## 自审

- 计划无占位符、无未决问题。
- 该切片直接回应 Oracle P0：消除一处路由层直接 new Service 的硬编码。
- 静态架构契约测试用于防止同一路由回退到直接构造。
- 变更只扩展现有容器模式，不引入新框架，不扩大到其它路由。
