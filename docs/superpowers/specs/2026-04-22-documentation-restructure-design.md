# 文档与规范体系重构设计

> Version: 1.0.0
> Date: 2026-04-22
> Status: Draft
> Author: mnx-agent

## 1. 背景与目标

### 1.1 问题

当前根目录 `AGENTS.md`（535 行）严重膨胀，混合了两类内容：
- **约束类**（规范）：AI 必须遵守的规则
- **参考类**（知识）：项目信息、用法说明、操作手册

这导致：
- AI 难以快速区分"必须做什么"和"仅供参考"
- 与 `README.md` 大面积重复（技术栈、数据库表、API 端点）
- 与 `docs/AGENTS.md` 交叉重复（目录结构、命名规范）
- 真正的规范缺口：测试、安全、状态管理、组件设计均无约束

### 1.2 目标

| 目标 | 描述 |
|------|------|
| AGENTS.md 瘦身 | 从 535 行压缩到 ~150 行，只保留约束和原则 |
| 规范与参考分离 | 约束 → AGENTS.md，参考 → `docs/` |
| 消除重复 | 与 README.md 和 docs/AGENTS.md 的重复全部清除 |
| 补全缺失规范 | 新增 `docs/standards/` 覆盖测试、安全等 |
| 决策可追溯 | 新增 `docs/decisions/` 记录架构决策 |

### 1.3 原则

1. **单一职责**：AGENTS.md 只回答"必须做什么/禁止做什么"，不回答"是什么/怎么用"
2. **可维护性**：消除与 README.md 的重复，消除根目录与 docs/ 的交叉重复
3. **可发现性**：任何具体信息都能在 `docs/` 的明确位置找到
4. **可追溯性**：架构决策记录在 ADR 中

---

## 2. 新的文档结构

### 2.1 目标目录结构

```
docs/
├── AGENTS.md                      # docs/ 自身组织规范（精简版）
├── standards/                      # 【新增】工程规范
│   ├── coding-standards.md
│   ├── api-design-standards.md
│   ├── database-standards.md
│   ├── testing-standards.md
│   └── security-standards.md
├── decisions/                      # 【新增】架构决策记录
│   ├── 0001-why-postgresql.md
│   ├── 0002-why-zustand.md
│   └── _template.md
├── specs/                          # 保持不变
│   ├── workflow-core-concepts.md
│   └── ... (现有 18 个 spec)
├── guides/                         # 操作手册
│   ├── environment-guide.md        # 【已有，保留】
│   ├── release-guide.md           # 【新建】从 AGENTS.md 提取
│   ├── troubleshooting.md         # 【新建】从 AGENTS.md 提取
│   └── testing-guide.md           # 【已有，保留】
├── plans/                          # 保持不变
├── archive/                        # 保持不变（但清理版本跳跃）
├── incidents/                      # 保持不变
└── roadmap/                        # 保持不变
```

### 2.2 与现有结构的对比

| 目录 | 当前 | 目标 | 变化 |
|------|------|------|------|
| `docs/standards/` | 不存在 | 新增 | 新建 5 个规范文件 |
| `docs/decisions/` | 不存在 | 新增 | 新建 ADR 目录 |
| `docs/guides/` | 2 个文件 | 4 个文件 | 新增 release-guide, troubleshooting |
| `docs/AGENTS.md` | 251 行 | ~80 行 | 删除与根目录重复的内容 |
| 根目录 `AGENTS.md` | 535 行 | ~150 行 | 重写，删除参考信息 |

---

## 3. 根目录 AGENTS.md 新结构

### 3.1 章节规划

| 章节 | 行数（估算） | 内容 |
|------|-------------|------|
| 项目定位 | 5 | 一句话说明 |
| 架构分层规则 | 20 | 4 层 + 依赖方向约束 |
| 命名规范 | 15 | 文件/类型/变量/常量/路由 |
| 编码约束 | 40 | TypeScript/时间处理/错误处理/状态管理/React |
| 数据库规范 | 15 | 表结构/时间/软删除/migration |
| API 设计规范 | 10 | 响应格式/分页/路由命名 |
| 测试规范 | 10 | 覆盖率/命名/mock 策略 |
| 安全规范 | 15 | 认证/输入验证/敏感信息 |
| 禁止清单 | 20 | 6 条硬性禁止 |
| 文档索引 | 15 | 表格指向 docs/ 详细内容 |
| **总计** | **~165** | |

### 3.2 约束性内容（保留）

以下内容是真正的规范约束，保留在 AGENTS.md：

1. **架构分层**：Route → Domain Service → Repository 的依赖方向
2. **命名规则**：PascalCase/camelCase/SCREAMING_SNAKE_CASE/kebab-case
3. **时间处理**：`toLocalISODateString()` 存入 DB，`toISOString()` 用于外部
4. **错误处理**：`asyncHandler` 包装，响应 envelope 统一
5. **安全**：JWT required（除 /api/auth），Zod validation，参数化查询
6. **禁止清单**：无 any / @ts-ignore，repository 禁止业务逻辑，循环依赖禁止

