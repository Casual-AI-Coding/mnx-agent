# Documentation Structure

本文档说明 `docs/` 目录的组织结构。

## 目录结构

```
docs/
├── specs/           # 规格文档（定义"是什么"）
├── plans/           # 实现计划（定义"怎么做"）
├── archive/         # 已归档 plans
│   └── v{MAJOR}.{MINOR}/
├── incidents/       # 事故报告
└── roadmap/         # 版本规划
```

## 文档分类

### specs/ - 规格文档

**用途**: 定义系统的设计规格、核心概念、接口规范

**命名规范**:
- `YYYY-MM-DD-主题-design.md`（带日期的完整规格）
- `主题.md`（核心概念，无需日期）

**内容特点**:
- 描述"是什么"（What）
- 包含概念定义、数据模型、接口规格
- 相对稳定，不频繁修改
- **永不归档**，始终保留

### plans/ - 实现计划

**用途**: 定义具体实现步骤、任务分解、执行方案

**命名规范**: `YYYY-MM-DD-主题.md`

**子计划序号**: `YYYY-MM-DD-NN-主题.md`（NN 为序号，如 01、02）

**内容特点**:
- 描述"怎么做"（How）
- 包含任务清单、步骤分解、优先级排序
- 会随实施进展更新

### archive/ - 版本归档

**用途**: 存储已完成版本的 plans

**归档时机**: 版本发布后，plans 全部完成并验证通过

**重要规则**: 
- specs 永不归档，始终保留在 `specs/` 目录
- plans 完成后归档到 `archive/v{MAJOR}.{MINOR}/`（如 v1.3, v1.4, v1.7）
- 子版本 plans 归档到对应主版本目录（如 v1.3.1 → v1.3/）

### incidents/ - 事故报告

**用途**: 记录重大问题、根因分析、修复措施

**命名规范**: `YYYY-MM-DD-主题-incident.md`

**内容特点**:
- 问题描述与影响范围
- 根因分析
- 修复措施与预防方案

### roadmap/ - 版本规划

**用途**: 版本迭代计划，需求收集与优先级排序

**目录结构**:
```
roadmap/
├── requirement-pools.md   # 需求池（统一收集所有需求）
├── v2-roadmap.md          # v2.x 版本规划
├── v3-roadmap.md          # v3.x 版本规划
└── v4-roadmap.md          # v4.x 版本规划
```

#### requirement-pools.md - 需求池

**用途**: 统一收集所有需求，按日期分组记录

**结构规范**:
```markdown
## YYYY-MM-DD

**汇总**: N 个需求 | 已完成: X | 待办: Y

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| R-XXX | 需求名称 | 分类 | P0-P4 | vX.X | 待办/已完成 |

### R-XXX - 需求名称
- **描述**: 需求详细说明
- **现状**: 当前实现状态
- **范围**: 涉及的文件路径/模块
```

**字段定义**:
| 字段 | 说明 |
|------|------|
| ID | 需求唯一标识，格式 `R-XXX`（数字递增） |
| 分类 | Admin/UX/Monitoring/Data/Security/DevTools 等 |
| 优先级 | P0(必须)-P4(低优先级) |
| 版本 | 分配到的版本号，`-` 表示待定 |
| 状态 | 待办/已完成/待收集 |

**来源字段**（在 roadmap table 中使用）:
| 来源 | 说明 |
|------|------|
| 需求池 | 需求已在 requirement-pools.md 记录 |
| 临时添加 | 开发时发现需要，不在需求池，实施时补记 |
| 待收集 | 需求未确定，待后续收集 |

**待收集需求区域**:
```markdown
## 待收集需求

> 尚未确定的需求占位符

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| TBD-vX.X | 需求名称 | TBD | TBD | vX.X+ | 待收集 |
```

#### vX-roadmap.md - 版本规划文档

**命名规范**: `v{VERSION}-roadmap.md`（如 v2-roadmap.md, v3-roadmap.md）

**结构规范**:
```markdown
# mnx-agent vX.x Roadmap

> 版本规划文档 - vX.x 系列主题

## 大版本说明

vX.x 系列主题说明。需求详情见 `@requirement-pools.md`

---

## Roadmap Table

| 版本 | 需求ID | 需求名称 | 来源 | 状态 |
|------|--------|----------|------|------|
| vX.X | R-XXX | 需求名称 | 需求池 | 待办 |

---

## 版本依赖

版本依赖关系图（ASCII 流程图）

---

## 当前状态

- **当前版本**: vX.Y+
- **下一版本**: vX.Z

---

## 变更记录

| 日期 | 变更 |
|------|------|
| YYYY-MM-DD | 变更说明 |
```

**内容特点**:
- 简化格式：仅 roadmap table + 需求池链接
- 需求详情统一在 requirement-pools.md 维护
- 版本依赖可视化（ASCII 流程图）
- 变更记录追踪文档修改历史

## 版本历史

| 版本 | 日期 | 主要特性 |
|------|------|----------|
| v1.7.0 | 2026-04-09 | Architecture Upgrade Phase 4-7, Media Enhancements |
| v1.6.0 | 2026-04-06 | Architecture Upgrade v2 (DDD) |
| v1.5.0 | 2026-04-05 | Architecture Refactoring, Settings, Delay Node, Cron Optimization |
| v1.4.0 | 2026-04-05 | Architecture Upgrade, Workflow Cron Scheduling |
| v1.3.0 | 2026-04-03 | Workflow System Refactoring |
| v1.2.0 | 2026-04-02 | Theme System |
| v1.1.0 | 2026-04-01 | Authentication |
| v1.0.0 | 2026-03-31 | Initial Release |

## 文档维护

### 创建新文档

1. **规格文档**: `specs/YYYY-MM-DD-主题-design.md`
2. **实现计划**: `plans/YYYY-MM-DD-主题.md`
3. **子计划**: `plans/YYYY-MM-DD-NN-主题.md`（NN 从 01 开始）
4. **事故报告**: `incidents/YYYY-MM-DD-主题-incident.md`
5. **版本规划**: `roadmap/v{VERSION}-roadmap.md`
6. **新需求**: 在 `roadmap/requirement-pools.md` 添加需求卡片

### 新需求录入流程

1. **确定需求 ID**: 查看现有最大 R-XXX，递增分配新 ID
2. **录入需求池**: 在 `requirement-pools.md` 当日日期区域添加：
   - 汇总表格一行
   - 需求卡片详情（描述、现状、范围）
3. **分配版本**: 在对应 `vX-roadmap.md` 的 Roadmap Table 添加一行
4. **更新变更记录**: 在两个文件末尾变更记录添加录入说明

### 版本发布后

1. 创建 `archive/v{VERSION}/` 目录
2. 移动已完成 plans 到归档目录
3. specs 保留在原目录，永不归档
4. 更新 `requirement-pools.md` 中已完成需求的状态

### 引用路径格式

在文档中引用其他文档时使用：
```
@docs/specs/workflow-core-concepts.md
@docs/plans/2026-04-03-workflow-system-redesign.md
@docs/incidents/2026-04-14-media-deletion-incident.md
@docs/roadmap/requirement-pools.md
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-15 | 补充 roadmap 目录详细规范：requirement-pools.md 结构、字段定义、来源字段；vX-roadmap.md 结构规范 |
| 2026-04-15 | 新增「新需求录入流程」说明 |
| 2026-04-15 | 引用路径添加 requirement-pools.md 示例 |