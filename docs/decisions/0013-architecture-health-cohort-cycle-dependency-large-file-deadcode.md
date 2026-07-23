# ADR-0013：架构健康度提升批次（循环依赖 / 大文件 / 死代码）

## 状态

已接受

---

## 背景

ADR-0001 ~ ADR-0012 已陆续完成路由 Zod 校验、NODE_ENV 直读、throwValidationError 标准化、database/services 死代码清理等改进。当前架构已相当成熟（DDD ports + domain services + workflow engine + 类型化 DI 容器）。

但通过 `madge --circular` 与代码盘点，仍发现 **3 类未解决的架构债务**，直接影响代码可维护性与 AGENTS.md 铁律的执行：

### 1. workflow engine 的真循环依赖（违反 AGENTS.md §9 第 3 条「循环依赖禁止」）

`madge` 报告 14 个循环依赖，其中：

| 数量 | 类型 | 性质 |
|------|------|------|
| 10 | `database/migrations-async.ts → migrations/NNN_*.ts` | **可接受**：migrations 之间不互相引用，由注册表统一加载，是设计模式而非真循环 |
| 2 | `service-registration.ts → service-getters → container.types → services/X` | **可接受**：DI 容器自身的注册/解析双向引用，是 IoC 容器的固有特性 |
| 2 | `workflow/engine → node-executor → node-executor-registry → executors/index → action-executor / queue-executor` | **真循环**：executors 内部直接调用 `getLogService()` / `getTaskService()` 服务定位器，而服务定位器又通过 `WORKFLOW_ENGINE` token 反向持有 engine，形成环 |

最后 2 个是 **本次必须修复** 的真循环。根因不是服务定位器（ADR-0006 已论证保留），而是 **executor 越层访问服务定位器**：executor 作为 workflow engine 的叶子节点，本应只通过 `NodeExecutionContext` 接收依赖，却走了「服务定位器 → container → engine → node-executor → registry → executor」的环。

### 2. 单文件超长违反单一职责（呼应 AGENTS.md §4.4「单文件 300 行上限」精神）

| 文件 | 行数 | 问题 |
|------|------|------|
| `server/routes/media.ts` | 649 | 17 个端点（CRUD / 收藏 / 置顶 / 公开 / 批量 / 上传 / 恢复 / 下载）混杂在同一个 router 文件，路由层职责过载 |
| `server/services/cron-scheduler.ts` | 486 | 调度器 + misfire 策略 + job 同步 + 重试接入 多职责混合 |
| `server/services/websocket-service.ts` | 468 | 连接管理 + 频道订阅 + 消息广播 + 心跳 多职责混合 |

其中 `routes/media.ts` 是本次 ADR 的可执行靶点：路由层是输入边界，最适合按业务子域聚合拆分；其余两个超长服务文件涉及更深的行为变更，留待后续 ADR（避免本次上下文超载）。

### 3. 死代码 re-export

`server/lib/minimax.ts` 是 1 行 `export * from './minimax/index.js'`，与 `server/lib/minimax/` 目录共存。这种「文件 + 同名目录」的双入口在 Node ESM 解析时容易混淆，且没有任何调用方必须经此文件中转。属于纯粹的死代码遗留。

---

## 决策

**采纳**：本轮按 **3 个 Phase** 推进，每个 Phase 独立可验证、独立提交；不一次性铺开全部架构债务。

### Phase A：修复 workflow engine 循环依赖（P0）

**改动**：`action-executor.ts` 与 `queue-executor.ts` 不再 `import { getLogService / getTaskService } from '../../../service-registration.js'`，改由 `NodeExecutionContext` 字段注入。

**验证**：`npx madge --circular server/index.ts` 报告的真循环条目数从 2 降到 0（migrations 与 service-registration 容器自环保留）。

### Phase B：拆分 `server/routes/media.ts`（P1）

**改动**：按业务子域聚合拆为：

```
server/routes/media/
├── index.ts           # 聚合 router，挂载所有子 router（保持 /api/media 路径）
├── crud.ts            # GET /, GET /:id, POST /, PUT /:id, DELETE /:id
├── operations.ts      # PATCH favorite / pin / public, POST batch/public, DELETE batch
├── upload.ts          # POST /upload, POST /upload-from-url
├── recovery.ts        # GET /recoverable, POST /recover/:logId
└── download.ts        # GET /:id/token, GET /:id/download, POST /batch/download
```

**验证**：API 路径零变化；`server/routes/__tests__/` 现有测试无回归；行数从 649 降到 ~150/子模块。

### Phase C：清理 `server/lib/minimax.ts` 死代码（P2）

