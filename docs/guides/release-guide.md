# Release Guide

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

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
   ```markdown
   ## [版本号] - 日期
   
   ### Added
   - 新增功能说明
   
   ### Fixed
   - 修复问题说明
   
   ### Changed
   - 变更说明
   ```

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

---

## 3. 发布 Checklist

发布前确认：

- [ ] CHANGELOG.md 更新完整（Added/Fixed/Changed 齐全）
- [ ] `npm run build` 通过
- [ ] `vitest run` 全部通过
- [ ] TypeScript 无错误
- [ ] 推送后确认 tag 存在

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |