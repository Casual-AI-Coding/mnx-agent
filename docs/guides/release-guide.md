# Release Guide

> Version: 1.1.1
> Date: 2026-05-16
> Status: Active

> 📋 相关规范：Release Note 格式详见 @docs/standards/release-note-standards.md

## 1. 版本号规范

### 1.1 格式

格式：`MAJOR.MINOR.PATCH`（如 `v1.0.2`）

| 部分 | 说明 | 递增时机 |
|------|------|----------|
| MAJOR | 主版本 | 不兼容变更 |
| MINOR | 副版本 | 向后兼容新增 |
| PATCH | 补丁 | 向后兼容修复 |

### 1.2 递增规则

| 变更类型 | 版本变化 | 示例 |
|----------|----------|------|
| 破坏性变更 | MAJOR++ | 1.0 → 2.0 |
| 向后兼容新增 | MINOR++ | 1.0 → 1.1 |
| 向后兼容修复 | PATCH++ | 1.0.0 → 1.0.1 |

---

## 2. 发布步骤

### 2.1 发布前

1. **更新 CHANGELOG.md**

   在文件顶部新增版本区块，使用 emoji 分类体系：

   ```markdown
   ## [版本号] - YYYY-MM-DD

   ### ✨ Added
   - **功能名称** — 功能描述（涉及文件/模块）

   ### 🐛 Fixed
   - **问题描述** — 修复了什么（涉及文件/模块）

   ### 🔒 Security
   - **安全修复** — 具体描述

   ### 🔄 Changed
   - **变更描述** — 具体描述
   ```

   详细分类规范参考 @docs/standards/release-note-standards.md 第 3 节。

2. **更新 package.json**

   ```bash
   npm version 1.0.2 --no-git-tag-version
   ```

### 2.2 发布

1. **提交**

   ```bash
   git add CHANGELOG.md package.json package-lock.json
   git commit -m "chore: release v1.0.2"
   ```

2. **打标签**

   ```bash
   git tag -a v1.0.2 -m "v1.0.2: 版本说明"
   ```

3. **推送**

   ```bash
   git push && git push --tags
   ```

4. **创建 GitHub Release Note**

   从 CHANGELOG.md 提取当前版本区块，格式化为 Release Note 并发布：

   ```bash
   # 方式一：使用辅助脚本（推荐）
   node scripts/create-release-notes.mjs --tag=v1.0.2

   # 方式二：手动从文件创建
   gh release create v1.0.2 \
     --title "v1.0.2" \
     --notes-file /tmp/release-note-v1.0.2.md \
     --repo Casual-AI-Coding/mnx-agent
   ```

   Release Note 格式参考 @docs/standards/release-note-standards.md 第 4 节模板。

---

## 3. 发布 Checklist

发布前确认：

- [ ] CHANGELOG.md 更新完整，分类齐全
- [ ] `npm run build` 通过
- [ ] `vitest run` 全部通过
- [ ] TypeScript 无错误
- [ ] 推送后确认 tag 存在
- [ ] **GitHub Release Note 已创建并存档**（第 2.2 步，不可省略）

---

## 4. Release Note 与 CHANGELOG 关系

| 维度 | CHANGELOG.md | Release Note |
|------|-------------|-------------|
| 位置 | 项目仓库根目录 | GitHub Releases 页面 |
| 受众 | 开发者/维护者 | 终端用户 |
| 粒度 | 完整技术细节 | 精简用户视角 |
| 格式 | emoji 分类 + 文件路径 | emoji 分类 + 模块名 |
| 维护时机 | 每次提交时更新 | 发布时创建（不可省略） |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-16 | v1.1.1 — 修正脚本名称和参数格式：`create-release-note.mjs` → `create-release-notes.mjs`，参数改为 `--tag=vX.Y.Z` |
| 2026-05-11 | v1.1.0 — 新增 GitHub Release Note 创建步骤；更新 CHANGELOG 模板为 emoji 分类体系；添加 Release Note 与 CHANGELOG 关系说明 |
| 2026-04-22 | 初始版本 |