**改动**：删除该 1 行 re-export 文件，全仓搜索 `from '../lib/minimax.js'` / `from '../../lib/minimax.js'` 等指向单文件的引用，统一改为指向 `minimax/index.js`（或直接子模块）。

**验证**：`tsc -b` 通过；grep 无残留引用。

### 不在本 ADR 范围内（明确不做）

| 议题 | 不做理由 |
|------|----------|
| services/ 全面分层为 application/domain/infrastructure | 涉及 30+ 文件 import path 重写、破坏全部测试 fixtures、上下文成本过高；当前 `domain/` 子目录已提供部分分层，留待后续 ADR 视业务变化渐进迁移 |
| 拆分 cron-scheduler / websocket-service | 行为变更面大、需独立设计 misfire / channel 模块；本次只解决路由层与循环依赖 |
| utils/ vs lib/ 边界整理 | 边界模糊但未造成具体问题，且 ADR-0009 已就 env-utils 归属做了局部决策；保留现状 |
| 前端 stores 双重位置（src/lib/stores + src/stores） | 当前是有意设计（lib 放框架层 create-async-store，stores 放业务 store），不算债务 |
| madge 报告的 migrations 注册循环 | 属于 migration 注册表模式，不是 bug，本 ADR 显式文档化为「可接受」 |

### 考虑过的替代方案

| 方案 | 评价 | 结论 |
|------|------|------|
| ❌ 删除 Service Locator（getLogService 等）彻底消灭循环 | ADR-0006 已论证：100+ 调用点改动，收益低于风险；服务定位器本身不是循环根因 | 否决 |
| ❌ Phase A 用动态 `await import()` 在 executor 内部懒加载 service | 用 ES 动态 import 掩盖静态循环，每次执行都付模块解析成本，且 madge 仍可能标记 | 否决 |
| ❌ Phase B 拆分到 `server/routes/media/crud/get-list.ts` 这种端点级颗粒 | 文件数爆炸（17 文件），路由层粒度应按业务聚合而非 HTTP 方法 | 否决 |
| ❌ Phase C 保留 minimax.ts 作为「未来兼容入口」 | 没有调用方需要它，未来也不需要；YAGNI | 否决 |
| ✅ 本 ADR 三 Phase 方案 | 改动聚焦、可验证、可回滚 | **采纳** |

---

## 后果

### 正面影响

1. **AGENTS.md §9 第 3 条「循环依赖禁止」铁律得到执行**：madge 报告的「真循环」归零
2. **`routes/media.ts` 拆分后**：每个子模块聚焦单一业务（CRUD / 操作 / 上传 / 恢复 / 下载），定位 bug 与新增端点都更直接
3. **死代码清理**：消除 `lib/minimax.ts` vs `lib/minimax/` 的双入口解析歧义
4. **建立「executor 不调用 service-registration」约束**：为未来新增 executor 提供清晰边界（依赖必须经 context 注入）

### 负面影响

1. **Phase A 修改 `NodeExecutionContext` 接口**：所有调用方（engine、tests）需同步更新签名；但该接口已在 workflow 模块内部，影响面可控
2. **Phase B 拆分后**：`routes/__tests__/` 中按文件 import 的测试若直接 import `routes/media.ts`，需改 import 路径为 `routes/media/index.ts`；本 ADR 实施时同步处理
3. **Phase C 后**：少数 import 写成 `'@/lib/minimax'` 的代码（依赖 Node ESM 路径解析）需明确指向 `'@/lib/minimax/index.js'`

### 风险

1. **Phase A 引入 context 字段后 executor 单测 mock 需补充**：缓解 — executors 现有测试本就 mock context，新增字段只需补字段
2. **Phase B 端点顺序敏感**（如 `GET /:id` 必须在 `POST /batch/public` 之后才不匹配 batch）：
   - 缓解 — 拆分后由 index.ts 控制子 router 挂载顺序，且 express 路径匹配按声明顺序，子 router 内部仍按原顺序
3. **Phase C 万一某调用方依赖 minimax.ts 的具体形状**：
   - 缓解 — 实施时先全仓 grep 确认所有引用，再做删除

---

## 元数据

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-23 |
| 状态 | 已接受 |
| 决策者 | Sisyphus（自主推进） |
| 审阅者 | 待 code-review-expert 评审 |
| 相关 ADR | ADR-0006（DI 类型化，service locator 保留决策）、ADR-0007（死代码清理先例）、ADR-0011（routes 目录结构反向决策） |
| 实施 plan | @docs/plans/2026-07-23-architecture-health-cohort.md |
| 后续 ADR | services 全面分层（application/domain/infrastructure）；cron-scheduler / websocket-service 拆分 |
