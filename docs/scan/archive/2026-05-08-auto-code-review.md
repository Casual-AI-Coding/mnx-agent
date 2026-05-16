# Code Review Report - mnx-agent
> Date: 2026-05-08
> Branch: main
> Total Files: 5,234
> Tech Stack: TypeScript (544), React/TSX (285), Express + PostgreSQL + WebSocket + Zustand

## 1. 项目概览

mnx-agent 是 MiniMax AI API 工具集，提供文本、语音、图像、音乐、视频生成能力，内置 cron 定时任务调度系统。是一个功能丰富的前后端一体化 AI 创作平台。

- **前端**: React 18 + TypeScript + Tailwind CSS + Zustand + React Router
- **后端**: Express + TypeScript + PostgreSQL + node-cron + WebSocket
- **测试**: Vitest (前端+后端分离配置)
- **版本**: v2.2.7，活跃开发中

5000+ 文件中包含大量 PNG/MP3 媒体资源（4147 个），核心源码集中在 `src/` 和 `server/`。

## 2. 发现的问题

### 🔴 严重（Critical）

1. **`DEBUG_FORM_KEYS` 导出用于生产环境** — `src/hooks/useFormPersistence.ts:36`
   - 名称含 "DEBUG" 但实际用于 **所有页面** 的表单持久化（localStorage key 命名空间）
   - 在当前所有页面中直接引用：`TextGeneration`, `ImageGeneration`, `MusicGeneration`, `VideoGeneration`, `VideoAgent`, `LyricsGeneration`, `OpenAIImage2`
   - 这不是 debug 功能，而是核心 UX 功能（表单数据跨会话恢复）
   - **建议**: 重命名为 `FORM_PERSISTENCE_KEYS`，消除命名误导

2. **`scripts/restore-media-by-size.ts:8` 硬编码密码检查** — 要求环境变量 `DB_PASSWORD`，但 `soft-delete-unrestored.ts:10` 却使用 `PGPASSWORD`
   - 脚本间数据库凭证环境变量名不统一
   - **建议**: 统一使用 `PGPASSWORD` 或通过 `.env` 统一加载

### 🟡 警告（Warning）

1. **服务器端口硬编码** — `server/index.ts:64`：`const PORT = process.env.PORT || 4511`
   - 与 grape-dones (4514) 和 wordiem (3001) 的端口不同，容易冲突
   - **建议**: 在 `.env.example` 中明确标注所有服务端口

2. **`dotenv` 双加载** — `server/index.ts:58-59`
   ```typescript
   config()
   config({ path: '.env.local', override: true })
   ```
   - 逻辑正确（先加载默认 `.env`，再覆盖 `.env.local`），但缺少如果 `.env.local` 不存在时的处理说明
   - 如果 `.env.local` 不存在，`config()` 不报错但密钥会缺失
   - **建议**: 添加文件存在性检查或启动验证

3. **ESLint 版本未锁定** — `package.json` 中部分依赖使用 `^` 前缀
   - `eslint: "^8.56.0"` 而非精确版本（最近 wordiem 刚锁定所有版本）
   - **建议**: 锁定关键 devDependencies 版本

4. **`express-rate-limit` 在 devDependencies 而非 dependencies** — 应该是运行时依赖

### 🔵 建议（Suggestion）

1. **表单持久化无过期机制** — `useFormPersistence` 将数据无限期存储在 localStorage，不清除旧数据
   - **建议**: 添加 TTL 或版本号机制，确保 schema 变更后旧数据不导致解析异常

2. **`server/index.ts` 文件过长** — 347 行，包含大量路由注册和中间件配置
   - **建议**: 将路由注册提取到单独的 `routes/index.ts`

3. **WebSocket 初始化位置** — `initCronWebSocket` 在服务启动时同步初始化，若失败可能影响 HTTP 服务启动
   - **建议**: WebSocket 应作为可选/异步初始化，失败不阻塞 HTTP 服务

4. **类型导入路径** — `server/index.ts` 中大量 `import type` 从深层路径导入，可考虑 barrel export

## 3. 安全审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 硬编码密钥 | ⚠️ | 脚本中环境变量名不统一 (`DB_PASSWORD` vs `PGPASSWORD`) |
| SQL 注入 | ✅ | 参数化查询（`$1` 占位符） |
| CSRF/认证 | ✅ | JWT + helmet + CORS + 审计日志 |
| 速率限制 | ✅ | `rateLimiter`, `mediaRateLimiter`, `cronRateLimiter` |
| 安全头 | ✅ | helmet 配置较完善 |
| 输入验证 | ✅ | Zod schema 第一道防线 |
| 日志脱敏 | ✅ | AGENTS.md 明确禁止记录 token/password |
| 软删除 | ✅ | 数据库级别 `is_deleted` + `deleted_at` |

