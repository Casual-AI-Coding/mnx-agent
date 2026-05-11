# Release Note 规范

> Version: 1.0.0
> Date: 2026-05-11
> Status: Active

## 1. 概述

Release Note（发行说明）是面向用户的版本变更摘要，发布在 GitHub Releases 页面。它与 CHANGELOG.md 互补：
- **CHANGELOG.md** — 开发者视角，面向贡献者的完整变更记录
- **Release Note** — 用户视角，面向使用者的精简摘要 + 亮眼功能展示

一个版本发布后，必须同时更新 CHANGELOG.md **并**创建 GitHub Release Note。

---

## 2. 语言与风格

### 2.1 语言

- **必须**使用简体中文
- 技术术语可保留英文（如 JWT、HMAC-SHA256、DAG），但需有中文说明
- 专有名词直接保留（如 MiniMax API、PostgreSQL、React）

### 2.2 风格

- 使用简洁、直接的语言，面向终端用户而非开发者
- 每个条目一行，简短有力
- 避免冗余前缀（如"新增了" → 直接写功能描述）
- 功能条目开头用动词（支持/优化/修复/新增）

---

## 3. 分类体系（Emoji 分区）

Release Note 按以下分类组织，每个分类使用固定的 emoji 标识：

| Emoji | 分类 | 说明 | 对应 CHANGELOG |
|-------|------|------|---------------|
| ✨ | 新增功能 | 用户可见的新功能、新能力 | `### Added` |
| 🐛 | 问题修复 | Bug 修复、异常行为修正 | `### Fixed` |
| 🔒 | 安全加固 | 安全漏洞修复、安全机制增强 | `### Security` |
| ⚡ | 性能优化 | 响应速度、资源消耗、加载时间优化 | `### Performance` |
| 🔄 | 功能变更 | 现有功能的改进、调整、行为变化 | `### Changed` |
| 🗑️ | 废弃功能 | 将在未来版本移除的功能 | `### Deprecated` |
| ❌ | 移除功能 | 已在本版本移除的功能 | `### Removed` |
| 🏗️ | 代码重构 | 内部架构调整，用户不可见 | — |
| 📝 | 文档更新 | 文档、注释、规范更新 | `### Docs` |
| 🧪 | 测试完善 | 测试覆盖、测试用例补充 | `### Tests` |
| 🔧 | 构建/工具 | 构建系统、CI/CD、开发工具变更 | `### Chore` |
| ⚠️ | 破坏性变更 | 不向后兼容的变更，需用户注意 | `### BREAKING` |

**分类选择原则**：
- 每个版本只列出**有实质内容**的分类，无内容的分类不出现在 Release Note 中
- **✨ 新增功能**和**🐛 问题修复**应排在最前，是用户最关心的
- **⚠️ 破坏性变更**如有，必须放在最显眼位置（紧随标题）

---

## 4. 模板结构

```markdown
## 🏷️ 版本摘要

一段 1-2 句话概括本版本的核心变化。

## ⚠️ 破坏性变更

> 如果有的话，必须优先展示，用引用块强调

- **变更描述** — 影响范围与迁移指南

## ✨ 新增功能

- **功能名称** — 功能描述（涉及页面/模块）
- **功能名称** — 功能描述（涉及页面/模块）

## 🐛 问题修复

- **问题描述** — 修复了什么（涉及文件/模块）
- **问题描述** — 修复了什么（涉及文件/模块）

## 🔒 安全加固

- **加固措施** — 具体描述

## ⚡ 性能优化

- **优化项** — 具体描述

## 🔄 功能变更

- **变更描述** — 具体描述

## 🏗️ 代码重构

- **重构内容** — 具体描述（仅当影响较大时列出）

## 📝 文档更新

- **文档更新** — 具体描述

---

**完整变更日志**: [CHANGELOG.md](./CHANGELOG.md)
```

---

## 5. 完整示例

以下是一个真实的 Release Note 示例：

````markdown
## 🏷️ 版本摘要

v2.2.8 是一次安全加固与稳定性提升的补丁版本。修复了 external-proxy 未授权访问、媒体 token 伪造等 P0/P1 安全漏洞，同时完成了前端大组件拆分、数据库 N+1 查询优化和前序版本遗留的类型修复。

## ✨ 新增功能

- **OpenAI Image-2 尺寸扩展** — 补充 3520×2336、3312×2480、3840×1648 三种尺寸，新增「其他比例」分组
- **代理白名单扩展** — 开放 `lumin-ai.tiandi.run` 和 `api.sisyphusx.com` 代理访问
- **工作流模板数据追踪** — `src/data/workflow-templates/` 模板文件纳入版本管理
- **Pre-commit 钩子** — 新增分支保护和类型检查等预提交检查

## 🐛 问题修复

- **asyncHandler 括号错误** — 修复路由中 asyncHandler 调用括号导致的错误处理失效
- **.env.local 覆盖失效** — 修复 `.env.local` 无法覆盖 `.env` 的问题，本地密钥现在正确加载
- **Media 批量软删除 SQL 参数不匹配** — 修复参数绑定导致的删除失败
- **ArtistWorkspace / misfire-handler 测试失败** — 修复测试用例
- **Dialog 内容溢出** — 弹窗添加高度限制和内容滚动