### 3.3 参考性内容（迁移/删除）

| 内容 | 行动 |
|------|------|
| 完整 API 端点列表 | **删除**（代码/READE ME 中有） |
| 数据库详细表结构（CREATE TABLE） | **删除**（schema-pg.ts 中有） |
| 项目架构 ASCII 图 | **删除**（过于详细） |
| 核心模块详细说明 | **删除**（specs 中有） |
| nginx 配置 / CLI 命令 | **迁移** → `docs/guides/environment-guide.md` |
| 发布步骤（git 命令） | **迁移** → `docs/guides/release-guide.md` |
| 常见问题 FAQ | **迁移** → `docs/guides/troubleshooting.md` |
| 版本历史（v1.0→v1.7） | **删除**（CHANGELOG 或 roadmap 中有） |
| 编码示例（CVA、Zustand 完整代码） | **迁移** → `docs/standards/coding-standards.md` |
| 认证系统详细说明（JWT/Data isolation） | **迁移** → `docs/standards/security-standards.md` |

---

## 4. 新增文件清单

### 4.1 `docs/standards/coding-standards.md`

**目的**：TypeScript/React/状态管理的详细编码规范

**内容**：
```
1. TypeScript 严格模式规则
   - strict: true
   - 禁止 any / @ts-ignore / @ts-expect-error
   - 接口命名：PascalCase
   - 类型命名：PascalCase
   - 函数命名：camelCase
   - 常量命名：SCREAMING_SNAKE_CASE
   - 路径别名：@/* → ./src/*

2. 文件组织
   - 单文件行数上限：300 行
   - 超过 300 行的组件必须拆分
   - 导入顺序：external → internal → relative

3. React 组件规范
   - 组件拆分触发条件（行数/复杂度/复用性）
   - props 接口定义
   - hooks 复用原则

4. Zustand 状态管理
   - store 拆分：按领域，不混合 UI 状态
   - store 间禁止直接调用
   - persist 策略

5. 错误处理模式
   - asyncHandler 包装
   - domain error 分类
   - 错误传播规则

6. 代码评审 checklist
```

### 4.2 `docs/standards/api-design-standards.md`

**目的**：REST API 设计规范

**内容**：
```
1. REST 设计原则
   - 资源命名：复数名词，kebab-case
   - HTTP 方法对应：GET/POST/PUT/PATCH/DELETE

2. 路由命名约定
   - kebab-case
   - 示例：/api/cron-jobs, /api/media-records

3. 请求/响应规范
   - 响应 envelope：{success, data} 或 {success, false, error}
   - 错误响应结构
   - 常用错误码映射（MiniMax API 错误 → HTTP 状态码）

4. 分页规范
   - 参数：page (1-based), limit (max 100)
   - 响应包含：total, page, limit, data[]

5. 版本控制
   - 破坏性变更 → major 版本号递增
   - 非破坏性变更 → minor 版本号递增
```

### 4.3 `docs/standards/database-standards.md`

**目的**：数据库设计规范

**内容**：
```
1. 表结构设计原则
   - 必含字段：id, created_at, updated_at, owner_id
   - id 类型：VARCHAR(36) UUID
   - 时间字段：TIMESTAMP WITHOUT TIME ZONE

2. 字段命名约定
   - created_at, updated_at, deleted_at
   - is_deleted (软删除标志)

3. 索引策略
   - 外键字段建立索引
   - 频繁查询字段建立索引
   - 命名：idx_{table}_{column}

4. Migration 规范
   - 文件命名：NNN_{description}.ts
   - 编号：连续递增（当前最大 029）
   - 每条 migration 独立可执行

5. 时间处理规则
   - 存入 DB：toLocalISODateString()
   - 场景分类表

6. 软删除规范
   - 字段：is_deleted BOOLEAN + deleted_at TIMESTAMP
   - 查询自动过滤：WHERE is_deleted = false
```

### 4.4 `docs/standards/testing-standards.md`

**目的**：测试规范

**内容**：
```
1. 测试金字塔
   - 单元测试：Repository / Domain Service
   - 集成测试：Route + Service + Repository
   - E2E：完整流程

2. 覆盖率目标
   - 整体 > 70%
   - 关键路径（认证/支付）> 90%

3. 测试文件命名
   - 后端：*.test.ts
   - 前端：*.test.{ts,tsx}

4. Mock 策略
   - 外部 API：mock MiniMaxClient
   - 数据库：mock repository interface
   - God class：必须 mock

5. 测试数据管理
   - 每个 test 独立数据
   - teardown 清理
```

### 4.5 `docs/standards/security-standards.md`

**目的**：安全规范