## 4. 性能分析

- **WebSocket**: cron 调度使用 WebSocket 推送实时状态，设计合理
- **localStorage 表单持久化**: 提升 UX，但需注意大数据量（图片 base64）可能导致性能问题
- **PostgreSQL 连接池**: `pg` 驱动需要合理配置 `max` connections
- **大量媒体文件**: 3288 PNG + 859 MP3，建议生产环境使用 CDN/对象存储，当前本地存储仅适合开发

## 5. 代码规范

| 检查项 | 状态 | 说明 |
|--------|------|------|
| TypeScript 严格模式 | ✅ | strict: true |
| 命名规范 | ✅ | kebab-case 文件、PascalCase 组件 |
| 目录结构 | ✅ | server/ (后端) + src/ (前端) 分离清晰 |
| 代码重复 | ⚠️ | 脚本中数据库连接代码重复 |
| 错误处理 | ✅ | asyncHandler 包装 + 统一响应格式 |
| 文档 | ✅ | AGENTS.md + `docs/` 体系完善 |
| 禁止 `any` | ✅ | 未见业务代码使用 `any` |

## 6. 交互与功能

- **多模态 AI 生成**: 文本、语音、图像、音乐、视频 5 大类，功能齐全
- **Cron 定时任务**: 支持定时触发生成任务，企业级功能
- **表单持久化**: 跨会话恢复表单数据，用户体验友好
- **工作流**: XYFlow 节点编辑器，支持复杂工作流编排
- **国际化**: i18next 支持多语言
- **媒体管理**: 完整的媒体资源管理、软删除、导出

## 7. 总结与下一步展望

- **健康度评分**: 7.5/10
- **Top 3 优先改进项**:
  1. 重命名 `DEBUG_FORM_KEYS` → `FORM_PERSISTENCE_KEYS`
  2. 统一脚本环境变量命名（`DB_PASSWORD` vs `PGPASSWORD`）
  3. 添加表单持久化数据版本号/TTL 机制

- **下一步行动**: 项目已进入 v2.2.x 稳定期，建议关注：媒体文件存储迁移至 S3/对象存储、数据库连接池配置优化、`express-rate-limit` 移至 dependencies。

---

## 8. 结论与修复记录

> 审查日期：2026-05-09 | 复审人：Sisyphus

### 真实问题（已修复）

| # | 问题 | 严重度 | 修复方案 | 涉及文件 |
|---|------|--------|----------|----------|
| 1 | `express-rate-limit` 在 devDependencies | 🔴 | 移至 dependencies | `package.json` |
| 2 | `DEBUG_FORM_KEYS` 命名误导 | 🔴 | 重命名为 `FORM_PERSISTENCE_KEYS` | 9 个源文件 |
| 3 | 脚本环境变量名不统一 | 🟡 | 统一为 `DB_*` 命名 + dotenv 加载 | `scripts/soft-delete-unrestored.ts` |
| 4 | ESLint 版本未锁定 `^8.56.0` | 🟡 | lockfile 已锁定，`npm ci` 不受影响 → 低优先 | — |
| 5 | 表单持久化无 TTL | 🔵 | 建议添加版本号机制 → 择机实施 | — |

### 误报

| # | 原始报告 | 判定 | 理由 |
|---|----------|------|------|
| 1 | 端口硬编码 `PORT \|\| 4511` | ❌ 误报 | Express 标准 fallback 模式，无问题 |
| 2 | WebSocket 初始化阻塞 HTTP | ❌ 部分误报 | `app.listen()` 先于 `initCronWebSocket()` 调用，HTTP 已启动；但抛异常会崩溃进程，建议包 try-catch |
| 3 | dotenv 双加载缺文件检查 | ❌ 误报 | dotenv 对缺失文件静默跳过，JWT_SECRET 验证兜底 |
| 4 | `server/index.ts` 行数过多 | ⚠️ 低优先 | 可维护性建议，非紧急 |
| 5 | 类型导入路径优化 | ⚠️ 低优先 | 代码风格建议 |

### 修正后健康度

- **健康度评分**: 8.0/10（原评 7.5）
- 安全审查：8/8 ✅（原 7/8）
- 代码规范：7/7 ✅（原 6/7）