## 🔒 安全加固

- **external-proxy JWT 认证** — 外部代理路由添加 JWT Bearer token 认证，防止未授权访问
- **媒体 token 升级为 HMAC-SHA256** — 未签名 token 升级为完整 HMAC 签名，防止 token 伪造
- **owner 隔离增强** — 路由层 owner_id 过滤强化，防止跨用户数据访问
- **认证限流收紧** — auth 接口从 100次/15分钟降至 20次/15分钟
- **CSP 移除 unsafe-inline** — 消除内联脚本执行风险
- **external proxy 日志脱敏** — 自动剥离 b64_json 防止数据库膨胀

## ⚡ 性能优化

- **数据库 N+1 查询消除** — 连接池加固 + 批量查询优化，大幅降低数据库压力
- **代码高亮按需加载** — `code-highlight.ts` 动态 import，减少首屏 bundle 体积
- **媒体清单 React.memo** — MediaCard / MediaTableView / TimelineItem 添加 memo 优化渲染
- **Vite 手动分包** — 源码分包优化 + 目录命名统一 + 数据文件拆分

## 🔄 功能变更

- **前端组件拆分** — AuditLogs / ExternalApiLogs 拆分为 FilterBar / Detail / Table / StatCard 子组件，均 ≤ 300 行
- **源码目录统一为 PascalCase** — `openai-image-2` → `OpenAIImage2`、`video-agent` → `VideoAgent` 等

## 📝 文档更新

- **ADR-0003** — external-proxy JWT 认证决策
- **ADR-0004** — 媒体 token 签名增强决策
- **ADR-0005** — 路由业务逻辑抽取决策
- **Code Review 报告归档** — 6 份审查报告归档至 `docs/archive/v2.2/`

---

**完整变更日志**: [CHANGELOG.md](https://github.com/Casual-AI-Coding/mnx-agent/blob/main/CHANGELOG.md)
````

---

## 6. 与 CHANGELOG.md 的协作

### 6.1 信息来源

Release Note 的**唯一权威来源**是 `CHANGELOG.md`。发布 Release Note 时，应从 CHANGELOG 中提取和精简内容。

### 6.2 内容差异

| 维度 | CHANGELOG.md | Release Note |
|------|-------------|-------------|
| 受众 | 开发者/维护者 | 终端用户 |
| 详细度 | 完整，包含技术细节 | 精简，突出用户价值 |
| 条目格式 | `- **标题** — 描述（文件路径）` | `- **标题** — 描述（用户能感知到的变化）` |
| 技术细节 | 包含文件路径、行数 | 去掉文件路径，保留模块名 |
| 分类 | 所有分类 | 只列有实质内容的分类 |
| 破坏性变更 | 正常分类 | 独立区块，用 ⚠️ 强调 |

### 6.3 生成流程

```
npm version patch --no-git-tag-version
         ↓
   更新 package.json
         ↓
   编辑 CHANGELOG.md（新增版本区块）
         ↓
   git add CHANGELOG.md package.json
   git commit -m "chore: release vX.Y.Z"
         ↓
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push && git push --tags
         ↓
   gh release create vX.Y.Z \
     --title "vX.Y.Z" \
     --notes-file <(从 CHANGELOG.md 提取并格式化)
```

---

## 7. 回溯补充规则

当需要为历史版本补建 Release Note 时：

1. **主版本号（X.Y.0）** — 从 `CHANGELOG.md` 提取该版本区块，生成完整的分类 Release Note
2. **补丁版本（X.Y.Z, Z>0）** — 同样从 CHANGELOG.md 提取，精简程度与主版本一致
3. **无 CHANGELOG 记录的版本** — 从 git log（上一 tag 到当前 tag）提取 Conventional Commits 消息，自动归类

### 7.1 自动回溯生成

为早期版本（无结构化 CHANGELOG）自动生成 Release Note 时：

```bash
# 获取某个 tag 的提交范围
git log <prev_tag>..<tag> --pretty=format:"%s"

# 按 Conventional Commits 分类：
# feat: → ✨ 新增功能
# fix: → 🐛 问题修复
# security: → 🔒 安全加固
# perf: → ⚡ 性能优化
# refactor: → 🏗️ 代码重构
# docs: → 📝 文档更新
# test: → 🧪 测试完善
# chore: → 🔧 构建/工具
# BREAKING CHANGE → ⚠️ 破坏性变更
```

---

## 8. GitHub Release 创建命令参考

```bash
# 创建 Release Note（从临时文件）
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes-file /tmp/release-note-vX.Y.Z.md \
  --repo Casual-AI-Coding/mnx-agent

# 从 stdin 创建
cat release-note.md | gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes-file - \
  --repo Casual-AI-Coding/mnx-agent
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-11 | 初始版本 — 定义 Release Note 分类体系、模板、与 CHANGELOG 协作流程 |