**内容**：
```
1. 认证与授权
   - 所有 /api/* 需要 JWT（/api/auth 除外）
   - 角色权限表（user/pro/admin/super）
   - 数据隔离：owner_id 过滤

2. 输入验证
   - Zod schema 为第一道防线
   - 参数化查询防 SQL 注入

3. 敏感信息处理
   - 禁止在 log 中输出 token/password
   - API Key 存储：环境变量
   - 密码存储：bcrypt

4. 审计日志
   - POST/PUT/PATCH/DELETE 自动记录
   - user_id 从 JWT 提取
```

### 4.6 `docs/guides/release-guide.md`

**目的**：从 AGENTS.md 提取的发布流程

**内容**：
```
1. 版本号规范
   - MAJOR.MINOR.PATCH
   - MAJOR：不兼容变更
   - MINOR：向后兼容新增
   - PATCH：向后兼容修复

2. 发布步骤
   - 更新 CHANGELOG.md
   - npm version bump
   - git commit + tag
   - git push + push --tags

3. 发布 checklist
   - [ ] CHANGELOG 更新完整
   - [ ] npm run build 通过
   - [ ] vitest run 通过
   - [ ] TypeScript 无错误
   - [ ] tag 确认存在
```

### 4.7 `docs/guides/troubleshooting.md`

**目的**：从 AGENTS.md 提取的常见问题

**内容**：
```
1. 数据库问题
   - media_records 表不存在 → 重启服务器触发 migration

2. API 问题
   - "请求次数过多" → 外部限流，等待 15 分钟

3. CORS 问题
   - 图片上传失败 → 使用 /api/media/upload-from-url

4. 测试问题
   - mock 不正确 → 检查 vi.mock 设置
```

### 4.8 `docs/decisions/_template.md`

ADR 模板

```
# ADR-XXX: 标题

## 状态
Accepted | Deprecated | Superseded by ADR-YYY

## 背景
描述问题和动机

## 决策
描述最终方案

## 后果
- 正面：...
- 负面：...
```

---

## 5. docs/AGENTS.md 修改

### 5.1 当前问题

与根目录 AGENTS.md 重复的内容：
- 目录结构说明（两处都有）
- 命名规范（两处都有）
- 引用路径格式（两处都有）
- 版本历史（两处都有）

### 5.2 修改方案

**删除**：
- "版本历史" 表格（保留在 roadmap 或 CHANGELOG）

**精简**：
- 目录结构说明：只保留结构图，引用根目录 AGENTS.md 中的命名规范
- 引用路径格式：保留，但删除示例中的重复说明

**保留**（docs/AGENTS.md 特有的内容）：
- 文档分类定义的详细说明（specs/plans/archive 等的用途）
- 新需求录入流程
- 版本发布后的归档流程

---

## 6. 实施步骤

### Phase 1: 新增文件（基础规范）

1. 创建 `docs/standards/` 目录
2. 创建 `docs/standards/coding-standards.md`
3. 创建 `docs/standards/api-design-standards.md`
4. 创建 `docs/standards/database-standards.md`
5. 创建 `docs/standards/testing-standards.md`
6. 创建 `docs/standards/security-standards.md`

### Phase 2: 新增文件（操作指南）

7. 创建 `docs/guides/release-guide.md`
8. 创建 `docs/guides/troubleshooting.md`
9. 创建 `docs/decisions/_template.md`
10. 创建 `docs/decisions/0001-why-postgresql.md`

### Phase 3: 重写 AGENTS.md

11. 重写根目录 `AGENTS.md`（新结构，~150 行）
12. 精简 `docs/AGENTS.md`（删除重复内容）

### Phase 4: 验证

13. 验证所有 docs/ 内部链接有效
14. 验证根目录 AGENTS.md 中的索引表格指向正确的文件
15. 运行 `npm run build` 确认无破坏

---

## 7. 验收标准

| 标准 | 检查方式 |
|------|----------|
| 根目录 AGENTS.md ≤ 200 行 | `wc -l AGENTS.md` |
| docs/standards/ 下 5 个文件存在 | `ls docs/standards/` |
| docs/decisions/ 下有 ADR | `ls docs/decisions/` |
| docs/guides/ 新增 2 个文件 | `ls docs/guides/` |
| docs/AGENTS.md 无与根目录重复的版本历史 | grep "v1.0\|v1.1\|v1.2" docs/AGENTS.md |
| 根目录 AGENTS.md 中无 CREATE TABLE SQL | grep "CREATE TABLE" AGENTS.md |
| 根目录 AGENTS.md 中无完整 API 端点列表 | grep "GET.*media" AGENTS.md（应无表格） |

---

## 8. 附录：现有 docs/archive/ 版本跳跃问题

**问题**：
- `archive/v1.10/` 在 `v1.9/` 和 `v2.0/` 之间
- semver 上 v1.10 > v1.9 但 < v2.0，这不符合语义化版本（v1.10 应该是 v1.x 的最后一个版本）

**处理**：
- 本次重构不处理 archive/ 目录（保持现状，避免引入不必要的变更）
- 未来版本发布时注意归档到正确目录

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |