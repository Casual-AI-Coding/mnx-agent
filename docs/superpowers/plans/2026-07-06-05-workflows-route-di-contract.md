# Workflows 路由 DI 解耦实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本计划在当前 Ultrawork 约束下由当前 session 内联执行，禁止使用 sub agent。

**Goal:** 消除 `server/routes/workflows.ts` 中对 `WorkflowService` 与 `WorkflowEngine` 的直接构造，让路由层使用既有容器 getter 获取工作流应用服务。

**Architecture:** 复用现有 `WORKFLOW_SERVICE`、`WORKFLOW_ENGINE`、`SERVICE_NODE_REGISTRY`、`EVENT_BUS` 容器 token。路由层继续保留 HTTP 编排、权限校验和响应格式职责，但不再了解 workflow service/engine 的构造依赖。

**Tech Stack:** Express + TypeScript strict + Vitest + 当前轻量 DI 容器。

---

## 范围

本阶段只处理 Workflows 路由：

- `server/routes/workflows.ts` 改用 `getWorkflowService()` 与 `getWorkflowEngineService()`。
- 删除 `WorkflowService` 与 `WorkflowEngine` 生产导入。
- 新增架构契约测试，防止该路由重新出现直接 `new WorkflowService` 或 `new WorkflowEngine`。
- 清理本文件中因触碰暴露的 unused 变量和 `req.user!` 非空断言。

不做以下事项：

- 不重写 WorkflowService 或 WorkflowEngine 内部逻辑。
- 不改变 Workflows API 路径、响应结构、权限规则或数据库查询。
- 不一次性改造其它仍直接 new 的路由。
- 不引入新 DI 框架。

## 文件结构

- Modify: `server/routes/workflows.ts`
  - 路由通过容器 getter 获取 workflow service/engine。
- Create: `server/routes/__tests__/workflows-di-contract.test.ts`
  - 静态架构契约测试，锁定路由层不得直接构造 workflow 服务。

## 验证策略

- 基线：`rtk npm run test:server -- server/routes/__tests__/workflows.test.ts server/__tests__/workflow-pagination.test.ts`
- RED：新增 `workflows-di-contract.test.ts` 后，旧路由因包含 `new WorkflowService` 与 `new WorkflowEngine` 失败。
- GREEN：路由改为容器 getter 后，契约测试通过。
- 回归：`rtk npm run test:server -- server/routes/__tests__/workflows-di-contract.test.ts server/routes/__tests__/workflows.test.ts server/__tests__/workflow-pagination.test.ts`
- 构建：`rtk npm run build`
- LSP：所有改动 TS 文件无诊断。

## Task 1: 写 Workflows 路由 DI 契约 RED 测试

**Files:**

- Create: `server/routes/__tests__/workflows-di-contract.test.ts`

- [ ] **Step 1: 写失败测试**

测试读取 `server/routes/workflows.ts` 源码，断言包含 `getWorkflowService` 与 `getWorkflowEngineService`，且不包含 `new WorkflowService` 或 `new WorkflowEngine`。

- [ ] **Step 2: 运行 RED**

Run: `rtk npm run test:server -- server/routes/__tests__/workflows-di-contract.test.ts`

Expected: 失败，原因是当前路由仍直接构造 workflow service/engine。

## Task 2: 改造 Workflows 路由

**Files:**

- Modify: `server/routes/workflows.ts`

- [ ] **Step 1: 替换服务构造**

导入 `getWorkflowService` 与 `getWorkflowEngineService`，移除 `WorkflowService` 与 `WorkflowEngine` 导入，将 7 处 `new WorkflowService(db)` 改为 `getWorkflowService()`，将 test-run 中 `new WorkflowEngine(...)` 改为 `getWorkflowEngineService()`。

- [ ] **Step 2: 清理本文件类型逃逸与 unused**

新增认证用户 helper 代替 `req.user!`，删除 unused `testRunWorkflowSchema`、`offset`、`isPublicFilter` 和 `/available-actions` 中 unused `db`。

- [ ] **Step 3: 运行 GREEN 与回归**

Run: `rtk npm run test:server -- server/routes/__tests__/workflows-di-contract.test.ts server/routes/__tests__/workflows.test.ts server/__tests__/workflow-pagination.test.ts`

Expected: 所有测试通过。

## Task 3: 最终验证与提交

**Files:**

- Modify: `server/routes/workflows.ts`
- Create: `server/routes/__tests__/workflows-di-contract.test.ts`
- Create: `docs/superpowers/plans/2026-07-06-05-workflows-route-di-contract.md`

- [ ] **Step 1: LSP 验证**

对改动 TS 文件运行 diagnostics。

- [ ] **Step 2: 构建验证**

Run: `rtk npm run build`

Expected: build 成功。

- [ ] **Step 3: 原子提交**

按 git-master 流程提交：计划文档单独提交；路由和契约测试一起提交。

## 自审

- 计划无占位符、无未决问题。
- 该切片直接回应 Oracle P0：继续消除路由层直接 new Service 的硬编码。
- 只复用已有容器 token，不新增跨模块抽象。
