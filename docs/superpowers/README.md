# Documentation Structure

本文档说明 `docs/superpowers/` 目录的组织结构。

## 目录结构

```
docs/superpowers/
├── specs/                      # 规格文档（定义"是什么"）
│   ├── workflow-core-concepts.md
│   ├── 2026-04-03-workflow-service-registration-spec.md
│   ├── 2026-04-03-workflow-verification-spec.md
│   └── 2026-04-03-workflow-examples-spec.md
│
├── plans/                      # 实现计划（定义"怎么做"）
│   ├── workflow-system-redesign.md         # 总计划
│   ├── 2026-04-03-workflow-refactoring-fixes.md
│   ├── 01-database-redesign.md             # SP-1 子计划
│   ├── 02-service-node-registry.md         # SP-2 子计划
│   ├── 03-permission-management.md         # SP-3 子计划
│   ├── 04-workflow-engine-refactor.md      # SP-4 子计划
│   ├── 05-frontend-refactor.md             # SP-5 子计划
│   └── 06-cron-scheduler-adaptation.md     # SP-6 子计划
│
└── archive/                    # 已完成版本归档（仅 plans）
    ├── v1.0/                   # v1.0.0 - v1.0.2 (2026-03-31 ~ 2026-04-01)
    │   ├── 2026-03-31-minimax-comprehensive-fix.md
    │   ├── 2026-04-01-code-review-fixes.md
    │   └── 2026-04-01-feature-enhancements.md
    │
    ├── v1.1/                   # v1.1.0 - v1.1.5 (2026-04-01 ~ 2026-04-02)
    │   └── 2026-04-01-authentication-system-design.md (spec, kept in root)
    │
    └── v1.2/                   # v1.2.0 (2026-04-02)
        └── 2026-04-02-theme-system-design.md (spec, kept in root)
```

## 文档分类

### specs/ - 规格文档

**用途**: 定义系统的设计规格、核心概念、接口规范

**命名规范**: `YYYY-MM-DD-主题-spec.md` 或 `主题.md`

**内容特点**:
- 描述"是什么"（What）
- 包含概念定义、数据模型、接口规格
- 相对稳定，不频繁修改
- 适用于新成员理解系统设计

**示例**:
- `workflow-core-concepts.md` - 工作流核心概念定义
- `2026-04-03-workflow-service-registration-spec.md` - 服务注册规格

### plans/ - 实现计划

**用途**: 定义具体实现步骤、任务分解、执行方案

**命名规范**:
- 总计划: `主题.md` 或 `YYYY-MM-DD-主题.md`
- 子计划: `序号-子主题.md`

**内容特点**:
- 描述"怎么做"（How）
- 包含任务清单、步骤分解、优先级排序
- 会随实施进展更新
- 完成后归档到对应版本目录

**示例**:
- `workflow-system-redesign.md` - 工作流重构总计划
- `01-database-redesign.md` - 数据库重构子计划（SP-1）

### archive/ - 版本归档（仅 plans）

**用途**: 存储已完成版本的实现计划文档

**命名规范**: `v{MAJOR}.{MINOR}/`

**归档时机**:
- 版本发布后（如 v1.3.0 发布）
- Plans 全部完成并验证通过
- 不再需要频繁修改的计划文档

**注意**: Specs 不归档，始终保留在 `specs/` 目录

## 版本历史

| 版本 | 日期 | 主要特性 | Plans 归档 | Specs 归档 |
|------|------|----------|------------|------------|
| v1.3.0 | 2026-04-03 | Workflow System Refactoring | plans/ | specs/ |
| v1.2.0 | 2026-04-02 | Theme System | archive/v1.2/ | specs/ (不归档) |
| v1.1.0-v1.1.5 | 2026-04-01~02 | Authentication & RBAC | archive/v1.1/ | specs/ (不归档) |
| v1.0.0-v1.0.2 | 2026-03-31~04-01 | Initial Release | archive/v1.0/ | specs/ (不归档) |

## 当前版本 (v1.3.0)

**主题**: Workflow System Refactoring

**核心变更**:
- 统一 Action 节点架构（替代 9 种独立节点类型）
- Service Node Registry 单例服务发现
- 61 个服务方法注册（从 16 个扩展）
- 完整的权限管理系统

**规格文档**:
- `workflow-core-concepts.md` - 核心概念
- `workflow-service-registration-spec.md` - 服务注册规格
- `workflow-verification-spec.md` - 验证方案
- `workflow-examples-spec.md` - 配置示例

**实现计划**:
- `workflow-system-redesign.md` - 总计划
- `01~06-*.md` - 6 个子计划（SP-1 到 SP-6）
- `2026-04-03-workflow-refactoring-fixes.md` - 重构修复计划

## 文档维护

### 创建新文档

1. **规格文档**: 放在 `specs/`，命名 `YYYY-MM-DD-主题-spec.md`
2. **实现计划**: 放在 `plans/`，命名 `YYYY-MM-DD-主题.md`
3. **子计划**: 放在 `plans/`，命名 `序号-子主题.md`

### 版本发布后

1. 创建 `archive/v{新版本}/` 目录
2. 移动已完成计划和规格到归档目录
3. 保留当前正在进行的文档在主目录

### 清理规则

- 空目录及时删除
- 重复内容合并或删除
- 临时文件（如验证报告）可删除或移动到项目根目录
- Specs 不归档，始终保留在 `specs/` 目录