# 实施计划：架构健康度提升批次（ADR-0013）

> 关联 ADR: @docs/decisions/0013-architecture-health-cohort-cycle-dependency-large-file-deadcode.md
>
> 流程：方案（已完成，见 ADR-0013）→ 计划（本文档）→ 实现 → review → 验证
>
> 每完成一个 Phase 立即 git commit。所有改动在 main 分支进行，不使用 sub-agent。

---

## 全局约束

- **AGENTS.md 铁律**：禁止 `any` / `@ts-ignore` / 循环依赖 / 空 catch / 字符串拼接 SQL / 敏感信息日志
- **语言**：所有注释、commit message、ADR 使用简体中文
- **测试**：先写/更新测试，再实现（TDD）；覆盖率后端 ≥ 80%、前端 > 70%
- **提交**：每个 Phase 一个或多个原子 commit，commit message 形如 `refactor(scope): ADR-0013 Phase X 简短描述`

---

## Phase A：修复 workflow engine 循环依赖

### 目标
消除 `madge` 报告的 2 条 workflow engine 真循环依赖：executors 不再调用 service-registration，改由 `NodeExecutionContext` 注入依赖。

### 步骤

1. **盘点依赖**（读，不写）
   - 读 `action-executor.ts`，记录所有 `getLogService()` 调用点及调用的方法
   - 读 `queue-executor.ts`，记录所有 `getTaskService()` 调用点及调用的方法
   - 读 `node-executor-registry.ts` 看 `NodeExecutionContext` 当前形状
   - 读 `engine.ts` 看 context 在何处被构造、有哪些服务可注入

2. **扩展 `NodeExecutionContext`**
   - 新增字段：`logService: ILogService`、`taskService: ITaskService`
   - 类型来自 `server/services/domain/`（已存在的领域服务接口）

3. **改写 executors**
   - `action-executor.ts`：删除 `import { getLogService }`，从传入的 context 参数中读 `logService`
   - `queue-executor.ts`：删除 `import { getTaskService }`，从传入的 context 参数中读 `taskService`
   - 同步更新 executor 内部 `executeActionNode` / `executeQueueNode` 的参数接口

4. **更新 registry 与 engine**
   - `node-executor-registry.ts`：构造各 executor 的 wrapped 调用时把 context 透传
   - `engine.ts`：构造 `NodeExecutionContext` 时从 service-registration 注入 `logService` / `taskService`（engine 处于容器可达层，调用 getLogService 不形成环）

5. **更新测试**
   - `server/services/__tests__/workflow-engine-*.test.ts`：mock context 补 `logService` / `taskService`
   - 若 executors 有独立单测，同样补字段

### 验证
- `npx madge --circular --extensions ts server/index.ts`：workflow 相关循环条目归零（migrations 与 service-registration 自环保留）
- `npm run test:server`：workflow 相关测试全绿
- `npm run build`：TypeScript 无错

### Commit
`refactor(workflow): ADR-0013 Phase A executors 通过 context 注入依赖消除循环`

---

## Phase B：拆分 `server/routes/media.ts`

### 目标
将 `routes/media.ts`（649 行 / 17 端点）按业务子域拆为 5 个子模块 + 1 个聚合点。

### 步骤

1. **创建目录与聚合点**
   ```
   server/routes/media/
   ├── index.ts        # export default router，挂载 5 个子 router
   ```

2. **按业务子域拆分端点**（保持各端点的 handler 逻辑与中间件链不变，仅做物理迁移）

   | 子模块 | 端点 | 大致行数 |
   |--------|------|----------|
   | `crud.ts` | GET /, GET /:id, POST /, PUT /:id, DELETE /:id | ~120 |
   | `operations.ts` | PATCH /:id/favorite, /:id/pin, /:id/public; POST /batch/public; DELETE /batch | ~150 |
   | `upload.ts` | POST /upload, POST /upload-from-url | ~120 |
   | `recovery.ts` | GET /recoverable, POST /recover/:logId | ~80 |
   | `download.ts` | GET /:id/token, GET /:id/download, POST /batch/download | ~140 |

3. **处理路由顺序**（关键）
   - express 按声明顺序匹配。子 router 内部按原文件顺序；index.ts 挂载子 router 时按「不冲突」原则排列
   - 例如 `/recoverable` 必须在 `/:id` 之前匹配 → 通过把 recovery router 挂载在 crud router 之前解决，或保持 `recoverable` 在 crud 内部首位

4. **删除原 `routes/media.ts`**，改为 `routes/media/index.ts`（Node ESM 解析 `./media` 会优先选目录）

5. **更新调用方**
   - 全仓 grep `routes/media` 与 `from './media'`，确认所有 import 仍指向新入口
   - 测试文件若 `import router from '../media'` 仍能命中 `media/index.ts`

### 验证
- `npm run test:server`：路由测试全绿（端点路径不变）
- 手动 `curl` 关键端点（如果环境允许）或检查测试覆盖
- `npm run build`：TypeScript 无错

### Commit
`refactor(routes): ADR-0013 Phase B 拆分 routes/media.ts 为业务子模块`

---

## Phase C：清理 `server/lib/minimax.ts` 死代码

### 目标
删除 1 行 re-export 文件，统一所有引用到 `minimax/index.js`。

### 步骤

1. **盘点引用**
   - `grep -rn "from.*lib/minimax[\"']" server src`（排除 `lib/minimax/` 自身）
   - 区分 `from '../minimax'`（指向单文件）vs `from '../minimax/index.js'`（指向目录）

2. **统一引用**
   - 所有指向 `lib/minimax` 单文件的 import 改为 `lib/minimax/index.js`

3. **删除文件**
   - `rm server/lib/minimax.ts`

### 验证
- `npm run build`：TypeScript 无错（找不到模块会立即报错）
- `grep` 确认无残留引用

### Commit
`refactor(lib): ADR-0013 Phase C 删除 server/lib/minimax.ts 死代码 re-export`

---

## 最终 review 与验证

### review（自审 checklist）
- [ ] 所有改动遵守 AGENTS.md §9 禁止清单（无 any / @ts-ignore / 循环 / 空 catch）
- [ ] 新增/修改的代码有对应的中文注释解释 WHY（不是 WHAT）
- [ ] 测试覆盖了新行为（context 注入、子 router 端点）
- [ ] ADR-0013 的「不在范围内」清单被严格执行（未顺手做其他重构）

### 验证（证据）
- `npx madge --circular --extensions ts server/index.ts` 输出贴到 ADR-0013 评论或本 plan 末尾
- `npm run build` 通过
- `npm run test:coverage:backend` ≥ 80%
- `npm run test:coverage:frontend` > 70%（若有前端改动；本轮预期无）

### 风险与回滚
- 若 Phase A 改动后测试大面积失败且无法快速修复 → `git revert` 单个 commit，回滚 Phase A 但保留 Phase B/C
- 若 Phase B 路由顺序错乱 → express 会在测试期暴露，立即调整 index.ts 挂载顺序
- Phase C 几乎零风险

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-23 | 初版，对应 ADR-0013 |
