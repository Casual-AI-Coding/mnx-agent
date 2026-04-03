# Documentation Structure

本文档说明 `docs/superpowers/` 目录的组织结构。

## 目录结构

```
docs/superpowers/
├── specs/           # 规格文档（定义"是什么"）
├── plans/          # 实现计划（定义"怎么做"）
└── archive/         # 已归档 plans
    └── v{MAJOR}.{MINOR}/
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
- plans 完成后归档到 `archive/v{MAJOR}.{MINOR}/`

## 版本历史

| 版本 | 日期 | 主要特性 |
|------|------|----------|
| v1.3.0 | 2026-04-03 | Workflow System Refactoring |
| v1.2.0 | 2026-04-02 | Theme System |
| v1.1.0 | 2026-04-01 | Authentication |
| v1.0.0 | 2026-03-31 | Initial Release |

## 文档维护

### 创建新文档

1. **规格文档**: `specs/YYYY-MM-DD-主题-design.md`
2. **实现计划**: `plans/YYYY-MM-DD-主题.md`
3. **子计划**: `plans/YYYY-MM-DD-NN-主题.md`（NN 从 01 开始）

### 版本发布后

1. 创建 `archive/v{VERSION}/` 目录
2. 移动已完成 plans 到归档目录
3. specs 保留在原目录，永不归档